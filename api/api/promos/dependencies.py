"""FastAPI dependency providers for the promos module."""
from typing import Annotated
from fastapi import Depends
from api.database import get_db_pool
from api.promos.repository import PromoRepository
from api.promos.service import PromoService


def get_promo_repository() -> PromoRepository:
    return PromoRepository(get_db_pool())


def get_promo_service(
    repo: Annotated[PromoRepository, Depends(get_promo_repository)],
) -> PromoService:
    return PromoService(repo)


PromoServiceDep = Annotated[PromoService, Depends(get_promo_service)]
