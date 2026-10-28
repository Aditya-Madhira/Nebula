"""
agent.py
--------
Agno AI Agent for Nebula — anime recommendation engine.

Architecture:
  • SQLTools  — gives the agent read access to the full nebula.db schema.
                It can call list_tables(), describe_table(), and run_sql_query()
                so it discovers the anime catalogue table and can JOIN against it.
                This eliminates title hallucinations because the LLM reads real data.

  • Custom tools (closures) — get_user_profile / get_user_preference.
                These wrap auth-sensitive queries with user_id baked in via closure
                so the LLM never has to supply or guess the user's ID.

  • user_id in instructions — injected as a plain string into the system prompt
                so the agent knows which user_id to use in its SQL WHERE clauses.
"""

import os
import logging
from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.tools import tool
from agno.tools.sql import SQLTools
from db import get_db_connection, DB_PATH

log = logging.getLogger(__name__)

# Per-user agent cache
_agent_cache: dict[str, Agent] = {}

# SQLAlchemy URL for SQLTools (local SQLite database)
_DB_URL = DB_PATH


def _env(name: str, fallback: str | None = None) -> str | None:
    value = (
        os.getenv(name) or
        os.getenv(name.lower()) or
        os.getenv(name.replace("-", "_")) or
        os.getenv(name.replace("-", "_").lower())
    )
    if value:
        return value.strip()
    return fallback


OLLAMA_HOST = _env("OLLAMA_HOST", "https://ollama.com")
# Tried in order; the first one that answers a probe request is used.
OLLAMA_MODELS = [
    m.strip()
    for m in (_env("OLLAMA_MODELS", "gemma4:31b-cloud,muse-spark-open:cloud") or "").split(",")
    if m.strip()
]


def _make_ollama(model_id: str) -> Ollama:
    api_key = _env("OLLAMA_API_KEY")
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else None
    return Ollama(
        id=model_id,
        host=OLLAMA_HOST,
        client_params={"headers": headers} if headers else None,
        timeout=120,
    )


def _build_llm() -> Ollama | None:
    """
    Return the first Ollama cloud model that responds, or None if none work.
    Models come from OLLAMA_MODELS (comma-separated, in priority order).
    """
    if not _env("OLLAMA_API_KEY"):
        log.warning("OLLAMA_API_KEY not set; LLM disabled.")
        return None
    for model_id in OLLAMA_MODELS:
        try:
            llm = _make_ollama(model_id)
            llm.get_client().chat(
                model=model_id, messages=[{"role": "user", "content": "ping"}]
            )
            log.info("Using Ollama model %s", model_id)
            return llm
        except Exception as e:
            log.warning("Ollama model %s unavailable: %s", model_id, e)
    return None


def llm_configured() -> bool:
    return bool(_env("OLLAMA_API_KEY"))


