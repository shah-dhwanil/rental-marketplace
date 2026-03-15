"""FastAPI dependency providers for the addresses module."""
from typing import Annotated
from fastapi import Depends
from api.database import get_db_pool
from api.addresses.repository import AddressRepository
from api.addresses.service import AddressService


def get_address_repository() -> AddressRepository:
    return AddressRepository(get_db_pool())


def get_address_service(
    repo: Annotated[AddressRepository, Depends(get_address_repository)],
) -> AddressService:
    return AddressService(repo)


AddressServiceDep = Annotated[AddressService, Depends(get_address_service)]
