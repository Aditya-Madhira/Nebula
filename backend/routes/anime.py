"""
routes/anime.py
---------------
REST endpoints for local anime data and service health.
"""

import os
import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from routes.auth import get_current_user
from db import get_db_connection

log    = logging.getLogger(__name__)
router = APIRouter()

ANIME_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "anime.json")


class RatingRequest(BaseModel):
    anime_id: int
    rating:   int  # 1 for like, -1 for dislike, 0 to clear


class FavoriteRequest(BaseModel):
    anime_id:    int
    anime_title: str


class HistoryRequest(BaseModel):
    anime_id:    int
    anime_title: str


@router.get("/api/anime")
async def get_anime():
    """
    Returns anime data from the local anime.json file.
    """
    if not os.path.exists(ANIME_JSON_PATH):
        raise HTTPException(
            status_code=500,
            detail="Local anime dataset (anime.json) not found.",
        )

    try:
        with open(ANIME_JSON_PATH, "r", encoding="utf-8") as f:
            anime_data = json.load(f)
        anime_data.sort(key=lambda x: x.get("score", 0), reverse=True)
        return anime_data
    except Exception as e:
        log.error("Failed to read local anime data: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch local anime data.")


@router.post("/api/anime/favorites/add")
async def add_favorite(payload: FavoriteRequest, user=Depends(get_current_user)):
    """
    Adds an anime to the user's favorites list.
    """
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO favorites (user_id, anime_id, anime_title) VALUES (?, ?, ?)",
            (user["sub"], payload.anime_id, payload.anime_title),
        )
        conn.commit()
        return {"status": "success", "message": f"Added {payload.anime_title} to favorites."}
    finally:
        conn.close()


@router.get("/api/anime/favorites/check/{anime_id}")
async def check_favorite(anime_id: int, user=Depends(get_current_user)):
    """
    Checks if an anime is in the user's favorites list.
    """
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT 1 FROM favorites WHERE user_id = ? AND anime_id = ?",
            (user["sub"], anime_id),
        ).fetchone()
        return {"is_favorite": bool(row)}
    finally:
        conn.close()


@router.post("/api/anime/history/add")
async def add_history(payload: HistoryRequest, user=Depends(get_current_user)):
    """
    Adds an anime to the user's watch history.
    """
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO watch_history (user_id, anime_id, anime_title) VALUES (?, ?, ?)
            ON CONFLICT(user_id, anime_id, episode_number) DO UPDATE SET
                watched_at = CURRENT_TIMESTAMP
            """,
            (user["sub"], payload.anime_id, payload.anime_title),
        )
        conn.commit()
        return {"status": "success", "message": f"Added {payload.anime_title} to history."}
    finally:
        conn.close()


@router.get("/api/anime/ratings/{anime_id}")
async def get_user_rating(anime_id: int, user=Depends(get_current_user)):
    """
    Returns the current user's rating for a specific anime.
    """
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT rating FROM user_ratings WHERE user_id = ? AND anime_id = ?",
            (user["sub"], anime_id),
        ).fetchone()
        return {"rating": row["rating"] if row else 0}
    finally:
        conn.close()


@router.post("/api/anime/rate")
async def rate_anime(payload: RatingRequest, user=Depends(get_current_user)):
    """
    Sets or updates the current user's rating for an anime.
    """
    if payload.rating not in [1, -1, 0]:
        raise HTTPException(status_code=400, detail="Invalid rating value.")

    conn = get_db_connection()
    try:
        if payload.rating == 0:
            conn.execute(
                "DELETE FROM user_ratings WHERE user_id = ? AND anime_id = ?",
                (user["sub"], payload.anime_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO user_ratings (user_id, anime_id, rating, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, anime_id) DO UPDATE SET
                    rating = excluded.rating,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user["sub"], payload.anime_id, payload.rating),
            )
        conn.commit()
        return {"status": "success", "rating": payload.rating}
    except Exception as e:
        log.error("Failed to update rating: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update rating.")
    finally:
        conn.close()


@router.get("/api/anime/favorites/count")
async def favorites_count(user=Depends(get_current_user)):
    """Number of anime in the user's favorites list."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?", (user["sub"],)
        ).fetchone()
        return {"count": row["count"]}
    finally:
        conn.close()


@router.get("/api/anime/favorites/list")
async def favorites_list(user=Depends(get_current_user)):
    """The user's favorite anime (full catalogue rows), newest first."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT a.mal_id, a.title, a.genres, a.score, a.episodes,
                   a.synopsis, a.image_url, a.anime_type
            FROM favorites f JOIN anime a ON a.mal_id = f.anime_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC, f.id DESC
            """,
            (user["sub"],),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/api/anime/history")
async def watch_history(user=Depends(get_current_user)):
    """The user's recently watched anime (one row per anime), newest first."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT a.mal_id, a.title, a.genres, a.score, a.episodes,
                   a.synopsis, a.image_url, a.anime_type
            FROM (
                SELECT anime_id, MAX(watched_at) AS last_watched
                FROM watch_history WHERE user_id = ? GROUP BY anime_id
            ) h JOIN anime a ON a.mal_id = h.anime_id
            ORDER BY h.last_watched DESC
            LIMIT 30
            """,
            (user["sub"],),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/api/anime/search")
async def search_anime(q: str = ""):
    """Search the local catalogue by title."""
    q = q.strip()
    if not q:
        return []
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT mal_id, title, genres, score, episodes, synopsis, image_url, anime_type
            FROM anime WHERE title LIKE ? ORDER BY score DESC LIMIT 20
            """,
            (f"%{q}%",),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/api/anime/{anime_id}/episodes")
async def get_episodes(anime_id: int):
    """Cached episode list for an anime (may be empty; the UI falls back to a numbered list)."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT episode_number, title, is_filler FROM anime_episodes
            WHERE mal_id = ? ORDER BY episode_number
            """,
            (anime_id,),
        ).fetchall()
        return {"episodes": [{**dict(r), "is_filler": bool(r["is_filler"])} for r in rows]}
    finally:
        conn.close()


@router.get("/api/health")
async def health_check():
    """
    Returns the health status of the local service.
    """
    dataset_exists = os.path.exists(ANIME_JSON_PATH)
    return {
        "status":         "healthy",
        "mode":           "local-dev",
        "dataset_loaded": dataset_exists,
    }
