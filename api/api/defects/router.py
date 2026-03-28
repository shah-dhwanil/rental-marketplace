"""Defects router."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, status

from api.defects.dependencies import DefectServiceDep
from api.defects.models.responses import (
    DefectChargeResponse,
    DefectChargeListResponse,
)
from api.users.dependencies import CurrentUserDep
from api.exceptions.app import AppException, ErrorTypes

router = APIRouter(prefix="/api/v1/defects", tags=["Defects"])


def _require_customer(claims: CurrentUserDep) -> CurrentUserDep:
    """Require customer role."""
    if claims.role != "customer":
        raise AppException(ErrorTypes.NotEnoughPermission, "Customer access required")
    return claims


def _require_vendor(claims: CurrentUserDep) -> CurrentUserDep:
    """Require vendor role."""
    if claims.role != "vendor":
        raise AppException(ErrorTypes.NotEnoughPermission, "Vendor access required")
    return claims


@router.get(
    "/orders/{order_id}",
    response_model=DefectChargeListResponse,
    summary="Get defect charges for an order",
)
async def get_order_defects(
    order_id: UUID,
    claims: CurrentUserDep,
    service: DefectServiceDep,
):
    """Get all defect charges for a specific order."""
    return await service.list_defects_for_order(order_id)


@router.get(
    "/{defect_id}",
    response_model=DefectChargeResponse,
    summary="Get a defect charge by ID",
)
async def get_defect_charge(
    defect_id: UUID,
    claims: CurrentUserDep,
    service: DefectServiceDep,
):
    """Get details of a specific defect charge."""
    return await service.get_defect_charge_by_id(defect_id)


@router.post(
    "/{defect_id}/confirm-payment",
    response_model=DefectChargeResponse,
    summary="Customer — Confirm payment for a defect charge",
)
async def confirm_defect_payment(
    defect_id: UUID,
    claims: CurrentUserDep,
    service: DefectServiceDep,
):
    """Confirm that a defect charge has been paid by verifying Stripe payment."""
    _require_customer(claims)
    return await service.confirm_defect_payment(defect_id, claims.user_id)


@router.patch(
    "/{defect_id}/status",
    response_model=DefectChargeResponse,
    summary="Update defect charge status",
)
async def update_defect_status(
    defect_id: UUID,
    status: str,
    claims: CurrentUserDep,
    service: DefectServiceDep,
):
    """Update the status of a defect charge (paid, disputed, waived)."""
    from api.defects.models.requests import UpdateDefectStatusRequest
    
    request = UpdateDefectStatusRequest(status=status)
    return await service.update_defect_status(defect_id, request)
