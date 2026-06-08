"""
migrate_to_azure.py
-------------------
Migrates the schema and seeds all local data from SQLite (nebula.db) to Azure SQL Server (nebuladb).
"""

import os
import sqlite3
import pymssql
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "nebula.db")

# Azure SQL Server credentials
def _env(name: str, fallback: str | None = None, *, required: bool = False) -> str:
    value = os.getenv(name) or os.getenv(name.replace("-", "_"))
    if value:
        return value
    if required:
        raise RuntimeError(f"Missing required environment variable: {name}")
    if fallback is not None:
        return fallback
    raise RuntimeError(f"Missing required environment variable: {name}")


AZURE_SERVER = _env("AZURE-DB-SERVER", "nebulaserver.database.windows.net")
AZURE_DATABASE = _env("AZURE-DB-NAME", "nebuladb")
AZURE_USER = _env("AZURE-DB-USER", "CloudSAac267eda")
AZURE_PASSWORD = _env("DB-PASSWORD", required=True)

def migrate():
    if not os.path.exists(SQLITE_DB_PATH):
        log.error("Local SQLite database not found at %s. Please run backend server first to initialize SQLite database.", SQLITE_DB_PATH)
        return

    log.info("Connecting to local SQLite database at %s...", SQLITE_DB_PATH)
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    log.info("Connecting to Azure SQL Server: %s / %s...", AZURE_SERVER, AZURE_DATABASE)
    try:
        azure_conn = pymssql.connect(
            server=AZURE_SERVER,
            user=AZURE_USER,
            password=AZURE_PASSWORD,
            database=AZURE_DATABASE,
            autocommit=True
        )
        azure_cursor = azure_conn.cursor()
        log.info("Successfully connected to Azure SQL Database!")
    except Exception as e:
        log.error("Failed to connect to Azure SQL Server: %s", e)
        sqlite_conn.close()
        return

    try:
        # 1. Create Tables
        log.info("Creating Azure SQL tables if they do not exist...")
        
        azure_cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
        BEGIN
            CREATE TABLE users (
                id            INT IDENTITY(1,1) PRIMARY KEY,
                email         VARCHAR(255)    NOT NULL UNIQUE,
                password_hash VARCHAR(255)    NOT NULL,
                username      VARCHAR(255)    NOT NULL,
                created_at    DATETIME DEFAULT GETDATE()
            )
        END
        """)

        azure_cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_preferences' AND xtype='U')
        BEGIN
            CREATE TABLE user_preferences (
                id               INT IDENTITY(1,1) PRIMARY KEY,
                user_id          INT NOT NULL,
                preference_key   VARCHAR(255)    NOT NULL,
                preference_value VARCHAR(MAX)    NOT NULL,
                created_at       DATETIME DEFAULT GETDATE(),
                CONSTRAINT UQ_user_preferences UNIQUE(user_id, preference_key),
                CONSTRAINT FK_user_preferences_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        END
        """)

        azure_cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='watch_history' AND xtype='U')
        BEGIN
            CREATE TABLE watch_history (
                id               INT IDENTITY(1,1) PRIMARY KEY,
                user_id          INT NOT NULL,
                anime_id         INT NOT NULL,
                anime_title      VARCHAR(512)    NOT NULL,
                episode_number   INT NOT NULL DEFAULT 1,
                progress_seconds INT NOT NULL DEFAULT 0,
                watched_at       DATETIME DEFAULT GETDATE(),
                CONSTRAINT UQ_watch_history UNIQUE(user_id, anime_id, episode_number),
                CONSTRAINT FK_watch_history_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        END
        """)

        azure_cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='favorites' AND xtype='U')
        BEGIN
            CREATE TABLE favorites (
                id          INT IDENTITY(1,1) PRIMARY KEY,
                user_id     INT NOT NULL,
                anime_id    INT NOT NULL,
                anime_title VARCHAR(512)    NOT NULL,
                created_at  DATETIME DEFAULT GETDATE(),
                CONSTRAINT UQ_favorites UNIQUE(user_id, anime_id),
                CONSTRAINT FK_favorites_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        END
        """)

        azure_cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_ratings' AND xtype='U')
        BEGIN
            CREATE TABLE user_ratings (
                id         INT IDENTITY(1,1) PRIMARY KEY,
                user_id    INT NOT NULL,
                anime_id   INT NOT NULL,
                rating     INT NOT NULL,
                updated_at DATETIME DEFAULT GETDATE(),
                CONSTRAINT UQ_user_ratings UNIQUE(user_id, anime_id),
                CONSTRAINT FK_user_ratings_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        END
        """)

        azure_cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='anime' AND xtype='U')
        BEGIN
            CREATE TABLE anime (
                mal_id   INT PRIMARY KEY,
                title    VARCHAR(512) NOT NULL,
                genres   VARCHAR(512),
                score    REAL,
                episodes INT,
                synopsis VARCHAR(MAX),
                image_url VARCHAR(1024),
                anime_type VARCHAR(50) DEFAULT 'TV'
            )
        END
        """)

        azure_cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='anime_episodes' AND xtype='U')
        BEGIN
            CREATE TABLE anime_episodes (
                id             INT IDENTITY(1,1) PRIMARY KEY,
                mal_id         INT NOT NULL,
                episode_number INT NOT NULL,
                title          VARCHAR(512),
                is_filler      BIT DEFAULT 0,
                CONSTRAINT FK_anime_episodes_anime FOREIGN KEY (mal_id) REFERENCES anime (mal_id) ON DELETE CASCADE,
                CONSTRAINT UQ_anime_episodes UNIQUE(mal_id, episode_number)
            )
        END
        """)

        log.info("Azure SQL Database tables created/verified successfully.")

        # 2. Migrate Anime catalog table
        log.info("Migrating 'anime' table...")
        sqlite_cursor.execute("SELECT * FROM anime")
        animes = sqlite_cursor.fetchall()
        for a in animes:
            try:
                azure_cursor.execute(
                    "INSERT INTO anime (mal_id, title, genres, score, episodes, synopsis, image_url) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (a['mal_id'], a['title'], a['genres'], a['score'], a['episodes'], a['synopsis'], a['image_url'])
                )
            except pymssql.IntegrityError:
                # Keep it idempotent, ignore duplicates
                pass
        log.info("Migrated %d anime records.", len(animes))

        # 3. Migrate Anime Episodes
        log.info("Migrating 'anime_episodes' table...")
        sqlite_cursor.execute("SELECT * FROM anime_episodes")
        episodes = sqlite_cursor.fetchall()
        for ep in episodes:
            try:
                azure_cursor.execute(
                    "INSERT INTO anime_episodes (mal_id, episode_number, title, is_filler) VALUES (%s, %s, %s, %s)",
                    (ep['mal_id'], ep['episode_number'], ep['title'], int(ep['is_filler']))
                )
            except pymssql.IntegrityError:
                pass
        log.info("Migrated %d anime episodes records.", len(episodes))

        # 4. Migrate Users (with IDENTITY_INSERT)
        log.info("Migrating 'users' table...")
        sqlite_cursor.execute("SELECT * FROM users")
        users = sqlite_cursor.fetchall()
        if users:
            try:
                azure_cursor.execute("SET IDENTITY_INSERT users ON")
                for u in users:
                    azure_cursor.execute(
                        "INSERT INTO users (id, email, password_hash, username, created_at) VALUES (%s, %s, %s, %s, %s)",
                        (u['id'], u['email'], u['password_hash'], u['username'], u['created_at'])
                    )
                azure_cursor.execute("SET IDENTITY_INSERT users OFF")
            except pymssql.IntegrityError:
                try:
                    azure_cursor.execute("SET IDENTITY_INSERT users OFF")
                except:
                    pass
        log.info("Migrated %d user accounts.", len(users))

        # 5. Migrate Preferences (with IDENTITY_INSERT)
        log.info("Migrating 'user_preferences' table...")
        sqlite_cursor.execute("SELECT * FROM user_preferences")
        prefs = sqlite_cursor.fetchall()
        if prefs:
            try:
                azure_cursor.execute("SET IDENTITY_INSERT user_preferences ON")
                for p in prefs:
                    azure_cursor.execute(
                        "INSERT INTO user_preferences (id, user_id, preference_key, preference_value, created_at) VALUES (%s, %s, %s, %s, %s)",
                        (p['id'], p['user_id'], p['preference_key'], p['preference_value'], p['created_at'])
                    )
                azure_cursor.execute("SET IDENTITY_INSERT user_preferences OFF")
            except pymssql.IntegrityError:
                try:
                    azure_cursor.execute("SET IDENTITY_INSERT user_preferences OFF")
                except:
                    pass
        log.info("Migrated %d user preferences.", len(prefs))

        # 6. Migrate Ratings (with IDENTITY_INSERT)
        log.info("Migrating 'user_ratings' table...")
        sqlite_cursor.execute("SELECT * FROM user_ratings")
        ratings = sqlite_cursor.fetchall()
        if ratings:
            try:
                azure_cursor.execute("SET IDENTITY_INSERT user_ratings ON")
                for r in ratings:
                    azure_cursor.execute(
                        "INSERT INTO user_ratings (id, user_id, anime_id, rating, updated_at) VALUES (%s, %s, %s, %s, %s)",
                        (r['id'], r['user_id'], r['anime_id'], r['rating'], r['updated_at'])
                    )
                azure_cursor.execute("SET IDENTITY_INSERT user_ratings OFF")
            except pymssql.IntegrityError:
                try:
                    azure_cursor.execute("SET IDENTITY_INSERT user_ratings OFF")
                except:
                    pass
        log.info("Migrated %d user ratings.", len(ratings))

        # 7. Migrate Favorites (with IDENTITY_INSERT)
        log.info("Migrating 'favorites' table...")
        sqlite_cursor.execute("SELECT * FROM favorites")
        favs = sqlite_cursor.fetchall()
        if favs:
            try:
                azure_cursor.execute("SET IDENTITY_INSERT favorites ON")
                for f in favs:
                    azure_cursor.execute(
                        "INSERT INTO favorites (id, user_id, anime_id, anime_title, created_at) VALUES (%s, %s, %s, %s, %s)",
                        (f['id'], f['user_id'], f['anime_id'], f['anime_title'], f['created_at'])
                    )
                azure_cursor.execute("SET IDENTITY_INSERT favorites OFF")
            except pymssql.IntegrityError:
                try:
                    azure_cursor.execute("SET IDENTITY_INSERT favorites OFF")
                except:
                    pass
        log.info("Migrated %d favorites.", len(favs))

        # 8. Migrate Watch History (with IDENTITY_INSERT)
        log.info("Migrating 'watch_history' table...")
        sqlite_cursor.execute("SELECT * FROM watch_history")
        histories = sqlite_cursor.fetchall()
        if histories:
            try:
                azure_cursor.execute("SET IDENTITY_INSERT watch_history ON")
                for h in histories:
                    azure_cursor.execute(
                        "INSERT INTO watch_history (id, user_id, anime_id, anime_title, episode_number, progress_seconds, watched_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                        (h['id'], h['user_id'], h['anime_id'], h['anime_title'], h['episode_number'], h['progress_seconds'], h['watched_at'])
                    )
                azure_cursor.execute("SET IDENTITY_INSERT watch_history OFF")
            except pymssql.IntegrityError:
                try:
                    azure_cursor.execute("SET IDENTITY_INSERT watch_history OFF")
                except:
                    pass
        log.info("Migrated %d watch history records.", len(histories))

        log.info("\n>>> SUCCESS: DATABASE SCHEMA PROVISIONED AND DATA MIGRATED TO AZURE SQL! <<<\n")

    except Exception as e:
        log.error("Error during migration: %s", e)
    finally:
        azure_conn.close()
        sqlite_conn.close()

if __name__ == "__main__":
    migrate()
