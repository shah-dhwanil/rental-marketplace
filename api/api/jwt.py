"""
JWT utility functions for creating and decoding tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog
from jose import JWTError, jwt

from api.settings import get_settings

logger = structlog.get_logger(__name__)

_TOKEN_TYPE_ACCESS = "access"
_TOKEN_TYPE_REFRESH = "refresh"
_TOKEN_TYPE_REGISTRATION = "registration"


def _create_token(payload: dict[str, Any], expire_minutes: int) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    data = {**payload, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(data, settings.JWT.SECRET_KEY, algorithm=settings.JWT.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token. Raises JWTError on failure."""
    settings = get_settings()
    return jwt.decode(token, settings.JWT.SECRET_KEY, algorithms=[settings.JWT.ALGORITHM])


def create_access_token(user_id: str, role: str) -> str:
    settings = get_settings()
    return _create_token(
        {"sub": user_id, "role": role, "type": _TOKEN_TYPE_ACCESS},
        settings.JWT.ACCESS_TOKEN_EXPIRE_MINUTES,
    )


def create_refresh_token(user_id: str, role: str) -> str:
    settings = get_settings()
    return _create_token(
        {"sub": user_id, "role": role, "type": _TOKEN_TYPE_REFRESH},
        settings.JWT.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60,
    )


def create_temp_token(user_id: str, role: str) -> str:
    settings = get_settings()
    return _create_token(
        {"sub": user_id, "role": role, "type": _TOKEN_TYPE_REGISTRATION},
        settings.JWT.TEMP_TOKEN_EXPIRE_MINUTES,
    )
