"""SlowAPI-based rate limiting utilities.

This module centralizes limiter configuration so routes can opt-in with
per-endpoint limits that are configurable via settings/env.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address


def build_limiter() -> Limiter:
    # Keying by remote address is the common default for public endpoints.
    return Limiter(key_func=get_remote_address)


limiter: Limiter = build_limiter()

