"""Address service — business logic for delivery addresses."""
from typing import Optional
from uuid import UUID

import structlog

from api.exceptions.app import UnkownAppException, AppException
from api.addresses.exceptions import AddressNotFoundException, AddressAccessDeniedException
from api.addresses.models.requests import CreateAddressRequest, UpdateAddressRequest
from api.addresses.models.responses import AddressResponse
from api.addresses.repository import AddressRepository

logger = structlog.get_logger(__name__)


def _row_to_response(row: dict) -> AddressResponse:
    return AddressResponse(
        id=str(row["id"]),
        customer_id=str(row["customer_id"]),
        name=row["name"],
        person_name=row["person_name"],
        contact_no=row["contact_no"],
        address=row["address"],
        city=row["city"],
        pincode=row["pincode"],
        lat=float(row["lat"]),
        lng=float(row["lng"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class AddressService:
    def __init__(self, repo: AddressRepository) -> None:
        self._repo = repo

    async def create_address(self, customer_id: str, data: CreateAddressRequest) -> AddressResponse:
        try:
            row = await self._repo.create_address({
                "customer_id": UUID(customer_id),
                "name": data.name,
                "person_name": data.person_name,
                "contact_no": data.contact_no,
                "address": data.address,
                "city": data.city,
                "pincode": data.pincode,
                "lat": data.lat,
                "lng": data.lng,
            })
            logger.info("address_created", address_id=str(row["id"]), customer_id=customer_id)
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("create_address_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_addresses(self, customer_id: str) -> list[AddressResponse]:
        try:
            rows = await self._repo.list_by_customer(UUID(customer_id))
            return [_row_to_response(r) for r in rows]
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_addresses_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def get_address(self, address_id: str, customer_id: str) -> AddressResponse:
        try:
            row = await self._repo.find_by_id(UUID(address_id))
            if not row:
                raise AddressNotFoundException(address_id)
            if str(row["customer_id"]) != customer_id:
                raise AddressAccessDeniedException()
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_address_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def update_address(
        self, address_id: str, customer_id: str, data: UpdateAddressRequest
    ) -> AddressResponse:
        try:
            existing = await self._repo.find_by_id(UUID(address_id))
            if not existing:
                raise AddressNotFoundException(address_id)
            if str(existing["customer_id"]) != customer_id:
                raise AddressAccessDeniedException()
            fields = {}
            lat = lng = None
            if data.name is not None:
                fields["name"] = data.name
            if data.person_name is not None:
                fields["person_name"] = data.person_name
            if data.contact_no is not None:
                fields["contact_no"] = data.contact_no
            if data.address is not None:
                fields["address"] = data.address
            if data.city is not None:
                fields["city"] = data.city
            if data.pincode is not None:
                fields["pincode"] = data.pincode
            if data.lat is not None and data.lng is not None:
                lat, lng = data.lat, data.lng
            row = await self._repo.update_address(UUID(address_id), fields, lat=lat, lng=lng)
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("update_address_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_address(self, address_id: str, customer_id: str) -> None:
        try:
            existing = await self._repo.find_by_id(UUID(address_id))
            if not existing:
                raise AddressNotFoundException(address_id)
            if str(existing["customer_id"]) != customer_id:
                raise AddressAccessDeniedException()
            await self._repo.soft_delete(UUID(address_id))
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_address_failed", exc_info=True)
            raise UnkownAppException() from exc
