"""Product and Device service — business logic for the products domain."""

import json
import math
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional
from uuid import UUID

from api.products.repository import ProductRepository
import structlog

from api.cloudinary import CloudinaryClient
from api.embedding import EmbeddingService
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
    CalculatePriceRequest,
    CreateDeviceRequest,
    CreateProductRequest,
    UpdateDeviceRequest,
    UpdateProductRequest,
)
from api.products.models.responses import (
    DeviceResponse,
    PriceCalculationResponse,
    ProductResponse,
    ProductSummaryResponse,
)
from api.settings.settings import get_settings

logger = structlog.get_logger(__name__)

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
_MAX_IMAGES_PER_PRODUCT = 8


def _calculate_rental_days(start: date, end: date) -> int:
    """Calculate number of rental days (inclusive)."""
    return (end - start).days + 1


def _calculate_rental_amount_with_roundoff(
    price_day: Decimal, price_week: Decimal, price_month: Decimal, days: int
) -> tuple[Decimal, str, str]:
    """
    Calculate rental amount with roundoff logic.

    Rules:
    - <7 days: use daily rate
    - ≥7 days and <30 days: use weekly rate (round up, e.g., 2 weeks 2 days = 3 weeks)
    - ≥30 days: use monthly rate (round up, e.g., 1 month 5 days = 2 months)

    Returns: (amount, tier, breakdown)
    - tier: "daily" | "weekly" | "monthly"
    - breakdown: human-readable explanation like "3 weeks × ₹500"
    """
    if days < 7:
        # Daily rate
        amount = price_day * days
        tier = "daily"
        breakdown = f"{days} day{'s' if days != 1 else ''} × ₹{price_day:,.0f}"
    elif days < 30:
        # Weekly rate with roundoff
        weeks = math.ceil(days / 7)
        amount = price_week * weeks
        tier = "weekly"
        breakdown = f"{weeks} week{'s' if weeks != 1 else ''} × ₹{price_week:,.0f}"
    else:
        # Monthly rate with roundoff
        months = math.ceil(days / 30)
        amount = price_month * months
        tier = "monthly"
        breakdown = f"{months} month{'s' if months != 1 else ''} × ₹{price_month:,.0f}"

    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), tier, breakdown


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
        embedding_service: EmbeddingService,
    ) -> None:
        self._repo = repo
        self._category_repo = category_repo
        self._cloudinary = cloudinary
        self._embedding_service = embedding_service

    # -----------------------------------------------------------------------
    # Products
    # -----------------------------------------------------------------------

    async def create_product(self, vendor_id: str, data: CreateProductRequest) -> ProductResponse:
        try:
            category = await self._category_repo.find_by_id(UUID(data.category_id))
            if not category:
                raise AppException(ErrorTypes.ResourceNotFound, "Category not found", resource="category")

            # Generate embedding for product including category name
            embedding = await self._embedding_service.generate_product_embedding(
                data.name, data.description, category["name"]
            )

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
                "embedding": embedding,
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
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius_km: Optional[float] = None,
        fts_weight: Optional[float] = None,
        vector_weight: Optional[float] = None,
    ) -> PaginatedResponse[ProductSummaryResponse]:
        try:
            vid = UUID(vendor_id) if vendor_id else None
            cid = UUID(category_id) if category_id else None

            # Use settings defaults if weights not provided
            settings = get_settings()
            fts_weight = fts_weight if fts_weight is not None else settings.SEARCH.FTS_WEIGHT
            vector_weight = vector_weight if vector_weight is not None else settings.SEARCH.VECTOR_WEIGHT
            min_relevance_threshold = settings.SEARCH.MIN_RELEVANCE_THRESHOLD

            # Generate query embedding if search query is provided
            query_embedding = None
            if q:
                try:
                    query_embedding = await self._embedding_service.generate_embedding(q)
                    logger.info("query_embedding_generated", query=q)
                except Exception as e:
                    logger.warning("query_embedding_failed", error=str(e), query=q)
                    # Continue without embedding - will fallback to basic ILIKE search

            rows, total = await self._repo.list_products(
                page, page_size, vid, cid, is_active, q, query_embedding,
                start_date, end_date, lat, lng, radius_km, fts_weight, vector_weight, min_relevance_threshold,
            )
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
            name_changed = False
            desc_changed = False
            category_changed = False
            current_category = None

            if data.name is not None:
                fields["name"] = data.name
                name_changed = True
            if data.description is not None:
                fields["description"] = data.description
                desc_changed = True
            if data.properties is not None:
                fields["properties"] = json.dumps(data.properties)
            if data.category_id is not None:
                category = await self._category_repo.find_by_id(UUID(data.category_id))
                if not category:
                    raise AppException(ErrorTypes.ResourceNotFound, "Category not found", resource="category")
                fields["category_id"] = UUID(data.category_id)
                current_category = category
                category_changed = True
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

            # Regenerate embedding if name, description, or category changed
            if name_changed or desc_changed or category_changed:
                current_name = data.name if name_changed else row["name"]
                current_desc = data.description if desc_changed else row["description"]

                # Get category name - use new category if changed, else fetch current
                if category_changed and current_category:
                    current_category_name = current_category["name"]
                else:
                    # Fetch current category name
                    current_category_row = await self._category_repo.find_by_id(row["category_id"])
                    current_category_name = current_category_row["name"] if current_category_row else ""

                try:
                    embedding = await self._embedding_service.generate_product_embedding(
                        current_name, current_desc, current_category_name
                    )
                    fields["embedding"] = embedding
                    logger.info("product_embedding_regenerated", product_id=product_id)
                except Exception as e:
                    logger.warning("embedding_regeneration_failed", error=str(e), product_id=product_id)
                    # Continue without updating embedding

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

    # -----------------------------------------------------------------------
    # Price Calculation
    # -----------------------------------------------------------------------

    async def calculate_price(
        self, product_id: str, data: CalculatePriceRequest
    ) -> PriceCalculationResponse:
        """Calculate rental price for a product based on rental period with roundoff logic."""
        try:
            product = await self._repo.find_by_id(UUID(product_id))
            if not product or not product.get("is_active") or product.get("is_deleted"):
                raise ProductNotFoundException(product_id)

            days = _calculate_rental_days(data.start_date, data.end_date)
            if days <= 0:
                raise AppException(
                    ErrorTypes.InputValidationError,
                    "end_date must be after start_date",
                    field="end_date",
                )

            rental_amount, tier, breakdown = _calculate_rental_amount_with_roundoff(
                Decimal(str(product["price_day"])),
                Decimal(str(product["price_week"])),
                Decimal(str(product["price_month"])),
                days,
            )

            return PriceCalculationResponse(
                product_id=str(product["id"]),
                product_name=product["name"],
                rental_days=days,
                pricing_tier=tier,
                rental_amount=rental_amount,
                security_deposit=Decimal(str(product["security_deposit"])),
                defect_charge=Decimal(str(product["defect_charge"])),
                breakdown=breakdown,
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("calculate_price_failed", exc_info=True)
            raise UnkownAppException() from exc
