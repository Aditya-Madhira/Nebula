"""
routes/stream.py
----------------
Dynamic streaming endpoint + HLS CORS proxy.

Flow:
  1. GET /api/stream/{mal_id}/{episode_number}
     - Resolves the live .m3u8 URL via anipy-api (AllAnime provider)
     - Returns { proxy_url } pointing to our own proxy endpoint

  2. GET /api/stream/proxy/playlist/{mal_id}/{episode_number}
     - Fetches the real .m3u8 from the upstream source server-side
     - Rewrites all segment URLs to point back through our proxy
     - Returns the playlist with correct Content-Type (bypasses browser CORS)

  3. GET /api/stream/proxy/segment
     - Proxies individual .ts / .m4s segment requests from the browser
     - Forwards correct headers (Referer, Origin, etc.) to the upstream
"""

import asyncio
import logging
import re
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from db import get_db_connection

log    = logging.getLogger(__name__)
router = APIRouter()

# Cache resolved stream info per (mal_id, episode_number) for the session
# so the proxy playlist endpoint doesn't need to re-scrape
_stream_cache: dict[tuple[int, int], dict] = {}


# ---------------------------------------------------------------------------
# Internal scraper (runs in thread pool)
# ---------------------------------------------------------------------------

def _resolve_stream(title: str, episode_number: int) -> dict:
    """
    Synchronous scraper — always offloaded via asyncio.to_thread.
    Returns { stream_url, quality, referer }.
    """
    try:
        from anipy_api.provider import get_provider
        from anipy_api.provider.base import LanguageTypeEnum
    except ImportError:
        raise RuntimeError("anipy-api is not installed. Run: pip install anipy-api")

    provider = get_provider("allanime")

    # 1. Search with title overrides and exact matching to bypass AllAnime naming anomalies
    search_query = title
    exact_match_name = None

    # Known catalog titles that map to different queries or exact names on AllAnime
    title_mapping = {
        "Frieren: Beyond Journey's End": ("Sousou no Frieren", "Sousou no Frieren"),
        "Monster": ("Monster", "Monster (2004)"),
        "One Piece": ("One Piece", "1P"),
        "Bleach": ("Bleach", "Burichi -"),
        "Neon Genesis Evangelion": ("Shinseiki Evangelion", "Shinseiki Evangelion"),
        "Code Geass: Lelouch of the Rebellion": ("Code Geass", "Code Geass: Hangyaku no Lelouch"),
        "Code Geass: Lelouch of the Rebellion R2": ("Code Geass", "Code Geass: Hangyaku no Lelouch R2"),
        "Tokyo Ghoul": ("Tokyo Ghoul", "Tokyo Ghoul"),
        "Dragon Ball Z": ("DBZ", "DBZ"),
        "Naruto: Shippuden": ("Naruto: Shippuden", "Nato: Shippuuden"),
        "Hunter x Hunter (2011)": ("Hunter X Hunter", "Hunter X Hunter"),
        "Attack on Titan": ("Shingeki no Kyojin", "Shingeki no Kyojin"),
        "Your Name.": ("Kimi no Na wa.", "Kimi no Na wa."),
        "Spirited Away": ("Sen to Chihiro o Kamikakushi", "Sen to Chihiro o Kamikakushi"),
    }

    if title in title_mapping:
        search_query, exact_match_name = title_mapping[title]

    results = provider.get_search(search_query)
    if not results:
        raise ValueError(f"No results found on AllAnime for: '{search_query}'")

    # Pick exact match if configured, otherwise take first result
    best = results[0]
    if exact_match_name:
        for res in results:
            if res.name.strip().lower() == exact_match_name.strip().lower():
                best = res
                break

    log.info("Stream resolver: '%s' (Search: '%s') → matched name: '%s' (ID: %s)", 
             title, search_query, best.name, best.identifier)

    # 2. Episode list
    episodes = provider.get_episodes(best.identifier, LanguageTypeEnum.SUB)
    if not episodes:
        raise ValueError(f"No episodes found for provider ID: {best.identifier}")

    if episode_number not in episodes:
        raise ValueError(
            f"Episode {episode_number} not available. "
            f"Provider has: {sorted(episodes)[:10]}..."
        )

    # 3. Get streams
    streams = provider.get_video(best.identifier, episode_number, LanguageTypeEnum.SUB)
    if not streams:
        raise ValueError(f"No stream URLs for episode {episode_number}.")

    # 4. Pick best quality
    best_stream = streams[0]
    for s in streams:
        name = str(getattr(s, 'resolution', '') or getattr(s, 'name', '') or '')
        if '1080' in name:
            best_stream = s
            break
        if '720' in name:
            best_stream = s

    return {
        "stream_url": best_stream.url,
        "quality":    str(getattr(best_stream, 'resolution', None) or getattr(best_stream, 'name', 'auto')),
        "referer":    getattr(best_stream, 'referrer', None) or getattr(best_stream, 'referer', '') or '',
    }


