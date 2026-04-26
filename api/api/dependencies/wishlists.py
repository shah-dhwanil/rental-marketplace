"""FastAPI dependency providers for the wishlists module."""
from typing import Annotated
from fastapi import Depends
from api.database import get_db_pool
from api.repository.wishlists import WishlistRepository
from api.service.wishlists import WishlistService


def get_wishlist_repository() -> WishlistRepository:
    return WishlistRepository(get_db_pool())


def get_wishlist_service(
    repo: Annotated[WishlistRepository, Depends(get_wishlist_repository)],
) -> WishlistService:
    return WishlistService(repo)


WishlistServiceDep = Annotated[WishlistService, Depends(get_wishlist_service)]
