"""
agent.py
--------
Agno AI Agent definition for the Nebula Anime recommendation engine.
Imports the LLM config from config.py and exposes a ready-to-use agent instance using local Ollama.
"""

import logging
from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.tools import Tool
from agno.db.sqlite import SqliteDb
from config import get_secret
from db import get_db_connection, DB_PATH

log = logging.getLogger(__name__)
_anime_agent: Agent | None = None


def get_user_preference(user_id: int, preference_key: str) -> str | None:
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT preference_value FROM user_preferences WHERE user_id = ? AND preference_key = ?",
            (user_id, preference_key),
        ).fetchone()
        if row:
            return row["preference_value"]
        return None
    finally:
        conn.close()


def set_user_preference(user_id: int, preference_key: str, preference_value: str) -> None:
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO user_preferences (user_id, preference_key, preference_value) VALUES (?, ?, ?)",
            (user_id, preference_key, preference_value),
        )
        conn.commit()
    finally:
        conn.close()


def build_agent() -> Agent:
    """
    Instantiate and return the Nebula Anime Agent using a local Ollama model.
    """
    model_name = get_secret("ollama-model-name", "ministral-3:8b-cloud")
    ollama_host = get_secret("ollama-host", "http://localhost:11434")

    log.info("Building Nebula Anime Agent with local Ollama model: %s at %s", model_name, ollama_host)

    llm = Ollama(
        id=model_name,
        host=ollama_host,
    )

    # Initialize Agno's SqliteDb for memory management
    agno_db = SqliteDb(db_file=DB_PATH)

    tools = [
        Tool(
            name="get_user_preference",
            description="Retrieves a specific preference value for the current user.",
            parameters={
                "type": "object",
                "properties": {
                    "preference_key": {"type": "string", "description": "The key of the preference to retrieve."},
                },
                "required": ["preference_key"],
            },
            func=get_user_preference,
        ),
        Tool(
            name="set_user_preference",
            description="Sets a specific preference value for the current user.",
            parameters={
                "type": "object",
                "properties": {
                    "preference_key": {"type": "string", "description": "The key of the preference to set."},
                    "preference_value": {"type": "string", "description": "The value to set for the preference."},
                },
                "required": ["preference_key", "preference_value"],
            },
            func=set_user_preference,
        ),
    ]

    agent = Agent(
        name="Nebula Anime Agent",
        model=llm,
        instructions=[
            "You are Nebula Anime Agent, the resident AI assistant for the Nebula Anime website.",
            "Users interact with you through a premium liquid glass chat bar and widget on the site.",
            "Your goal is to help users discover great anime, discuss ratings/genres, and answer questions.",
            "Maintain a friendly, engaging, and expert otaku-guide persona suited to the site's futuristic aesthetic.",
            "Keep your responses concise and focused. Recommend 3-5 anime max per response.",
            "You have access to tools to manage user preferences. Always use the user_id provided in the context for preference management."
        ],
        tools=tools,
        db=agno_db,  # Pass the Agno database instance
        update_memory_on_run=True,  # Enable automatic memory management
        markdown=True,
    )

    return agent


# Single shared agent instance — created once when the module is first imported
def get_anime_agent() -> Agent:
    """
    Return a cached agent after app startup.
    """
    global _anime_agent
    if _anime_agent is None:
        _anime_agent = build_agent()
    return _anime_agent

