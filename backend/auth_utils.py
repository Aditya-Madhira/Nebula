"""
auth_utils.py
-------------
Password hashing (bcrypt) and JWT creation/verification helpers.
"""

import os
import logging
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

log = logging.getLogger(__name__)

# Secret key — override via JWT_SECRET env var in production
JWT_SECRET    = os.getenv("JWT_SECRET", "nebula-anime-super-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72  # tokens valid for 3 days


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_token(payload: dict) -> str:
    """Create a signed JWT with an expiry claim."""
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and verify a JWT. Returns the payload dict or None on failure."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        log.warning("JWT expired.")
        return None
    except jwt.InvalidTokenError as e:
        log.warning("Invalid JWT: %s", e)
        return None