# ---------------------------------------------------------------------------
# Helper: build upstream request headers (carry Referer/User-Agent)
# ---------------------------------------------------------------------------

def _upstream_headers(referer: str = "") -> dict:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "https://allanime.day",
    }
    if referer:
        headers["Referer"] = referer
    return headers


# ---------------------------------------------------------------------------
# Route 1: Resolve stream → return proxy URL to frontend
# ---------------------------------------------------------------------------

@router.get("/api/stream/{mal_id}/{episode_number}")
async def get_stream(mal_id: int, episode_number: int, request: Request):
    """
    Resolves the stream for an episode and returns a proxy_url the frontend
    can feed directly into hls.js without any CORS issues.
    """
    # Look up anime title
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT title FROM anime WHERE mal_id = ?", (mal_id,)
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"Anime with MAL ID {mal_id} not found in local database."
        )

    title = row["title"]
    log.info("Stream request — '%s' (MAL: %d), ep: %d", title, mal_id, episode_number)

    # Scrape stream info
    try:
        result = await asyncio.to_thread(_resolve_stream, title, episode_number)
    except ValueError as e:
        log.warning("Stream not found: %s", e)
        raise HTTPException(status_code=404, detail=f"Stream not found: {e}")
    except RuntimeError as e:
        log.error("Scraper runtime error: %s", e)
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        log.error("Unexpected scraper error for '%s' ep %d: %s", title, episode_number, e)
        raise HTTPException(
            status_code=502,
            detail="The streaming scraper hit an unexpected error. Please try again."
        )

    # Check if the URL points to an HLS playlist or a direct MP4
    is_hls = True
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            async with client.stream("GET", result["stream_url"], headers=_upstream_headers(result["referer"])) as resp:
                content_type = resp.headers.get("content-type", "").lower()
                if "mp4" in content_type or ("video" in content_type and "mpegurl" not in content_type):
                    is_hls = False
                else:
                    first_chunk = b""
                    async for chunk in resp.aiter_bytes(chunk_size=128):
                        first_chunk += chunk
                        if len(first_chunk) >= 7:
                            break
                    if not first_chunk.startswith(b"#EXTM3U"):
                        is_hls = False
    except Exception as e:
        log.warning("Could not pre-check stream type, defaulting to HLS: %s", e)

    result["is_hls"] = is_hls

    # Cache for the proxy endpoint to use
    _stream_cache[(mal_id, episode_number)] = result

    # Build the proxy URL (same host/port as the backend)
    base_url = str(request.base_url).rstrip("/")
    proxy_url = f"{base_url}/api/stream/proxy/playlist/{mal_id}/{episode_number}"

    return {
        "mal_id":         mal_id,
        "episode_number": episode_number,
        "title":          title,
        "stream_url":     proxy_url,   # <-- frontend uses this
        "is_hls":         is_hls,
        "quality":        result["quality"],
        "direct_url":     result["stream_url"],  # kept for debug
    }


# ---------------------------------------------------------------------------
# Route 2: Proxy the .m3u8 playlist, rewriting segment URLs
# ---------------------------------------------------------------------------

