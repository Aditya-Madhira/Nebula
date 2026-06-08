"""
routes/chat.py
--------------
Chat endpoint — proxies requests to the Nebula Anime Agent.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from agent import get_anime_agent, clear_agent_session
from routes.auth import get_current_user
from guardrails import validate_user_query

log    = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/api/chat")
async def chat(payload: ChatRequest, user=Depends(get_current_user)):
    """
    Send a message to the Nebula Anime Agent and receive a recommendation reply.
    """
    if not payload.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # 1. Run Pre-LLM Guardrails
    is_valid, rejection_message = validate_user_query(payload.message)
    if not is_valid:
        return {
            "reply":      rejection_message,
            "agent_name": "Nebulous",
        }

    try:
        user_id = str(user["sub"])
        # get_anime_agent(user_id) returns a cached agent whose tools already
        # have user_id baked in via closure — no injection tricks needed.
        anime_agent = get_anime_agent(user_id)
        response = anime_agent.run(payload.message, user_id=user_id, session_id=user_id)
        
        metrics_dict = {}
        if hasattr(response, 'metrics') and response.metrics:
            if isinstance(response.metrics, dict):
                metrics_dict = response.metrics
            else:
                try:
                    metrics_dict = response.metrics.model_dump()
                except:
                    metrics_dict = str(response.metrics)
        elif hasattr(response, 'run_metrics') and response.run_metrics:
            if isinstance(response.run_metrics, dict):
                metrics_dict = response.run_metrics
            else:
                try:
                    metrics_dict = response.run_metrics.model_dump()
                except:
                    pass

        return {
            "reply":      response.content,
            "agent_name": anime_agent.name,
            "metrics":    metrics_dict,
        }
    except Exception as e:
        log.error("Agno Agent error: %s", e)
        raise HTTPException(status_code=500, detail=f"AI Agent error: {str(e)}")

@router.post("/api/chat/clear")
async def clear_chat(user=Depends(get_current_user)):
    """
    Clear the cached agent conversation history for the current user.
    """
    user_id = str(user["sub"])
    clear_agent_session(user_id)
    return {"status": "success", "message": "Agent session cleared."}

