"""FastAPI dependency providers for the orders module."""
from typing import Annotated
from fastapi import Depends
from api.database import get_db_pool
from api.repository.orders import OrderRepository
from api.service.orders import OrderService
from api.repository.products import ProductRepository
from api.repository.addresses import AddressRepository
from api.repository.promos import PromoRepository
from api.settings import get_settings


def get_order_repository() -> OrderRepository:
    return OrderRepository(get_db_pool())


def get_order_service(
    order_repo: Annotated[OrderRepository, Depends(get_order_repository)],
) -> OrderService:
    settings = get_settings()
    return OrderService(
        order_repo=order_repo,
        product_repo=ProductRepository(get_db_pool()),
        address_repo=AddressRepository(get_db_pool()),
        promo_repo=PromoRepository(get_db_pool()),
        stripe_secret_key=settings.STRIPE.SECRET_KEY,
    )


OrderServiceDep = Annotated[OrderService, Depends(get_order_service)]