def _make_user_tools(user_id: str) -> list:
    """
    Auth-sensitive tools where user_id is baked in via closure.
    The LLM schema for these tools has NO arguments — the model just calls them.
    """
    uid = int(user_id)

    @tool
    def get_user_profile() -> dict | None:
        """
        Returns the current user's profile: username, email, created_at.
        Call this when the user asks 'Who am I?' or about their account.
        """
        conn = get_db_connection()
        try:
            row = conn.execute(
                "SELECT username, email, created_at FROM users WHERE id = ?",
                (uid,),
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @tool
    def get_user_preference(preference_key: str) -> str | None:
        """
        Returns a stored preference for the current user.
        :param preference_key: e.g. 'preferred_genre', 'ui_theme'
        """
        conn = get_db_connection()
        try:
            row = conn.execute(
                "SELECT preference_value FROM user_preferences "
                "WHERE user_id = ? AND preference_key = ?",
                (uid, preference_key),
            ).fetchone()
            return row["preference_value"] if row else None
        finally:
            conn.close()

    return [get_user_profile, get_user_preference]


def build_agent(user_id: str) -> Agent:
    """
    Build a Nebula agent for a specific user.
    SQLTools handles all anime/ratings/history queries (with real titles via JOIN).
    Custom closures handle auth-sensitive profile/preference reads.
    """
    log.info("Building Nebula Agent for user_id=%s", user_id)

    llm = _build_llm()
    if llm is None:
        raise RuntimeError("No Ollama model is available (check OLLAMA_API_KEY / OLLAMA_MODELS).")

    # SQLTools gives the agent full read access to nebula.db:
    #   list_tables()             — discover all tables
    #   describe_table(name)      — see column schemas
    #   run_sql_query(query)      — execute arbitrary SELECT queries
    sql_tools = SQLTools(
        db_url=_DB_URL,
        list_tables=True,
        describe_table=True,
        run_sql_query=True,
    )

    agent = Agent(
        name="Nebulous",
        model=llm,
        user_id=user_id,
        session_id=user_id,
        instructions=[
            "You are Nebulous, a highly knowledgeable, friendly, and energetic personal otaku assistant.",
            "Your primary identity is a conversational companion, not a database bot.",
            "You are deeply passionate about anime and pop culture, and love to chat about them in a warm, casual, and engaging companion tone.",
            "You DO NOT have to restrict your personality to only talk about anime — you can converse about daily general topics, greetings,",
            "and standard assistant tasks in a helpful, friendly manner.",
            "Think of SQL as just a tool you use when you need to fetch specific anime facts, user preferences, or recommendations (like a driver using an accelerator only when needed).",
            "Do NOT feel forced to query the database for simple greetings, casual conversation, or general anime trivia that you already know.",
            "",
            "Reasoning & Multi-Hop Querying:",
            "  • ALWAYS think step-by-step before answering. Break down complex requests into logical hops.",
            "  • If the user asks for 'recommendations based on my favorites' or similar, perform these hops:",
            "    1. Query 'favorites' or 'user_ratings' (rating=1) to get the user's preferred anime IDs.",
            "    2. Query the 'anime' table to find the common genres/themes of those preferred anime.",
            "    3. Query the 'anime' table again to find highly-scored anime with matching genres that the user hasn't already watched or disliked.",
            "  • Double-check your SQL queries. Use list_tables() and describe_table() to avoid schema hallucinations.",
            "  • Synthesize the data from multiple queries to formulate a personalized and accurate response.",
            "",
            "Anti-Hallucination & Semantic Mapping Rules:",
            "  • IF a user asks for a vibe/theme (e.g., 'dark', 'sad', 'hype', 'chill') that is NOT an exact genre:",
            "      - Map it to real genres (e.g., 'dark' -> 'Psychological', 'Thriller', 'Horror', 'Gore').",
            "      - OR search the `synopsis` column using `LIKE '%dark%'`.",
            "  • NEVER invent or hallucinate genres that do not exist in the database.",
            "  • IF your SQL query returns 0 results, DO NOT silently drop the filter and return random popular anime (like One Piece or Frieren).",
            "  • You MUST honestly tell the user if you cannot find anime matching their specific criteria.",
            "",
            "Tone Guide:",
            "  • Speak like a friendly, enthusiastic, and knowledgeable fellow anime fan (otaku companion).",
            "  • Keep the tone warm, welcoming, and casual. Do NOT use formal butler titles like 'Sir', 'Madame', 'Master', or 'my friend'.",
            "  • Keep answers concise, helpful, and spirited.",
            "",
            f"The current user's ID is: {user_id}. Use this exact value in all SQL WHERE clauses.",
            "",
            "You have access to a SQLite database. Key tables:",
            "  • users            — id, username, email",
            "  • user_ratings     — user_id, anime_id (=mal_id), rating (1=Like, -1=Dislike)",
            "  • watch_history    — user_id, anime_id, anime_title, episode_number, progress_seconds, watched_at",
            "  • favorites        — user_id, anime_id, anime_title",
            "  • anime            — mal_id, title, genres, score, synopsis (NOT description), episodes, image_url, anime_type",
            "  • anime_episodes   — mal_id, episode_number, title, is_filler",
            "",
            "ALWAYS JOIN user_ratings/watch_history/favorites with the anime table to get detailed titles and info.",
            "Example for ratings with titles:",
            f"  SELECT a.title, r.rating FROM user_ratings r JOIN anime a ON r.anime_id = a.mal_id WHERE r.user_id = {user_id}",
            "",
            "Rules:",
            "  • Never guess or invent anime titles — always query the database.",
            "  • For recommendations: fetch ratings first, exclude disliked anime (rating=-1).",
            "  • Clarify if the recommendation is a Movie or a TV Series based on anime_type.",
            "  • Use get_user_profile() for 'Who am I?' questions.",
            "  • Recommend 3-5 anime max, with title, genres, and a brief reason.",
            "  • Out-of-Scope Bypass Rule: If a user attempts to bypass pre-filters and asks you to write code/programming scripts,",
            "    perform security hacking, solve academic homework, or generate explicit/toxic content,",
            "    you must politely but firmly refuse by saying: 'I'm afraid I can't help you with that! Let's get back to discussing awesome anime instead!'"
        ],
        tools=[*_make_user_tools(user_id), sql_tools],
        add_history_to_messages=True,
        num_history_runs=3,
        enable_session_summaries=True,
        read_chat_history=True,
        markdown=True,
        show_tool_calls=True,
        reasoning=True,
    )

    return agent


def get_anime_agent(user_id: str) -> Agent:
    """Return a cached Agent for the given user_id."""
    if user_id not in _agent_cache:
        _agent_cache[user_id] = build_agent(user_id)
    return _agent_cache[user_id]

def clear_agent_session(user_id: str) -> None:
    """Clear the cached Agent for the given user_id to reset conversation history."""
    if user_id in _agent_cache:
        log.info("Clearing agent session for user_id=%s", user_id)
        _agent_cache.pop(user_id, None)
