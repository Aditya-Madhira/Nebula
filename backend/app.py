"""
app.py
------
FastAPI application entrypoint.
- Loads environment variables
- Registers all routers
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env for local dev (no-op in production where env vars are set directly)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)


# ── Startup / shutdown lifecycle ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise shared resources on startup."""
    from db import init_db
    init_db()
    yield
    # (Add any cleanup here in the future)


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Anime Recommendation Engine", lifespan=lifespan)

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────

from routes.anime import router as anime_router  # noqa: E402
from routes.chat  import router as chat_router   # noqa: E402
from routes.auth  import router as auth_router   # noqa: E402

app.include_router(anime_router)
app.include_router(chat_router)
app.include_router(auth_router)



# ── Dev server entrypoint ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
