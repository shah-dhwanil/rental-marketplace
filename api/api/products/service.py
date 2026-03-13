"""Product and Device service — business logic for the products domain."""

import json
from typing import Optional
from uuid import UUID

import structlog

from api.cloudinary import CloudinaryClient
from api.exceptions.app import AppException, ErrorTypes, UnkownAppException
from api.models.pagination import PaginatedResponse
from api.categories.repository import CategoryRepository
from api.products.exceptions import (
    DeviceNotFoundException,
    ProductImageLimitException,
    ProductImageUploadException,
    ProductNotFoundException,
    ProductOwnershipException,
)
from api.products.models.requests import (
    CreateDeviceRequest,
    CreateProductRequest,
    UpdateDeviceRequest,
    UpdateProductRequest,
)
from api.products.models.responses import DeviceResponse, ProductResponse, ProductSummaryResponse
from api.products.repository import ProductRepository

logger = structlog.get_logger(__name__)

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
_MAX_IMAGES_PER_PRODUCT = 8


def _row_to_product(row: dict) -> ProductResponse:
    props = row.get("properties") or {}
    if isinstance(props, str):
        props = json.loads(props)
    return ProductResponse(
        id=str(row["id"]),
        name=row["name"],
        description=row["description"],
        properties=props,
        image_urls=list(row.get("image_urls") or []),
        reserved_qty=row["reserved_qty"],
        category_id=str(row["category_id"]),
        vendor_id=str(row["vendor_id"]),
        price_day=row["price_day"],
        price_week=row["price_week"],
        price_month=row["price_month"],
        security_deposit=row["security_deposit"],
        defect_charge=row["defect_charge"],
        is_active=row["is_active"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_summary(row: dict) -> ProductSummaryResponse:
    return ProductSummaryResponse(
        id=str(row["id"]),
        name=row["name"],
        image_urls=list(row.get("image_urls") or []),
        category_id=str(row["category_id"]),
        vendor_id=str(row["vendor_id"]),
        price_day=row["price_day"],
        is_active=row["is_active"],
        reserved_qty=row["reserved_qty"],
        created_at=row["created_at"],
    )


def _row_to_device(row: dict) -> DeviceResponse:
    props = row.get("properties") or {}
    if isinstance(props, str):
        props = json.loads(props)
    return DeviceResponse(
        id=str(row["id"]),
        product_id=str(row["product_id"]),
        serial_no=row.get("serial_no"),
        condition=row["condition"],
        properties=props,
        is_active=row["is_active"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class ProductService:
    def __init__(
        self,
        repo: ProductRepository,
        category_repo: CategoryRepository,
        cloudinary: CloudinaryClient,
    ) -> None:
        self._repo = repo
        self._category_repo = category_repo
        self._cloudinary = cloudinary

    # -----------------------------------------------------------------------
    # Products
    # -----------------------------------------------------------------------

    async def create_product(self, vendor_id: str, data: CreateProductRequest) -> ProductResponse:
        try:
            category = await self._category_repo.find_by_id(UUID(data.category_id))
            if not category:
                raise AppException(ErrorTypes.ResourceNotFound, "Category not found", resource="category")

            row = await self._repo.create_product({
                "name": data.name,
                "description": data.description,
                "properties": data.properties,
                "category_id": UUID(data.category_id),
                "vendor_id": UUID(vendor_id),
                "price_day": data.price_day,
                "price_week": data.price_week,
                "price_month": data.price_month,
                "security_deposit": data.security_deposit,
                "defect_charge": data.defect_charge,
                "is_active": data.is_active,
            })
            logger.info("product_created", product_id=str(row["id"]), vendor_id=vendor_id)
            return _row_to_product(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("create_product_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_products(
        self,
        page: int,
        page_size: int,
        vendor_id: Optional[str] = None,
        category_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        q: Optional[str] = None,
    ) -> PaginatedResponse[ProductSummaryResponse]:
        try:
            vid = UUID(vendor_id) if vendor_id else None
            cid = UUID(category_id) if category_id else None
            rows, total = await self._repo.list_products(page, page_size, vid, cid, is_active, q)
            return PaginatedResponse(
                items=[_row_to_summary(r) for r in rows],
                total=total,
                page=page,
                page_size=page_size,
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_products_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def get_product(self, product_id: str) -> ProductResponse:
        try:
            row = await self._repo.find_by_id(UUID(product_id))
            if not row:
                raise ProductNotFoundException(product_id)
            return _row_to_product(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_product_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def update_product(
        self, product_id: str, vendor_id: Optional[str], data: UpdateProductRequest
    ) -> ProductResponse:
        try:
            row = await self._repo.find_by_id(UUID(product_id))
            if not row:
                raise ProductNotFoundException(product_id)
            if vendor_id and str(row["vendor_id"]) != vendor_id:
                raise ProductOwnershipException()

            fields: dict = {}
            if data.name is not None:
                fields["name"] = data.name
            if data.description is not None:
                fields["description"] = data.description
            if data.properties is not None:
                fields["properties"] = json.dumps(data.properties)
            if data.category_id is not None:
                category = await self._category_repo.find_by_id(UUID(data.category_id))
                if not category:
                    raise AppException(ErrorTypes.ResourceNotFound, "Category not found", resource="category")
                fields["category_id"] = UUID(data.category_id)
            if data.price_day is not None:
                fields["price_day"] = data.price_day
            if data.price_week is not None:
                fields["price_week"] = data.price_week
            if data.price_month is not None:
                fields["price_month"] = data.price_month
            if data.security_deposit is not None:
                fields["security_deposit"] = data.security_deposit
            if data.defect_charge is not None:
                fields["defect_charge"] = data.defect_charge
            if data.is_active is not None:
                fields["is_active"] = data.is_active

            updated = await self._repo.update_product(UUID(product_id), fields)
            return _row_to_product(updated)
        except AppException:
            raise
        except Exception as exc:
            logger.error("update_product_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_product(self, product_id: str, vendor_id: Optional[str]) -> None:
        try:
            row = await self._repo.find_by_id(UUID(product_id))
            if not row:
                raise ProductNotFoundException(product_id)
            if vendor_id and str(row["vendor_id"]) != vendor_id:
                raise ProductOwnershipException()
            await self._repo.soft_delete_product(UUID(product_id))
            logger.info("product_deleted", product_id=product_id, vendor_id=vendor_id)
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_product_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def upload_product_image(
        self, product_id: str, vendor_id: Optional[str], file_bytes: bytes, content_type: str
    ) -> ProductResponse:
        try:
            if content_type not in _ALLOWED_IMAGE_TYPES:
                raise AppException(
                    ErrorTypes.InputValidationError,
                    f"Unsupported file type: {content_type}",
                    field="file",
                )
            if len(file_bytes) > _MAX_IMAGE_BYTES:
                raise AppException(
                    ErrorTypes.InputValidationError,
                    "File too large. Maximum 10 MB",
                    field="file",
                )

            row = await self._repo.find_by_id(UUID(product_id))
            if not row:
                raise ProductNotFoundException(product_id)
            if vendor_id and str(row["vendor_id"]) != vendor_id:
                raise ProductOwnershipException()

            current_images = list(row.get("image_urls") or [])
            if len(current_images) >= _MAX_IMAGES_PER_PRODUCT:
                raise ProductImageLimitException(_MAX_IMAGES_PER_PRODUCT)

            try:
                result = self._cloudinary.upload_image(
                    file_bytes,
                    folder=f"products/{product_id}",
                )
            except Exception as exc:
                raise ProductImageUploadException() from exc

            updated = await self._repo.append_image(UUID(product_id), result.secure_url, result.public_id)
            return _row_to_product(updated)
        except AppException:
            raise
        except Exception as exc:
            logger.error("upload_product_image_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_product_image(
        self, product_id: str, vendor_id: Optional[str], index: int
    ) -> ProductResponse:
        try:
            row = await self._repo.find_by_id(UUID(product_id))
            if not row:
                raise ProductNotFoundException(product_id)
            if vendor_id and str(row["vendor_id"]) != vendor_id:
                raise ProductOwnershipException()

            image_ids = list(row.get("image_ids") or [])
            image_urls = list(row.get("image_urls") or [])
            if index < 0 or index >= len(image_urls):
                raise AppException(
                    ErrorTypes.InvalidOperation,
                    "Image index out of range",
                    resource="product",
                )

            removed_id = image_ids[index] if index < len(image_ids) else None
            if removed_id:
                try:
                    self._cloudinary.delete_image(removed_id)
                except Exception:
                    logger.warning("failed_to_delete_product_image", product_id=product_id, index=index)

            updated = await self._repo.remove_image_at(UUID(product_id), index)
            return _row_to_product(updated)
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_product_image_failed", exc_info=True)
            raise UnkownAppException() from exc

    # -----------------------------------------------------------------------
    # Devices
    # -----------------------------------------------------------------------

    async def create_device(self, vendor_id: Optional[str], data: CreateDeviceRequest) -> DeviceResponse:
        try:
            product = await self._repo.find_by_id(UUID(data.product_id))
            if not product:
                raise ProductNotFoundException(data.product_id)
            if vendor_id and str(product["vendor_id"]) != vendor_id:
                raise ProductOwnershipException()

            row = await self._repo.create_device({
                "product_id": UUID(data.product_id),
                "serial_no": data.serial_no,
                "condition": data.condition,
                "properties": data.properties,
                "is_active": data.is_active,
            })
            logger.info("device_created", device_id=str(row["id"]), product_id=data.product_id)
            return _row_to_device(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("create_device_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_devices(
        self,
        vendor_id: Optional[str],
        page: int,
        page_size: int,
        product_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> PaginatedResponse[DeviceResponse]:
        try:
            # If product_id provided, verify vendor owns the product (skip for admin)
            pid: Optional[UUID] = None
            if product_id:
                product = await self._repo.find_by_id(UUID(product_id))
                if not product:
                    raise ProductNotFoundException(product_id)
                if vendor_id and str(product["vendor_id"]) != vendor_id:
                    raise ProductOwnershipException()
                pid = UUID(product_id)

            rows, total = await self._repo.list_devices(page, page_size, pid, is_active)
            return PaginatedResponse(
                items=[_row_to_device(r) for r in rows],
                total=total,
                page=page,
                page_size=page_size,
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_devices_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def get_device(self, device_id: str, vendor_id: Optional[str]) -> DeviceResponse:
        try:
            device = await self._repo.find_device_by_id(UUID(device_id))
            if not device:
                raise DeviceNotFoundException(device_id)
            product = await self._repo.find_by_id(UUID(str(device["product_id"])))
            if not product or (vendor_id and str(product["vendor_id"]) != vendor_id):
                raise ProductOwnershipException()
            return _row_to_device(device)
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_device_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def update_device(
        self, device_id: str, vendor_id: Optional[str], data: UpdateDeviceRequest
    ) -> DeviceResponse:
        try:
            device = await self._repo.find_device_by_id(UUID(device_id))
            if not device:
                raise DeviceNotFoundException(device_id)
            product = await self._repo.find_by_id(UUID(str(device["product_id"])))
            if not product or (vendor_id and str(product["vendor_id"]) != vendor_id):
                raise ProductOwnershipException()

            fields: dict = {}
            if data.serial_no is not None:
                fields["serial_no"] = data.serial_no
            if data.condition is not None:
                fields["condition"] = data.condition
            if data.properties is not None:
                fields["properties"] = json.dumps(data.properties)
            if data.is_active is not None:
                fields["is_active"] = data.is_active

            updated = await self._repo.update_device(UUID(device_id), fields)
            return _row_to_device(updated)
        except AppException:
            raise
        except Exception as exc:
            logger.error("update_device_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_device(self, device_id: str, vendor_id: Optional[str]) -> None:
        try:
            device = await self._repo.find_device_by_id(UUID(device_id))
            if not device:
                raise DeviceNotFoundException(device_id)
            product = await self._repo.find_by_id(UUID(str(device["product_id"])))
            if not product or (vendor_id and str(product["vendor_id"]) != vendor_id):
                raise ProductOwnershipException()
            await self._repo.soft_delete_device(UUID(device_id))
            logger.info("device_deleted", device_id=device_id)
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_device_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def get_product_device_count(
        self, product_id: str, vendor_id: Optional[str]
    ) -> int:
        try:
            product = await self._repo.find_by_id(UUID(product_id))
            if not product:
                raise ProductNotFoundException(product_id)
            if vendor_id and str(product["vendor_id"]) != vendor_id:
                raise ProductOwnershipException()
            return await self._repo.count_devices_for_product(UUID(product_id))
        except AppException:
            raise
        except Exception as exc:
            raise UnkownAppException() from exc
