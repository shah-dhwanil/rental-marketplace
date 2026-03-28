from pydantic import Field
from pydantic_settings import BaseSettings


class SearchConfig(BaseSettings):
    GEOCODE_RADIUS_KM: float = Field(
        default=20.0,
        description="Default search radius in km for geo-filtered product listings",
    )

    # Embedding / Vector Search settings
    OPENAI_API_KEY: str = Field(
        default="",
        description="OpenAI API key for generating embeddings",
    )
    EMBEDDING_MODEL: str = Field(
        default="text-embedding-3-small",
        description="OpenAI embedding model to use (text-embedding-3-small or text-embedding-3-large)",
    )
    EMBEDDING_DIMENSION: int = Field(
        default=1536,
        description="Dimension of the embedding vectors (1536 for text-embedding-3-small, 3072 for large)",
    )

    # Hybrid search weights (rebalanced for category-enhanced search)
    FTS_WEIGHT: float = Field(
        default=0.6,
        description="Weight for full-text search score in hybrid search (0-1) - increased due to category weighting",
    )
    VECTOR_WEIGHT: float = Field(
        default=0.4,
        description="Weight for vector similarity score in hybrid search (0-1) - decreased to balance with enhanced FTS",
    )
    MIN_RELEVANCE_THRESHOLD: float = Field(
        default=0.1,
        description="Minimum combined relevance score threshold for hybrid search results (0-1) - filters out irrelevant results",
    )
