"""
expand_anime_db.py
------------------
Fetches a broader set of popular anime from Jikan API and upserts them
into Azure SQL. Targets:
  - Top 300 anime by score (pages 1-12, 25 per page)
  - Seasonal popular anime (last 4 seasons)
  - Explicitly curated mal_ids for well-known titles missing from top lists

Run this ONCE (or re-run to re-sync):
  python expand_anime_db.py

Jikan rate limit: 3 req/sec. We sleep 1.2s between requests.
"""

import os
import sys
import time
import logging
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# Load .env for local dev
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

JIKAN_BASE = "https://api.jikan.moe/v4"

# Manually curated list of must-have popular anime mal_ids
# (covers mainstream hits that might not appear in top-score lists)
MUST_HAVE_MAL_IDS = [
    21,       # One Piece
    20,       # Naruto
    1735,     # Naruto: Shippuuden
    16498,    # Shingeki no Kyojin (S1)
    11757,    # Sword Art Online
    30276,    # One Punch Man
    31964,    # Boku no Hero Academia
    1,        # Cowboy Bebop
    6,        # Trigun
    33486,    # Boku no Hero Academia S2
    36456,    # Boku no Hero Academia S3
    20583,    # Tokyo Ghoul
    22319,    # Tokyo Ghoul:re
    10620,    # Mirai Nikki
    23273,    # Sword Art Online II
    34096,    # Gintama.
    23755,    # Fairy Tail (2014)
    22319,    # Tokyo Ghoul:re
    37991,    # Goblin Slayer
    37521,    # Overlord III
    32935,    # Overlord II
    29803,    # Overlord
    6547,     # Angel Beats!
    35247,    # Owarimonogatari 2nd Season
    31646,    # Yuri!!! on Ice
    34599,    # Mahoutsukai no Yome
    37779,    # Violet Evergarden
    35790,    # Made in Abyss
    33352,    # Berserk (2016)
    1535,     # Death Note
    2025,     # Fullmetal Alchemist (2003)
    5114,     # FMA: Brotherhood (already in DB but ensure)
    19815,    # No Game No Life
    14719,    # Kill la Kill
    2167,     # Clannad
    2904,     # Code Geass R2
    1575,     # Code Geass
    245,      # Fullmetal Alchemist (2003)
    9253,     # Steins;Gate (already in DB)
    38000,    # Darling in the FranXX
    36475,    # Cardcaptor Sakura: Clear Card
    32182,    # Kimi no Na wa (movie)
    28957,    # Shigatsu wa Kimi no Uso
    22043,    # Noragami
    26243,    # Noragami Aragoto
    20047,    # Log Horizon
    22319,    # Tokyo Ghoul Root A
    41467,    # Bleach: TYBW (already in DB)
    269,      # Bleach (original)
    21,       # One Piece
    10379,    # Hunter x Hunter (2011) (already in DB)
    44511,    # Ousama Ranking
    49387,    # Vinland Saga S2 (already in DB)
    42938,    # Fruits Basket The Final (already in DB)
    4181,     # Clannad: After Story (already in DB)
    31240,    # Re:Zero
    39535,    # Kimetsu no Yaiba
    43608,    # Kaguya-sama Ultra Romantic (already in DB)
    46569,    # Kimetsu no Yaiba: Yuukaku-hen
    48583,    # Kimetsu no Yaiba: Katanakaji no Sato-hen
    48411,    # Oshi no Ko
    52991,    # Sousou no Frieren (already in DB)
    50265,    # Jujutsu Kaisen
    40748,    # Jujutsu Kaisen 0
    51009,    # Jujutsu Kaisen S2
    52305,    # Dungeon ni Deai wo Motomeru (Danmachi) Season 4
    1210,     # Bleach (all eps)
    35851,    # Sword Art Online: Alicization
    38000,    # Darling in the FranXX
    47194,    # Eighty Six
    41025,    # Mushoku Tensei
    49596,    # Mushoku Tensei Part 2
    54595,    # Oshi no Ko
    52588,    # Shy
    53116,    # Zom 100
    54492,    # Kusuriya no Hitorigoto (already in DB)
    55644,    # Solo Leveling
    57334,    # Dandadan
    54971,    # Bucchigire!
]


