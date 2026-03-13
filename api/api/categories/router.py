"""Categories router."""

from typing import Optional

from fastapi import APIRouter, File, Query, UploadFile, status

from api.models.pagination import PaginatedResponse
from api.users.dependencies import AdminDep, CurrentUserDep
from api.categories.dependencies import CategoryServiceDep
from api.categories.models.requests import CreateCategoryRequest, UpdateCategoryRequest
from api.categories.models.responses import CategoryDetailResponse, CategoryResponse

router = APIRouter(prefix="/api/v1/categories", tags=["Categories"])


@router.get("", response_model=PaginatedResponse[CategoryResponse], summary="List categories")
async def list_categories(
    service: CategoryServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    parent_id: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=100),
):
    return await service.list_categories(page, page_size, parent_id, q)


@router.get("/{category_id}", response_model=CategoryDetailResponse, summary="Get category with children")
async def get_category(category_id: str, service: CategoryServiceDep):
    return await service.get_category(category_id)


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin — Create category",
)
async def create_category(
    body: CreateCategoryRequest, claims: AdminDep, service: CategoryServiceDep
):
    return await service.create_category(body)


@router.patch("/{category_id}", response_model=CategoryResponse, summary="Admin — Update category")
async def update_category(
    category_id: str,
    body: UpdateCategoryRequest,
    claims: AdminDep,
    service: CategoryServiceDep,
):
    return await service.update_category(category_id, body)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin — Delete category",
)
async def delete_category(category_id: str, claims: AdminDep, service: CategoryServiceDep):
    await service.delete_category(category_id)


@router.post("/{category_id}/image", summary="Admin — Upload category image")
async def upload_image(
    category_id: str,
    claims: AdminDep,
    service: CategoryServiceDep,
    file: UploadFile = File(...),
):
    file_bytes = await file.read()
    url = await service.upload_image(category_id, file_bytes, file.content_type or "")
    return {"image_url": url}


@router.delete(
    "/{category_id}/image",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin — Delete category image",
)
async def delete_image(category_id: str, claims: AdminDep, service: CategoryServiceDep):
    await service.delete_image(category_id)
