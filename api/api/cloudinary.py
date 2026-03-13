"""
Cloudinary client setup and utility functions for media upload/delete.
"""

from dataclasses import dataclass
from typing import Optional

import cloudinary
import cloudinary.uploader
import structlog

from api.settings.cloudinary import CloudinaryConfig

logger = structlog.get_logger(__name__)


@dataclass
class UploadResult:
    public_id: str
    secure_url: str


class CloudinaryClient:
    """Thin wrapper around the Cloudinary SDK."""

    def upload_image(
        self,
        file_bytes: bytes,
        folder: str,
        public_id: Optional[str] = None,
    ) -> UploadResult:
        """Upload image bytes to Cloudinary and return public_id + secure_url."""
        options: dict = {"folder": folder, "resource_type": "image"}
        if public_id:
            options["public_id"] = public_id

        result = cloudinary.uploader.upload(file_bytes, **options)
        return UploadResult(
            public_id=result["public_id"],
            secure_url=result["secure_url"],
        )

    def delete_image(self, public_id: str) -> None:
        """Delete an image from Cloudinary by its public_id."""
        cloudinary.uploader.destroy(public_id, resource_type="image")


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------
_client: Optional[CloudinaryClient] = None


def init_cloudinary(config: CloudinaryConfig) -> CloudinaryClient:
    """Configure the Cloudinary SDK and return the singleton client."""
    global _client
    cloudinary.config(
        cloud_name=config.CLOUD_NAME,
        api_key=config.API_KEY,
        api_secret=config.API_SECRET,
        secure=True,
    )
    _client = CloudinaryClient()
    logger.info("Cloudinary client initialised")
    return _client


def get_cloudinary_client() -> CloudinaryClient:
    """Return the singleton Cloudinary client."""
    if _client is None:
        raise RuntimeError("Cloudinary client not initialised. Call init_cloudinary() first.")
    return _client
