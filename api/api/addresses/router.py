"""Addresses router."""
from fastapi import APIRouter, status
from api.users.dependencies import CurrentUserDep
from api.addresses.dependencies import AddressServiceDep
from api.addresses.models.requests import CreateAddressRequest, UpdateAddressRequest
from api.addresses.models.responses import AddressResponse
from api.exceptions.app import AppException, ErrorTypes

router = APIRouter(prefix="/api/v1/addresses", tags=["Addresses"])


def _require_customer(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role != "customer":
        raise AppException(ErrorTypes.NotEnoughPermission, "Customer access required")
    return claims


@router.get("", response_model=list[AddressResponse], summary="List my delivery addresses")
async def list_addresses(claims: CurrentUserDep, service: AddressServiceDep):
    _require_customer(claims)
    return await service.list_addresses(claims.user_id)


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED, summary="Add delivery address")
async def create_address(body: CreateAddressRequest, claims: CurrentUserDep, service: AddressServiceDep):
    _require_customer(claims)
    return await service.create_address(claims.user_id, body)


@router.get("/{address_id}", response_model=AddressResponse, summary="Get address")
async def get_address(address_id: str, claims: CurrentUserDep, service: AddressServiceDep):
    _require_customer(claims)
    return await service.get_address(address_id, claims.user_id)


@router.patch("/{address_id}", response_model=AddressResponse, summary="Update address")
async def update_address(address_id: str, body: UpdateAddressRequest, claims: CurrentUserDep, service: AddressServiceDep):
    _require_customer(claims)
    return await service.update_address(address_id, claims.user_id, body)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete address")
async def delete_address(address_id: str, claims: CurrentUserDep, service: AddressServiceDep):
    _require_customer(claims)
    await service.delete_address(address_id, claims.user_id)
