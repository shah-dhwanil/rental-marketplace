"""Domain exceptions for the categories module."""

from api.exceptions.app import AppException, ErrorTypes


class CategoryNotFoundException(AppException):
    def __init__(self, category_id: str | None = None) -> None:
        super().__init__(
            ErrorTypes.ResourceNotFound,
            "Category not found",
            resource="category",
            value=category_id,
        )


class CategoryAlreadyExistsException(AppException):
    def __init__(self, field: str = "name") -> None:
        super().__init__(
            ErrorTypes.ResourceAlreadyExists,
            "A category with this name or slug already exists",
            resource="category",
            field=field,
        )


class CategoryImageUploadException(AppException):
    def __init__(self, message: str = "Failed to upload category image") -> None:
        super().__init__(ErrorTypes.ExternalServiceError, message)
