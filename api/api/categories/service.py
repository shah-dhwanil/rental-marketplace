"""Category service — business logic for the categories domain."""

import re
from typing import Optional
from uuid import UUID

import structlog

from api.cloudinary import CloudinaryClient
from api.exceptions.app import AppException, ErrorTypes, UnkownAppException
from api.models.pagination import PaginatedResponse
from api.categories.exceptions import (
    CategoryAlreadyExistsException,
    CategoryImageUploadException,
    CategoryNotFoundException,
)
from api.categories.models.requests import CreateCategoryRequest, UpdateCategoryRequest
from api.categories.models.responses import CategoryDetailResponse, CategoryResponse
from api.categories.repository import CategoryRepository

logger = structlog.get_logger(__name__)

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def _row_to_response(row: dict) -> CategoryResponse:
    return CategoryResponse(
        id=str(row["id"]),
        name=row["name"],
        slug=row["slug"],
        description=row["description"],
        parent_category_id=str(row["parent_category_id"]) if row.get("parent_category_id") else None,
        image_url=row.get("image_url"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class CategoryService:
    def __init__(self, repo: CategoryRepository, cloudinary: CloudinaryClient) -> None:
        self._repo = repo
        self._cloudinary = cloudinary

    async def create_category(self, data: CreateCategoryRequest) -> CategoryResponse:
        try:
            slug = data.slug or _slugify(data.name)

            existing_name = await self._repo.find_by_name(data.name)
            if existing_name:
                raise CategoryAlreadyExistsException("name")

            existing_slug = await self._repo.find_by_slug(slug)
            if existing_slug:
                raise CategoryAlreadyExistsException("slug")

            parent_id = None
            if data.parent_category_id:
                parent = await self._repo.find_by_id(UUID(data.parent_category_id))
                if not parent:
                    raise CategoryNotFoundException(data.parent_category_id)
                parent_id = UUID(data.parent_category_id)

            row = await self._repo.create_category({
                "name": data.name,
                "slug": slug,
                "description": data.description,
                "parent_category_id": parent_id,
            })
            logger.info("category_created", category_id=str(row["id"]))
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("create_category_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_categories(
        self,
        page: int,
        page_size: int,
        parent_id: Optional[str] = None,
        q: Optional[str] = None,
    ) -> PaginatedResponse[CategoryResponse]:
        try:
            pid = UUID(parent_id) if parent_id else None
            rows, total = await self._repo.list_categories(page, page_size, pid, q)
            items = [_row_to_response(r) for r in rows]
            return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_categories_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def get_category(self, category_id: str) -> CategoryDetailResponse:
        try:
            row = await self._repo.find_by_id(UUID(category_id))
            if not row:
                raise CategoryNotFoundException(category_id)

            children_rows = await self._repo.list_children(UUID(category_id))
            base = _row_to_response(row)
            return CategoryDetailResponse(
                **base.model_dump(),
                children=[_row_to_response(c) for c in children_rows],
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_category_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def update_category(self, category_id: str, data: UpdateCategoryRequest) -> CategoryResponse:
        try:
            existing = await self._repo.find_by_id(UUID(category_id))
            if not existing:
                raise CategoryNotFoundException(category_id)

            fields: dict = {}
            if data.name is not None:
                conflict = await self._repo.find_by_name(data.name)
                if conflict and str(conflict["id"]) != category_id:
                    raise CategoryAlreadyExistsException("name")
                fields["name"] = data.name

            if data.slug is not None:
                conflict_slug = await self._repo.find_by_slug(data.slug)
                if conflict_slug and str(conflict_slug["id"]) != category_id:
                    raise CategoryAlreadyExistsException("slug")
                fields["slug"] = data.slug
            elif data.name is not None:
                # Auto-update slug when name changes (only if slug wasn't explicitly set)
                new_slug = _slugify(data.name)
                fields["slug"] = new_slug

            if data.description is not None:
                fields["description"] = data.description

            if data.parent_category_id is not None:
                parent = await self._repo.find_by_id(UUID(data.parent_category_id))
                if not parent:
                    raise CategoryNotFoundException(data.parent_category_id)
                fields["parent_category_id"] = UUID(data.parent_category_id)

            row = await self._repo.update_category(UUID(category_id), fields)
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("update_category_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_category(self, category_id: str) -> None:
        try:
            existing = await self._repo.find_by_id(UUID(category_id))
            if not existing:
                raise CategoryNotFoundException(category_id)
            await self._repo.soft_delete(UUID(category_id))
            logger.info("category_deleted", category_id=category_id)
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_category_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def upload_image(
        self, category_id: str, file_bytes: bytes, content_type: str
    ) -> str:
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
                    "File too large. Maximum 5 MB",
                    field="file",
                )

            category = await self._repo.find_by_id(UUID(category_id))
            if not category:
                raise CategoryNotFoundException(category_id)

            if category.get("image_id"):
                try:
                    self._cloudinary.delete_image(category["image_id"])
                except Exception:
                    logger.warning("failed_to_delete_old_category_image", category_id=category_id)

            try:
                result = self._cloudinary.upload_image(
                    file_bytes, folder=f"categories/{category_id}"
                )
            except Exception as exc:
                raise CategoryImageUploadException() from exc

            await self._repo.update_category(
                UUID(category_id),
                {"image_url": result.secure_url, "image_id": result.public_id},
            )
            return result.secure_url
        except AppException:
            raise
        except Exception as exc:
            logger.error("upload_category_image_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_image(self, category_id: str) -> None:
        try:
            category = await self._repo.find_by_id(UUID(category_id))
            if not category:
                raise CategoryNotFoundException(category_id)
            if not category.get("image_id"):
                raise AppException(ErrorTypes.InvalidOperation, "No image to delete", resource="category")
            try:
                self._cloudinary.delete_image(category["image_id"])
            except Exception as exc:
                raise CategoryImageUploadException("Failed to delete image") from exc
            await self._repo.update_category(UUID(category_id), {"image_url": None, "image_id": None})
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_category_image_failed", exc_info=True)
            raise UnkownAppException() from exc
