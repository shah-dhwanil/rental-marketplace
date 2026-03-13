"""
FastAPI dependency providers for the users module.
"""

from typing import Annotated

import structlog
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from api.cloudinary import get_cloudinary_client
from api.database import get_db_pool
from api.jwt import decode_token
from api.users.exceptions import InsufficientPermissionException, InvalidCredentialsException
from api.users.repository import UserRepository
from api.users.service import UserService

logger = structlog.get_logger(__name__)

_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Repository & Service factories
# ---------------------------------------------------------------------------

def get_user_repository() -> UserRepository:
    return UserRepository(get_db_pool())


def get_user_service(
    repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserService:
    return UserService(repo, get_cloudinary_client())


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


# ---------------------------------------------------------------------------
# Token claim dataclass
# ---------------------------------------------------------------------------

class TokenClaims:
    def __init__(self, user_id: str, role: str, token_type: str) -> None:
        self.user_id = user_id
        self.role = role
        self.token_type = token_type


# ---------------------------------------------------------------------------
# Auth dependencies
# ---------------------------------------------------------------------------

def _extract_claims(
    credentials: HTTPAuthorizationCredentials | None,
    expected_type: str,
) -> TokenClaims:
    if not credentials:
        raise InvalidCredentialsException("Authorization header is missing")
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise InvalidCredentialsException("Invalid or expired token")

    if payload.get("type") != expected_type:
        raise InvalidCredentialsException(f"Expected token type '{expected_type}'")

    return TokenClaims(
        user_id=payload["sub"],
        role=payload["role"],
        token_type=expected_type,
    )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> TokenClaims:
    """Validate an access token and return its claims."""
    return _extract_claims(credentials, "access")


def get_temp_token_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> TokenClaims:
    """Validate a registration (temp) token and return its claims."""
    return _extract_claims(credentials, "registration")


def require_admin(
    claims: Annotated[TokenClaims, Depends(get_current_user)],
) -> TokenClaims:
    """Require the caller to be an admin."""
    if claims.role != "admin":
        raise InsufficientPermissionException("Admin access required")
    return claims


CurrentUserDep = Annotated[TokenClaims, Depends(get_current_user)]
TempTokenDep = Annotated[TokenClaims, Depends(get_temp_token_claims)]
AdminDep = Annotated[TokenClaims, Depends(require_admin)]
