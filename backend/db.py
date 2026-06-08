"""
db.py
-----
Azure SQL Database setup and connection helper.
Leverages a DB-API 2.0 wrapper so the existing SQLite parameterization
and query conventions in the application code continue to work perfectly.
"""

import os
import pymssql
import logging
import urllib.parse

log = logging.getLogger(__name__)

def _env(name: str, fallback: str | None = None, *, required: bool = False) -> str:
    print(f"DEBUG ENV KEYS looking for {name}: {list(os.environ.keys())}", flush=True)
    value = os.getenv(name)
    if not value:
        value = os.getenv(name.lower())
    if not value:
        value = os.getenv(name.replace("-", "_"))
    if not value:
        value = os.getenv(name.replace("-", "_").lower())
    if value:
        return value
    if required:
        raise RuntimeError(f"Missing required environment variable: {name}")
    if fallback is not None:
        return fallback
    raise RuntimeError(f"Missing required environment variable: {name}")


# Resolve credentials from Azure Container App env vars.
AZURE_SERVER = _env("AZURE-DB-SERVER", "nebulaserver.database.windows.net").replace("https://", "").split("/")[0]
if not AZURE_SERVER.endswith(".database.windows.net"):
    AZURE_SERVER = "nebulaserver.database.windows.net"

AZURE_DATABASE = _env("AZURE-DB-NAME", "nebuladb").strip()
AZURE_USER     = _env("AZURE-DB-USER", "CloudSAac267eda").strip()
AZURE_PASSWORD = _env("DB-PASSWORD", required=True).strip()

# pymssql on Azure requires 'user@server' format for the username
_SERVER_PREFIX = AZURE_SERVER.split(".")[0]
_FULL_USER = f"{AZURE_USER}@{_SERVER_PREFIX}"

_ENC_USER = urllib.parse.quote_plus(_FULL_USER)
_ENC_PASS = urllib.parse.quote_plus(AZURE_PASSWORD)
DB_PATH = f"mssql+pymssql://{_ENC_USER}:{_ENC_PASS}@{AZURE_SERVER}/{AZURE_DATABASE}"

class AzureSQLCursor:
    def __init__(self, cursor):
        self._cursor = cursor
        
    def execute(self, sql, params=None):
        if params is None:
            params = ()
            
        # 1. Clean query syntax replacements
        sql = sql.replace("CURRENT_TIMESTAMP", "GETDATE()")
        
        # 2. Intercept and rewrite SQLite-specific "INSERT OR IGNORE" (Favorites)
        if "INSERT OR IGNORE INTO favorites" in sql:
            user_id, anime_id, anime_title = params
            sql = """
            IF NOT EXISTS (SELECT 1 FROM favorites WHERE user_id = %s AND anime_id = %s)
            BEGIN
                INSERT INTO favorites (user_id, anime_id, anime_title) VALUES (%s, %s, %s)
            END
            """
            params = (user_id, anime_id, user_id, anime_id, anime_title)
            
        # 3. Intercept and rewrite SQLite-specific "ON CONFLICT" (Watch History)
        elif "ON CONFLICT(user_id, anime_id, episode_number) DO UPDATE SET" in sql:
            user_id, anime_id, anime_title, episode_number, progress_seconds = params
            sql = """
            IF EXISTS (SELECT 1 FROM watch_history WHERE user_id = %s AND anime_id = %s AND episode_number = %s)
            BEGIN
                UPDATE watch_history SET progress_seconds = %s, watched_at = GETDATE()
                WHERE user_id = %s AND anime_id = %s AND episode_number = %s
            END
            ELSE
            BEGIN
                INSERT INTO watch_history (user_id, anime_id, anime_title, episode_number, progress_seconds, watched_at)
                VALUES (%s, %s, %s, %s, %s, GETDATE())
            END
            """
            params = (
                # EXISTS check
                user_id, anime_id, episode_number,
                # UPDATE query
                progress_seconds, user_id, anime_id, episode_number,
                # INSERT query
                user_id, anime_id, anime_title, episode_number, progress_seconds
            )
            
        # 4. Intercept and rewrite SQLite-specific "ON CONFLICT" (User Ratings)
        elif "ON CONFLICT(user_id, anime_id) DO UPDATE SET" in sql:
            user_id, anime_id, rating = params
            sql = """
            IF EXISTS (SELECT 1 FROM user_ratings WHERE user_id = %s AND anime_id = %s)
            BEGIN
                UPDATE user_ratings SET rating = %s, updated_at = GETDATE()
                WHERE user_id = %s AND anime_id = %s
            END
            ELSE
            BEGIN
                INSERT INTO user_ratings (user_id, anime_id, rating, updated_at)
                VALUES (%s, %s, %s, GETDATE())
            END
            """
            params = (
                # EXISTS check
                user_id, anime_id,
                # UPDATE query
                rating, user_id, anime_id,
                # INSERT query
                user_id, anime_id, rating
            )
        
        # 5. Convert standard SQLite '?' placeholder to pymssql '%s' placeholder
        sql = sql.replace("?", "%s")
        
        # Execute query
        self._cursor.execute(sql, params)
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        return row

    def fetchall(self):
        return self._cursor.fetchall()

    @property
    def lastrowid(self):
        # In SQL Server, return the identity of the last inserted record
        self._cursor.execute("SELECT @@IDENTITY AS last_id")
        row = self._cursor.fetchone()
        if row and "last_id" in row and row["last_id"] is not None:
            return int(row["last_id"])
        return None

class AzureSQLConnection:
    def __init__(self, conn):
        self._conn = conn
        
    def cursor(self):
        # as_dict=True allows row["column_name"] access to mimic sqlite3.Row
        return AzureSQLCursor(self._conn.cursor(as_dict=True))
        
    def execute(self, sql, params=None):
        cursor = self.cursor()
        cursor.execute(sql, params)
        return cursor
        
    def commit(self):
        self._conn.commit()
        
    def rollback(self):
        self._conn.rollback()
        
    def close(self):
        self._conn.close()

def get_db_connection() -> AzureSQLConnection:
    """Return a new Azure SQL connection wrapped in our compatibility layer."""
    conn = pymssql.connect(
        server=AZURE_SERVER,
        user=_FULL_USER,
        password=AZURE_PASSWORD,
        database=AZURE_DATABASE,
        autocommit=False
    )
    return AzureSQLConnection(conn)

import time

def init_db() -> None:
    """Verify that we can successfully reach the cloud database. Retries for Serverless DB wake up."""
    log.info("Testing connection to Azure SQL Database at %s...", AZURE_SERVER)
    max_retries = 6
    for attempt in range(1, max_retries + 1):
        try:
            conn = get_db_connection()
            conn.close()
            log.info("Azure SQL Connection test: SUCCESS!")
            return
        except Exception as e:
            log.error("Azure SQL Connection test: FAILED on attempt %d/%d! Error: %s", attempt, max_retries, e)
            if attempt == max_retries:
                raise e
            log.info("Waiting 10 seconds for database to wake up...")
            time.sleep(10)
