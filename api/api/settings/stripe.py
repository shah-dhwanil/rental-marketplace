"""Stripe payment gateway configuration."""
import structlog
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = structlog.get_logger(__name__)

_DUMMY_KEY = "sk_test_dummy_key_replace_in_production"


class StripeConfig(BaseSettings):
    SECRET_KEY: str = _DUMMY_KEY
    PUBLISHABLE_KEY: str = "pk_test_dummy_key_replace_in_production"
    WEBHOOK_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_prefix="RENTAL_STRIPE__",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    def model_post_init(self, __context) -> None:
        if self.SECRET_KEY == _DUMMY_KEY:
            logger.warning(
                "stripe_key_not_configured",
                message="RENTAL_STRIPE__SECRET_KEY not set — using dummy key. Payments will fail.",
            )
