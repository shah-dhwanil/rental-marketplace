"""Products and Devices router."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, File, Query, UploadFile, status

from api.models.pagination import PaginatedResponse
from api.products.dependencies import ProductServiceDep, VendorDep, VendorOrAdminDep
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

router = APIRouter(tags=["Products & Devices"])


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@router.get(
    "/api/v1/products",
    response_model=PaginatedResponse[ProductSummaryResponse],
    summary="List products (public)",
)
async def list_products(
    service: ProductServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category_id: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=100),
    start_date: Optional[date] = Query(default=None, description="Rental start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(default=None, description="Rental end date (YYYY-MM-DD)"),
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Latitude for geo filter"),
    lng: Optional[float] = Query(default=None, ge=-180, le=180, description="Longitude for geo filter"),
):
    radius_km = get_settings().SEARCH.GEOCODE_RADIUS_KM
    return await service.list_products(
        page, page_size,
        category_id=category_id, is_active=is_active, q=q,
        start_date=start_date, end_date=end_date,
        lat=lat, lng=lng, radius_km=radius_km,
    )


@router.get(
    "/api/v1/products/vendor/me",
    response_model=PaginatedResponse[ProductSummaryResponse],
    summary="Vendor — List own products",
)
async def list_my_products(
    claims: VendorDep,
    service: ProductServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category_id: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=100),
):
    return await service.list_products(
        page, page_size, vendor_id=claims.user_id, category_id=category_id, is_active=is_active, q=q
    )


@router.get(
    "/api/v1/products/{product_id}",
    response_model=ProductResponse,
    summary="Get product by ID",
)
async def get_product(product_id: str, service: ProductServiceDep):
    return await service.get_product(product_id)


@router.post(
    "/api/v1/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Vendor — Create product",
)
async def create_product(body: CreateProductRequest, claims: VendorDep, service: ProductServiceDep):
    return await service.create_product(claims.user_id, body)


@router.patch(
    "/api/v1/products/{product_id}",
    response_model=ProductResponse,
    summary="Vendor/Admin — Update product",
)
async def update_product(
    product_id: str, body: UpdateProductRequest, claims: VendorOrAdminDep, service: ProductServiceDep
):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    return await service.update_product(product_id, vendor_id, body)


@router.delete(
    "/api/v1/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Vendor/Admin — Delete product",
)
async def delete_product(product_id: str, claims: VendorOrAdminDep, service: ProductServiceDep):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    await service.delete_product(product_id, vendor_id)


@router.post(
    "/api/v1/products/{product_id}/images",
    response_model=ProductResponse,
    summary="Vendor/Admin — Upload product image",
)
async def upload_product_image(
    product_id: str,
    claims: VendorOrAdminDep,
    service: ProductServiceDep,
    file: UploadFile = File(...),
):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    file_bytes = await file.read()
    return await service.upload_product_image(product_id, vendor_id, file_bytes, file.content_type or "")


@router.delete(
    "/api/v1/products/{product_id}/images/{index}",
    response_model=ProductResponse,
    summary="Vendor/Admin — Remove product image by index",
)
async def delete_product_image(
    product_id: str, index: int, claims: VendorOrAdminDep, service: ProductServiceDep
):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    return await service.delete_product_image(product_id, vendor_id, index)


@router.post(
    "/api/v1/products/{product_id}/calculate-price",
    response_model=PriceCalculationResponse,
    summary="Calculate rental price for a product (public)",
)
async def calculate_price(product_id: str, body: CalculatePriceRequest, service: ProductServiceDep):
    """
    Calculate the rental price for a product based on the rental period.

    Pricing logic with round-off:
    - <7 days: daily rate
    - ≥7 days and <30 days: weekly rate (rounded up, e.g., 2 weeks 2 days = 3 weeks)
    - ≥30 days: monthly rate (rounded up, e.g., 1 month 5 days = 2 months)
    """
    return await service.calculate_price(product_id, body)


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------

@router.get(
    "/api/v1/devices",
    response_model=PaginatedResponse[DeviceResponse],
    summary="Vendor/Admin — List devices",
)
async def list_devices(
    claims: VendorOrAdminDep,
    service: ProductServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    product_id: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    return await service.list_devices(vendor_id, page, page_size, product_id, is_active)


@router.get(
    "/api/v1/devices/{device_id}",
    response_model=DeviceResponse,
    summary="Vendor/Admin — Get device",
)
async def get_device(device_id: str, claims: VendorOrAdminDep, service: ProductServiceDep):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    return await service.get_device(device_id, vendor_id)


@router.post(
    "/api/v1/devices",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Vendor/Admin — Create device",
)
async def create_device(body: CreateDeviceRequest, claims: VendorOrAdminDep, service: ProductServiceDep):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    return await service.create_device(vendor_id, body)


@router.patch(
    "/api/v1/devices/{device_id}",
    response_model=DeviceResponse,
    summary="Vendor/Admin — Update device",
)
async def update_device(
    device_id: str, body: UpdateDeviceRequest, claims: VendorOrAdminDep, service: ProductServiceDep
):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    return await service.update_device(device_id, vendor_id, body)


@router.delete(
    "/api/v1/devices/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Vendor/Admin — Delete device",
)
async def delete_device(device_id: str, claims: VendorOrAdminDep, service: ProductServiceDep):
    vendor_id = claims.user_id if claims.role == "vendor" else None
    await service.delete_device(device_id, vendor_id)
