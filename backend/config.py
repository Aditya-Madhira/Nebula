"""
config.py
---------
Handles local configuration resolution from environment variables or sensible fallbacks.
"""

import os
import logging

log = logging.getLogger(__name__)


def get_secret(name: str, fallback: str | None = None) -> str | None:
    """
    Resolve a configuration option by name.
    Looks up environment variables directly or falls back to a default value.
    """
    env_key = name.upper().replace("-", "_")
    env_val = os.getenv(env_key)
    if env_val:
        log.info("Config option '%s' resolved from env var '%s'.", name, env_key)
        return env_val

    if fallback is not None:
        log.info("Config option '%s' using default fallback value.", name)
        return fallback

    log.warning("Config option '%s' could not be resolved from any source.", name)
    return None

