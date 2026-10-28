import os
import sys
from dotenv import load_dotenv

# Load .env variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Change directory to backend to import db
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_db_connection

def clear_user_data():
    print("Connecting to SQLite database to wipe user data...")
    conn = get_db_connection()
    try:
        # Deleting from users will cascade to favorites, watch_history, user_ratings, user_preferences
        cursor = conn.execute("DELETE FROM users")
        deleted_count = cursor._cursor.rowcount
        print(f"Successfully deleted {deleted_count} user(s). Cascade deleted related data.")
        conn.commit()
    except Exception as e:
        print("Error clearing data:", e)
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    clear_user_data()
