"""Request models for the categories module."""

import re
from typing import Optional

from pydantic import BaseModel, field_validator


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


class CreateCategoryRequest(BaseModel):
    name: str
    description: str = ""
    parent_category_id: Optional[str] = None
    slug: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        if len(v) > 64:
            raise ValueError("Name cannot exceed 64 characters")
        return v

    @field_validator("slug", mode="before")
    @classmethod
    def auto_slug(cls, v: Optional[str], info) -> str:
        if v:
            return _slugify(v)
        # Will fall back to name in service if still None
        return v  # type: ignore[return-value]


class UpdateCategoryRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    slug: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be blank")
            if len(v) > 64:
                raise ValueError("Name cannot exceed 64 characters")
        return v

    @field_validator("slug", mode="before")
    @classmethod
    def auto_slug(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return _slugify(v)
        return v
