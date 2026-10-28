"""
refresh_worker.py
-----------------
Background thread that periodically refreshes anime metadata and episode
lists from the Jikan API into SQLite.

Interval: every 60 seconds (configurable via REFRESH_INTERVAL_SECONDS env var)
Jikan rate limit: ~1 req/sec max — we throttle safely at 1.2s between calls.
"""

import os
import time
import logging
import threading
import requests

log = logging.getLogger(__name__)

# How often (seconds) to trigger a full refresh cycle. Default: 8 hours.
REFRESH_INTERVAL = int(os.getenv("REFRESH_INTERVAL_SECONDS", "28800"))

# Jikan API base
JIKAN_BASE = "https://api.jikan.moe/v4"

# Control flag so we can signal the thread to stop gracefully
_stop_event = threading.Event()
_refresh_thread: threading.Thread | None = None

# Whether a manual refresh has been requested
_manual_trigger = threading.Event()


def trigger_refresh():
    """Signal the worker to run a refresh cycle immediately."""
    _manual_trigger.set()
    log.info("[RefreshWorker] Manual refresh triggered.")


def _fetch_with_retry(url: str, retries: int = 3, backoff: float = 2.0):
    """GET a Jikan URL with retry logic and polite rate limiting."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 429:
                wait = backoff * (attempt + 1)
                log.warning("[RefreshWorker] Rate limited by Jikan. Waiting %ss...", wait)
                time.sleep(wait)
                continue
            if resp.status_code == 200:
                return resp.json()
            log.warning("[RefreshWorker] Jikan returned %s for %s", resp.status_code, url)
            return None
        except Exception as exc:
            log.error("[RefreshWorker] Request error for %s: %s", url, exc)
            time.sleep(backoff)
    return None


def _get_all_episodes_for_anime(mal_id: int):
    """Fetch all episode pages for an anime from Jikan, returns list of dicts."""
    all_episodes = []
    page = 1
    while True:
        data = _fetch_with_retry(f"{JIKAN_BASE}/anime/{mal_id}/episodes?page={page}")
        time.sleep(1.2)  # Rate limit courtesy

        if not data:
            break

        items = data.get("data", [])
        if not items:
            break

        for ep in items:
            all_episodes.append({
                "episode_number": ep.get("mal_id"),  # Jikan uses mal_id for episode number
                "title": ep.get("title") or f"Episode {ep.get('mal_id')}",
                "is_filler": False,  # Jikan episodes endpoint doesn't provide filler info
            })

        pagination = data.get("pagination", {})
        if not pagination.get("has_next_page", False):
            break
        page += 1

    return all_episodes


def _run_refresh_cycle():
    """One full pass: refresh metadata + episodes for all anime in the DB."""
    from db import get_db_connection

    log.info("[RefreshWorker] Starting refresh cycle...")
    start = time.time()

    conn = None
    try:
        conn = get_db_connection()
        # 1. Get all mal_ids we need to refresh
        rows = conn.execute("SELECT mal_id FROM anime").fetchall()
        mal_ids = [r["mal_id"] for r in rows]
        log.info("[RefreshWorker] Refreshing %d anime records...", len(mal_ids))

        refreshed = 0
        ep_upserted = 0

        for mal_id in mal_ids:
            if _stop_event.is_set():
                log.info("[RefreshWorker] Stop signal received mid-cycle. Aborting.")
                return

            # 2. Refresh anime metadata from Jikan
            anime_data = _fetch_with_retry(f"{JIKAN_BASE}/anime/{mal_id}")
            time.sleep(1.2)

            if anime_data and anime_data.get("data"):
                d = anime_data["data"]
                fresh_episodes = d.get("episodes") or 0
                fresh_score = d.get("score") or 0.0
                fresh_synopsis = d.get("synopsis") or ""
                fresh_status = d.get("status") or ""
                fresh_type = d.get("type") or "TV"

                # Update anime row with latest info
                conn.execute(
                    """
                    UPDATE anime
                    SET episodes = ?, score = ?, synopsis = ?, anime_type = ?
                    WHERE mal_id = ?
                    """,
                    (fresh_episodes, fresh_score, fresh_synopsis, fresh_type, mal_id),
                )
                conn.commit()
                refreshed += 1

            # 3. Refresh episode list
            episodes = _get_all_episodes_for_anime(mal_id)

            for ep in episodes:
                if not ep["episode_number"]:
                    continue
                # Upsert: insert if not exists, skip if exists (we don't overwrite titles)
                try:
                    conn.execute(
                        """
                        INSERT INTO anime_episodes (mal_id, episode_number, title, is_filler)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(mal_id, episode_number) DO UPDATE SET title = excluded.title
                        """,
                        (mal_id, ep["episode_number"], ep["title"], int(ep["is_filler"])),
                    )
                    conn.commit()
                    ep_upserted += 1
                except Exception as ep_err:
                    log.warning("[RefreshWorker] Episode upsert failed mal_id=%s ep=%s: %s",
                                mal_id, ep["episode_number"], ep_err)

        elapsed = time.time() - start
        log.info(
            "[RefreshWorker] Cycle complete. %d anime refreshed, %d episode rows upserted. Took %.1fs",
            refreshed, ep_upserted, elapsed,
        )

    except Exception as exc:
        log.error("[RefreshWorker] Refresh cycle failed: %s", exc)
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def _worker_loop():
    """Main loop: run refresh immediately on start, then every REFRESH_INTERVAL seconds."""
    log.info("[RefreshWorker] Background refresh worker started. Interval: %ds", REFRESH_INTERVAL)

    while not _stop_event.is_set():
        try:
            _run_refresh_cycle()
        except Exception as exc:
            log.error("[RefreshWorker] Unhandled error in cycle: %s", exc)

        # Wait for either the interval to pass OR a manual trigger
        triggered = _manual_trigger.wait(timeout=REFRESH_INTERVAL)
        if triggered:
            _manual_trigger.clear()
            log.info("[RefreshWorker] Manual trigger received — running refresh now.")

    log.info("[RefreshWorker] Worker stopped.")


def start_worker():
    """Start the background refresh thread (call once at app startup)."""
    global _refresh_thread
    if _refresh_thread and _refresh_thread.is_alive():
        log.warning("[RefreshWorker] Worker already running.")
        return

    _stop_event.clear()
    _refresh_thread = threading.Thread(target=_worker_loop, daemon=True, name="RefreshWorker")
    _refresh_thread.start()
    log.info("[RefreshWorker] Thread started (daemon=True).")


def stop_worker():
    """Gracefully signal the worker to stop."""
    _stop_event.set()
    _manual_trigger.set()  # Unblock the wait immediately
    if _refresh_thread:
        _refresh_thread.join(timeout=5)
    log.info("[RefreshWorker] Worker stopped cleanly.")
