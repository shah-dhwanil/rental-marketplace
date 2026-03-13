"""Generic pagination wrapper used across all list endpoints."""

from typing import Generic, TypeVar
import math

from pydantic import BaseModel, computed_field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int

    @computed_field
    @property
    def pages(self) -> int:
        if self.page_size == 0:
            return 0
        return math.ceil(self.total / self.page_size)
