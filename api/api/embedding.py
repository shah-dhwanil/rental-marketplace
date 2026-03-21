"""Embedding service for generating vector embeddings using OpenAI API."""

import httpx
import structlog
from typing import Optional

from api.settings.settings import get_settings

logger = structlog.get_logger(__name__)


class EmbeddingService:
    """Service for generating text embeddings using OpenAI API."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small") -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.openai.com/v1/embeddings"
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding vector for the given text.

        Args:
            text: Input text to generate embedding for

        Returns:
            List of float values representing the embedding vector

        Raises:
            httpx.HTTPError: If API request fails
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding generation")
            # Return zero vector for empty text
            return [0.0] * get_settings().SEARCH.EMBEDDING_DIMENSION

        try:
            client = await self._get_client()
            response = await client.post(
                self.base_url,
                json={
                    "model": self.model,
                    "input": text,
                    "encoding_format": "float",
                },
            )
            response.raise_for_status()
            data = response.json()
            embedding = data["data"][0]["embedding"]

            logger.info(
                "embedding_generated",
                text_length=len(text),
                embedding_dimension=len(embedding),
            )
            return embedding

        except httpx.HTTPError as e:
            logger.error(
                "embedding_generation_failed",
                error=str(e),
                text_length=len(text),
            )
            raise

    async def generate_product_embedding(
        self, name: str, description: str, category_name: str = ""
    ) -> list[float]:
        """
        Generate embedding for a product based on name, description, and category.

        Args:
            name: Product name
            description: Product description
            category_name: Category name (given higher weight)

        Returns:
            List of float values representing the embedding vector
        """
        # Combine category, name and description with category having highest importance
        # Format: category (3x weight) + name (2x weight) + description (1x weight)
        combined_parts = []

        if category_name:
            # Triple the category name for higher weight
            combined_parts.extend([category_name, category_name, category_name])

        if name:
            # Double the product name for high weight
            combined_parts.extend([name, name])

        if description:
            # Single instance of description for base weight
            combined_parts.append(description)

        combined_text = "\n".join(combined_parts)
        return await self.generate_embedding(combined_text)

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# Global embedding service instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """
    Get the global embedding service instance.
    Creates a new instance if one doesn't exist.

    Returns:
        EmbeddingService instance
    """
    global _embedding_service
    if _embedding_service is None:
        settings = get_settings()
        _embedding_service = EmbeddingService(
            api_key=settings.SEARCH.OPENAI_API_KEY,
            model=settings.SEARCH.EMBEDDING_MODEL,
        )
    return _embedding_service


async def close_embedding_service() -> None:
    """Close the global embedding service instance."""
    global _embedding_service
    if _embedding_service is not None:
        await _embedding_service.close()
        _embedding_service = None
