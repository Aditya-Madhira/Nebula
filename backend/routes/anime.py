"""
routes/anime.py
---------------
REST endpoints for local anime data and service health.
"""

import os
import json
import logging
from fastapi import APIRouter, HTTPException

log    = logging.getLogger(__name__)
router = APIRouter()

ANIME_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "anime.json")


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