def fetch_with_retry(url: str, retries: int = 3):
    """GET a Jikan URL with retry and polite rate limiting."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, timeout=12)
            if resp.status_code == 429:
                wait = 4 * (attempt + 1)
                log.warning("Rate limited. Waiting %ss...", wait)
                time.sleep(wait)
                continue
            if resp.status_code == 200:
                return resp.json()
            log.warning("Jikan returned %s for %s", resp.status_code, url)
            return None
        except Exception as exc:
            log.error("Request error for %s: %s", url, exc)
            time.sleep(2)
    return None


def upsert_anime(conn, entry: dict):
    """Insert or update a single anime row in Azure SQL."""
    try:
        existing = conn.execute(
            "SELECT mal_id FROM anime WHERE mal_id = %s", (entry["mal_id"],)
        ).fetchone()
        if existing:
            conn.execute(
                """
                UPDATE anime
                SET title = %s, genres = %s, score = %s, episodes = %s, synopsis = %s, image_url = %s, anime_type = %s
                WHERE mal_id = %s
                """,
                (entry["title"], entry["genres"], entry["score"],
                 entry["episodes"], entry["synopsis"], entry["image_url"],
                 entry["anime_type"], entry["mal_id"]),
            )
        else:
            conn.execute(
                """
                INSERT INTO anime (mal_id, title, genres, score, episodes, synopsis, image_url, anime_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (entry["mal_id"], entry["title"], entry["genres"],
                 entry["score"], entry["episodes"],
                 entry["synopsis"], entry["image_url"], entry["anime_type"]),
            )
        conn.commit()
        return True
    except Exception as e:
        log.warning("Upsert failed for mal_id=%s: %s", entry["mal_id"], e)
        return False


def parse_jikan_item(item: dict) -> dict | None:
    """Convert a Jikan API item into our DB schema."""
    if not item or not item.get("mal_id"):
        return None
    genres = ", ".join([g.get("name", "") for g in item.get("genres", [])])
    images = item.get("images", {})
    image_url = (
        images.get("jpg", {}).get("large_image_url")
        or images.get("jpg", {}).get("image_url")
        or ""
    )
    return {
        "mal_id":   item["mal_id"],
        "title":    item.get("title") or "Unknown",
        "genres":   genres,
        "score":    item.get("score") or 0.0,
        "episodes": item.get("episodes") or 0,
        "synopsis": item.get("synopsis") or "No synopsis available.",
        "image_url": image_url,
        "anime_type": item.get("type") or "TV",
    }


def main():
    # Import DB connection
    sys.path.insert(0, os.path.dirname(__file__))
    from db import get_db_connection

    conn = get_db_connection()
    log.info("Connected to Azure SQL.")

    added = 0
    updated = 0

    # ── Phase 1: Fetch Top 300 anime (12 pages × 25) ─────────────────────────
    log.info("Phase 1: Fetching top anime by score (pages 1–12)...")
    for page in range(1, 13):
        data = fetch_with_retry(f"{JIKAN_BASE}/top/anime?page={page}&limit=25")
        time.sleep(1.2)
        if not data:
            log.warning("Page %d fetch failed. Skipping.", page)
            continue
        items = data.get("data", [])
        log.info("  Page %d: %d items", page, len(items))
        for item in items:
            entry = parse_jikan_item(item)
            if entry:
                ok = upsert_anime(conn, entry)
                if ok:
                    added += 1

    # ── Phase 2: Current + recent seasonal anime ──────────────────────────────
    log.info("Phase 2: Fetching recent seasonal anime...")
    # Jikan /seasons/now returns this season's anime
    for season_url in [
        f"{JIKAN_BASE}/seasons/now",
        f"{JIKAN_BASE}/seasons/upcoming",
    ]:
        data = fetch_with_retry(season_url)
        time.sleep(1.2)
        if not data:
            continue
        items = data.get("data", [])
        log.info("  Seasonal URL %s: %d items", season_url, len(items))
        for item in items:
            entry = parse_jikan_item(item)
            if entry:
                upsert_anime(conn, entry)

    # ── Phase 3: Must-have curated list ──────────────────────────────────────
    log.info("Phase 3: Upserting %d curated must-have anime...", len(set(MUST_HAVE_MAL_IDS)))
    for mal_id in set(MUST_HAVE_MAL_IDS):
        data = fetch_with_retry(f"{JIKAN_BASE}/anime/{mal_id}")
        time.sleep(1.2)
        if not data or not data.get("data"):
            log.warning("  Skipping mal_id=%s (no data)", mal_id)
            continue
        entry = parse_jikan_item(data["data"])
        if entry:
            ok = upsert_anime(conn, entry)
            if ok:
                log.info("  ✓ %s (mal_id=%s)", entry["title"], mal_id)

    conn.close()

    # Count rows
    conn2 = get_db_connection()
    row = conn2.execute("SELECT COUNT(*) as cnt FROM anime").fetchone()
    total = row["cnt"] if row else "?"
    conn2.close()

    log.info("=" * 60)
    log.info("Done! Total anime in DB: %s", total)
    log.info("=" * 60)


if __name__ == "__main__":
    main()
