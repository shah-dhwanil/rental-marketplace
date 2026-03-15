"""FastAPI dependency providers for the payments module."""
from typing import Annotated
from fastapi import Depends
from api.database import get_db_pool
from api.settings import get_settings
from api.payments.repository import PaymentMethodRepository
from api.payments.service import PaymentMethodService


def get_payment_repository() -> PaymentMethodRepository:
    return PaymentMethodRepository(get_db_pool())


def get_payment_service(
    repo: Annotated[PaymentMethodRepository, Depends(get_payment_repository)],
) -> PaymentMethodService:
    key = get_settings().ENCRYPTION.get_key_bytes()
    return PaymentMethodService(repo, key)


PaymentServiceDep = Annotated[PaymentMethodService, Depends(get_payment_service)]
