"""Caching utilities."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Callable, Optional

from fastapi import Request, Response


def products_search_key_builder(
    func: Callable[..., Any],
    namespace: str = "",
    request: Optional[Request] = None,
    response: Optional[Response] = None,
    args: tuple[Any, ...] = (),
    kwargs: Optional[dict[str, Any]] = None,
) -> str:
    """
    Cache key builder for the public product listing/search endpoint.

    Notes:
    - Only includes query params that affect the result.
    - Ensures a stable ordering so equivalent requests hit the same cache entry.
    """
    if kwargs is None:
        kwargs = {}
    relevant_query_params = (
        "page",
        "page_size",
        "category_id",
        "is_active",
        "q",
        "start_date",
        "end_date",
        "lat",
        "lng",
    )

    query_params: dict[str, Any] = {}
    if request is not None:
        for name in relevant_query_params:
            value = request.query_params.get(name)
            if value is not None:
                query_params[name] = value
    else:
        for name in relevant_query_params:
            value = kwargs.get(name)
            if value is not None:
                query_params[name] = value.isoformat() if hasattr(value, "isoformat") else value

    payload = {
        "module": func.__module__,
        "name": func.__name__,
        "query": query_params,
    }
    digest = hashlib.md5(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()  # noqa: S324
    return f"{namespace}:{digest}"

