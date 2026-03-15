"""FastAPI dependency providers for the orders module."""
from typing import Annotated
from fastapi import Depends
from api.database import get_db_pool
from api.orders.repository import OrderRepository
from api.orders.service import OrderService
from api.products.repository import ProductRepository
from api.addresses.repository import AddressRepository
from api.promos.repository import PromoRepository
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
