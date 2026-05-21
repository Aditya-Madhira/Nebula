"""
routes/auth.py
--------------
Authentication endpoints: register, login, and /me.
Uses SQLite for user storage, bcrypt for password hashing, JWT for tokens.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from db import get_db_connection
from auth_utils import hash_password, verify_password, create_token, decode_token

log    = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth")
bearer = HTTPBearer(auto_error=False)


# ── Schemas ───────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:    EmailStr
    password: str
    username: str | None = None


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


# ── Helpers ───────────────────────────────────────────────────

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return payload


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    """Create a new user account."""
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    conn = get_db_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (body.email.lower(),)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        hashed = hash_password(body.password)
        display_name = body.username or body.email.split("@")[0]

        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)",
            (body.email.lower(), hashed, display_name),
        )
        conn.commit()
        user_id = cursor.lastrowid
    finally:
        conn.close()

    token = create_token({"sub": str(user_id), "email": body.email.lower(), "username": display_name})
    log.info("New user registered: %s (id=%s)", body.email, user_id)
    return {"token": token, "username": display_name, "email": body.email.lower()}


@router.post("/login")
async def login(body: LoginRequest):
    """Authenticate an existing user and return a JWT."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, email, password_hash, username FROM users WHERE email = ?",
            (body.email.lower(),),
        ).fetchone()
    finally:
        conn.close()

    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token({"sub": str(row["id"]), "email": row["email"], "username": row["username"]})
    log.info("User logged in: %s", row["email"])
    return {"token": token, "username": row["username"], "email": row["email"]}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    return {"email": user["email"], "username": user["username"]}
