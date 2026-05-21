"""
db.py
-----
SQLite database setup and connection helper.
The database file is created next to this file on first run.
"""

import os
import sqlite3
import logging

log = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "nebula.db")


def get_db_connection() -> sqlite3.Connection:
    """Return a new SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't already exist."""
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
            conn.commit()
            log.info("Database initialised at %s", DB_PATH)
            finally:
            conn.close()
