"""FastAPI dependency providers for the products module."""

from typing import Annotated

from fastapi import Depends

from api.cloudinary import get_cloudinary_client
from api.database import get_db_pool
from api.embedding import get_embedding_service
from api.categories.repository import CategoryRepository
from api.products.repository import ProductRepository
from api.products.service import ProductService
from api.users.dependencies import CurrentUserDep
from api.users.exceptions import InsufficientPermissionException


def get_product_repository() -> ProductRepository:
    return ProductRepository(get_db_pool())


def get_category_repository_for_products() -> CategoryRepository:
    return CategoryRepository(get_db_pool())


def get_product_service(
    repo: Annotated[ProductRepository, Depends(get_product_repository)],
    category_repo: Annotated[CategoryRepository, Depends(get_category_repository_for_products)],
) -> ProductService:
    return ProductService(
        repo,
        category_repo,
        get_cloudinary_client(),
        get_embedding_service(),
    )


ProductServiceDep = Annotated[ProductService, Depends(get_product_service)]


def require_vendor(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role != "vendor":
        raise InsufficientPermissionException("Vendor access required")
    return claims


def require_vendor_or_admin(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role not in ("vendor", "admin"):
        raise InsufficientPermissionException("Vendor or admin access required")
    return claims


VendorDep = Annotated[CurrentUserDep, Depends(require_vendor)]
VendorOrAdminDep = Annotated[CurrentUserDep, Depends(require_vendor_or_admin)]