@router.get("/api/stream/proxy/playlist/{mal_id}/{episode_number}")
async def proxy_playlist(mal_id: int, episode_number: int, request: Request):
    """
    Fetches the upstream .m3u8 playlist and rewrites all segment/sub-playlist
    URLs to go through our /api/stream/proxy/segment endpoint.
    This completely eliminates CORS issues for the browser.
    """
    cache_key = (mal_id, episode_number)
    if cache_key not in _stream_cache:
        # Cache miss — re-resolve the stream (e.g. after container restart)
        conn = get_db_connection()
        try:
            row = conn.execute(
                "SELECT title FROM anime WHERE mal_id = ?", (mal_id,)
            ).fetchone()
        finally:
            conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Anime not found in database.")
        try:
            result = await asyncio.to_thread(_resolve_stream, row["title"], episode_number)
            _stream_cache[cache_key] = result
        except Exception as e:
            log.error("Re-resolve failed for proxy_playlist: %s", e)
            raise HTTPException(status_code=502, detail="Could not resolve stream. Please retry.")

    info      = _stream_cache[cache_key]
    m3u8_url  = info["stream_url"]
    referer   = info["referer"]
    is_hls    = info.get("is_hls", True)
    headers   = _upstream_headers(referer)

    if not is_hls:
        # Proxy direct video stream (MP4) chunk by chunk to support seeking
        if "range" in request.headers:
            headers["Range"] = request.headers["range"]
        try:
            client = httpx.AsyncClient(timeout=30, follow_redirects=True)
            req = client.build_request("GET", m3u8_url, headers=headers)
            resp = await client.send(req, stream=True)
            
            forward_headers = {
                "Access-Control-Allow-Origin": "*",
                "Accept-Ranges": "bytes",
            }
            if "Content-Type" in resp.headers:
                forward_headers["Content-Type"] = resp.headers["Content-Type"]
            if "Content-Range" in resp.headers:
                forward_headers["Content-Range"] = resp.headers["Content-Range"]
            if "Content-Length" in resp.headers:
                forward_headers["Content-Length"] = resp.headers["Content-Length"]
                
            async def stream_generator():
                try:
                    async for chunk in resp.aiter_bytes(chunk_size=1048576):
                        yield chunk
                finally:
                    await resp.aclose()
                    await client.aclose()

            return StreamingResponse(
                stream_generator(),
                status_code=resp.status_code,
                headers=forward_headers
            )
        except Exception as e:
            log.error("Direct proxy error: %s", e)
            raise HTTPException(status_code=502, detail="Direct proxy error.")

    # Base URL of the upstream m3u8 (for resolving relative segment paths)
    base_upstream = m3u8_url.rsplit("/", 1)[0] + "/"
    base_url = str(request.base_url).rstrip("/")
    proxy_seg = f"{base_url}/api/stream/proxy/segment"

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            async with client.stream("GET", m3u8_url, headers=headers) as resp:
                resp.raise_for_status()
                
                content_type = resp.headers.get("Content-Type", "").lower()
                if "mp4" in content_type or ("video" in content_type and "mpegurl" not in content_type):
                    log.error("proxy_playlist received video instead of HLS playlist")
                    raise HTTPException(status_code=502, detail="Expected HLS playlist but received direct video stream.")
                
                content_length = int(resp.headers.get("Content-Length", 0))
                if content_length > 5 * 1024 * 1024:
                    raise HTTPException(status_code=502, detail="Playlist too large.")
                    
                await resp.aread()
                playlist_text = resp.text
    except httpx.HTTPStatusError as e:
        log.error("Upstream m3u8 fetch failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not fetch playlist from upstream source.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        log.error("Proxy playlist error: %s", e)
        raise HTTPException(status_code=502, detail="Proxy error fetching playlist.")

    playlist_text = resp.text

    # Rewrite every URI= and bare .ts / .m4s / .m3u8 line to our proxy
    def rewrite_url(original_url: str) -> str:
        """Absolutise relative URL, then wrap in our proxy."""
        if original_url.startswith("http"):
            full = original_url
        else:
            full = base_upstream + original_url.lstrip("/")
        import urllib.parse
        encoded = urllib.parse.quote(full, safe="")
        ref_enc = urllib.parse.quote(referer, safe="")
        return f"{proxy_seg}?url={encoded}&referer={ref_enc}"

    # Rewrite URI="..." attributes (e.g. #EXT-X-KEY, #EXT-X-MEDIA)
    def rewrite_attr(m: re.Match) -> str:
        return f'URI="{rewrite_url(m.group(1))}"'

    playlist_text = re.sub(r'URI="([^"]+)"', rewrite_attr, playlist_text)

    # Rewrite bare segment lines (lines that don't start with #)
    rewritten_lines = []
    for line in playlist_text.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            rewritten_lines.append(rewrite_url(stripped))
        else:
            rewritten_lines.append(line)
    playlist_text = "\n".join(rewritten_lines)

    return Response(
        content=playlist_text,
        media_type="application/vnd.apple.mpegurl",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
        },
    )


# ---------------------------------------------------------------------------
# Route 3: Proxy individual segment requests
# ---------------------------------------------------------------------------

@router.get("/api/stream/proxy/segment")
async def proxy_segment(url: str, referer: str = ""):
    """
    Forwards a single .ts / .m4s / key segment from the upstream CDN.
    The browser never touches the upstream domain — zero CORS issues.
    """
    import urllib.parse
    decoded_url     = urllib.parse.unquote(url)
    decoded_referer = urllib.parse.unquote(referer)
    headers = _upstream_headers(decoded_referer)

    try:
        client = httpx.AsyncClient(timeout=30, follow_redirects=True)
        req = client.build_request("GET", decoded_url, headers=headers)
        resp = await client.send(req, stream=True)
        resp.raise_for_status()
        
        content_type = resp.headers.get("content-type", "video/MP2T")
        
        async def stream_generator():
            try:
                async for chunk in resp.aiter_bytes(chunk_size=1048576):
                    yield chunk
            finally:
                await resp.aclose()
                await client.aclose()

        return StreamingResponse(
            stream_generator(),
            media_type=content_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=3600",
            }
        )
    except httpx.HTTPStatusError as e:
        log.warning("Segment fetch failed (%s): %s", decoded_url, e)
        raise HTTPException(status_code=502, detail="Could not fetch segment.")
    except Exception as e:
        log.error("Proxy segment error: %s", e)
        raise HTTPException(status_code=502, detail="Proxy error fetching segment.")
