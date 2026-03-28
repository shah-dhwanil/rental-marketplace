"""Review dependencies for FastAPI dependency injection."""
from typing import Annotated

from fastapi import Depends

from api.database import get_db_pool
from api.reviews.repository import ReviewRepository
from api.reviews.service import ReviewService


def get_review_repository() -> ReviewRepository:
    """Get review repository instance."""
    return ReviewRepository(get_db_pool())


def get_review_service(
    review_repo: ReviewRepository = Depends(get_review_repository),
) -> ReviewService:
    """Get review service instance."""
    return ReviewService(review_repo)


# Type aliases for dependency injection
ReviewRepositoryDep = Annotated[ReviewRepository, Depends(get_review_repository)]
ReviewServiceDep = Annotated[ReviewService, Depends(get_review_service)]
