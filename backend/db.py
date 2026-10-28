"""
db.py
-----
Local SQLite database setup and connection helper.
The DB file lives next to this module (nebula.db, or $NEBULA_DB_PATH) and is
created and seeded from anime.json on first start.
"""

import os
import json
import sqlite3
import logging

log = logging.getLogger(__name__)

_HERE = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.getenv("NEBULA_DB_PATH") or os.path.join(_HERE, "nebula.db")
ANIME_JSON_PATH = os.path.join(_HERE, "anime.json")

# SQLAlchemy URL (used by the agent's SQLTools)
DB_PATH = f"sqlite:///{SQLITE_PATH}"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    username      TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    preference_key   TEXT NOT NULL,
    preference_value TEXT NOT NULL,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, preference_key),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watch_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    anime_id         INTEGER NOT NULL,
    anime_title      TEXT NOT NULL,
    episode_number   INTEGER NOT NULL DEFAULT 1,
    progress_seconds INTEGER NOT NULL DEFAULT 0,
    watched_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, anime_id, episode_number),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    anime_id    INTEGER NOT NULL,
    anime_title TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, anime_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    anime_id   INTEGER NOT NULL,
    rating     INTEGER NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, anime_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anime (
    mal_id     INTEGER PRIMARY KEY,
    title      TEXT NOT NULL,
    genres     TEXT,
    score      REAL,
    episodes   INTEGER,
    synopsis   TEXT,
    image_url  TEXT,
    anime_type TEXT DEFAULT 'TV'
);

CREATE TABLE IF NOT EXISTS anime_episodes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    mal_id         INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    title          TEXT,
    is_filler      INTEGER DEFAULT 0,
    UNIQUE (mal_id, episode_number),
    FOREIGN KEY (mal_id) REFERENCES anime (mal_id) ON DELETE CASCADE
);
"""


def get_db_connection() -> sqlite3.Connection:
    """Return a new SQLite connection with dict-style row access."""
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _seed_anime(conn: sqlite3.Connection) -> None:
    """Populate the anime table from anime.json when it is empty."""
    if conn.execute("SELECT COUNT(*) FROM anime").fetchone()[0] > 0:
        return
    if not os.path.exists(ANIME_JSON_PATH):
        log.warning("anime.json not found; anime table left empty.")
        return
    with open(ANIME_JSON_PATH, "r", encoding="utf-8") as f:
        entries = json.load(f)
    conn.executemany(
        """
        INSERT OR IGNORE INTO anime
            (mal_id, title, genres, score, episodes, synopsis, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (e["mal_id"], e["title"], e.get("genres"), e.get("score"),
             e.get("episodes"), e.get("synopsis"), e.get("image_url"))
            for e in entries
        ],
    )
    conn.commit()
    log.info("Seeded %d anime from anime.json.", len(entries))


def init_db() -> None:
    """Create tables if needed and seed the anime catalogue."""
    log.info("Initialising SQLite database at %s", SQLITE_PATH)
    conn = get_db_connection()
    try:
        conn.executescript(SCHEMA)
        _seed_anime(conn)
    finally:
        conn.close()
