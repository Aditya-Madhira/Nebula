"""
db.py
-----
SQLite database setup and connection helper.
The database file is created next to this file on first run.
"""

import os
import json
import sqlite3
import logging

log = logging.getLogger(__name__)

DB_PATH   = os.path.join(os.path.dirname(__file__), "nebula.db")
ANIME_JSON = os.path.join(os.path.dirname(__file__), "anime.json")


def get_db_connection() -> sqlite3.Connection:
    """Return a new SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't already exist, then seed anime catalogue."""
    conn = get_db_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                email         TEXT    NOT NULL UNIQUE,
                password_hash TEXT    NOT NULL,
                username      TEXT    NOT NULL,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id          INTEGER NOT NULL,
                preference_key   TEXT    NOT NULL,
                preference_value TEXT    NOT NULL,
                created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, preference_key),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS watch_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                anime_id    INTEGER NOT NULL,
                anime_title TEXT    NOT NULL,
                watched_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                anime_id    INTEGER NOT NULL,
                anime_title TEXT    NOT NULL,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, anime_id),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_ratings (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                anime_id   INTEGER NOT NULL,
                rating     INTEGER NOT NULL, -- 1 for like, -1 for dislike
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, anime_id),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        # ── Anime catalogue ─────────────────────────────────────────────────
        # mal_id = MyAnimeList ID (used as anime_id in user_ratings/history)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS anime (
                mal_id   INTEGER PRIMARY KEY,
                title    TEXT NOT NULL,
                genres   TEXT,
                score    REAL,
                episodes INTEGER,
                synopsis TEXT,
                image_url TEXT
            )
        """)
        conn.commit()

        # Seed anime table from anime.json (only if it's empty)
        count = conn.execute("SELECT COUNT(*) FROM anime").fetchone()[0]
        if count == 0 and os.path.exists(ANIME_JSON):
            with open(ANIME_JSON, encoding="utf-8") as f:
                entries = json.load(f)
            conn.executemany(
                """INSERT OR IGNORE INTO anime
                   (mal_id, title, genres, score, episodes, synopsis, image_url)
                   VALUES (:mal_id, :title, :genres, :score, :episodes, :synopsis, :image_url)""",
                entries,
            )
            conn.commit()
            log.info("Seeded anime table with %d entries from anime.json", len(entries))

        log.info("Database initialised at %s", DB_PATH)
    finally:
        conn.close()
