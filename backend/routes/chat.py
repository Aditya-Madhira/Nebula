"""
routes/chat.py
--------------
Chat endpoint — proxies requests to the Nebula Anime Agent.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from agent import get_anime_agent
from routes.auth import get_current_user

log    = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    message:  str


@router.post("/api/chat")
async def chat(payload: ChatRequest, user=Depends(get_current_user)):
    """
    Send a message to the Nebula Anime Agent and receive a recommendation reply.
    """
    if not payload.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        anime_agent = get_anime_agent()
        user_id = int(user["sub"])
        response = anime_agent.run(payload.message, context={"user_id": user_id})
        return {
            "reply":      response.content,
            "agent_name": anime_agent.name,
        }
    except Exception as e:
        log.error("Agno Agent error: %s", e)
        raise HTTPException(status_code=500, detail=f"AI Agent error: {str(e)}")

