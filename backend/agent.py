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

import logging
from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.tools import tool
from agno.tools.sql import SQLTools
from agno.storage.sqlite import SqliteStorage
from db import get_db_connection, DB_PATH

log = logging.getLogger(__name__)

# Per-user agent cache
_agent_cache: dict[str, Agent] = {}

# SQLAlchemy URL for SQLTools (read-only view of nebula.db)
_DB_URL = f"sqlite:///{DB_PATH}"


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

    llm = Ollama(
        id="qwen2.5:7b",
        host="http://localhost:11434",
    )

    storage = SqliteStorage(
        table_name="agent_sessions",
        db_file=DB_PATH,
    )

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
        name="Nebula Anime Agent",
        model=llm,
        user_id=user_id,
        session_id=user_id,
        instructions=[
            "You are Nebula, an expert anime guide with a friendly, futuristic persona.",
            f"The current user's ID is: {user_id}. Use this exact value in all SQL WHERE clauses.",
            "",
            "You have access to a SQLite database (nebula.db). Key tables:",
            "  • users            — id, username, email",
            "  • user_ratings     — user_id, anime_id (=mal_id), rating (1=Like, -1=Dislike)",
            "  • watch_history    — user_id, anime_id, anime_title, watched_at",
            "  • favorites        — user_id, anime_id, anime_title",
            "  • anime            — mal_id, title, genres, score, synopsis",
            "",
            "ALWAYS JOIN user_ratings/watch_history/favorites with the anime table to get titles.",
            "Example for ratings with titles:",
            f"  SELECT a.title, r.rating FROM user_ratings r JOIN anime a ON r.anime_id = a.mal_id WHERE r.user_id = {user_id}",
            "",
            "Rules:",
            "  • Never guess or invent anime titles — always query the database.",
            "  • For recommendations: fetch ratings first, exclude disliked anime (rating=-1).",
            "  • Use get_user_profile() for 'Who am I?' questions.",
            "  • Recommend 3-5 anime max, with title, genres, and a brief reason.",
        ],
        tools=[*_make_user_tools(user_id), sql_tools],
        storage=storage,
        add_history_to_messages=True,
        num_history_runs=3,
        enable_session_summaries=True,
        read_chat_history=True,
        markdown=True,
        show_tool_calls=True,
    )

    return agent


def get_anime_agent(user_id: str) -> Agent:
    """Return a cached Agent for the given user_id."""
    if user_id not in _agent_cache:
        _agent_cache[user_id] = build_agent(user_id)
    return _agent_cache[user_id]
