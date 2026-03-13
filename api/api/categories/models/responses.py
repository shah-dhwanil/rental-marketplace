"""Response models for the categories module."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    parent_category_id: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CategoryDetailResponse(CategoryResponse):
    children: list["CategoryResponse"] = []
