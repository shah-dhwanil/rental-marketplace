"""FastAPI dependency providers for the categories module."""

from typing import Annotated

from fastapi import Depends

from api.cloudinary import get_cloudinary_client
from api.database import get_db_pool
from api.categories.repository import CategoryRepository
from api.categories.service import CategoryService


def get_category_repository() -> CategoryRepository:
    return CategoryRepository(get_db_pool())


def get_category_service(
    repo: Annotated[CategoryRepository, Depends(get_category_repository)],
) -> CategoryService:
    return CategoryService(repo, get_cloudinary_client())


CategoryServiceDep = Annotated[CategoryService, Depends(get_category_service)]
