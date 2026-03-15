"""Encryption configuration — key for XChaCha20-Poly1305 payment-data encryption."""

import base64
import os

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class EncryptionConfig(BaseSettings):
    # 32-byte key encoded as URL-safe base64 (44 chars).
    # Generate with: base64.urlsafe_b64encode(os.urandom(32)).decode()
    PAYMENT_KEY: str = Field(
        default="",
        description="Base-64 encoded 32-byte XChaCha20-Poly1305 key for payment method encryption",
    )

    @field_validator("PAYMENT_KEY", mode="before")
    @classmethod
    def ensure_key(cls, v: str) -> str:
        if not v:
            # Dev fallback — generate ephemeral key with a loud warning.
            import structlog
            log = structlog.get_logger(__name__)
            log.warning(
                "encryption_key_missing",
                msg="RENTAL_ENCRYPTION__PAYMENT_KEY not set; using ephemeral key. "
                    "Payment methods will NOT be readable across restarts.",
            )
            return base64.urlsafe_b64encode(os.urandom(32)).decode()
        return v

    def get_key_bytes(self) -> bytes:
        """Decode the base64 key to raw 32 bytes."""
        return base64.urlsafe_b64decode(self.PAYMENT_KEY + "==")
