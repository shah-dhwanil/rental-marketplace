"""Stored payment methods router."""
from fastapi import APIRouter, status
from api.users.dependencies import CurrentUserDep
from api.payments.dependencies import PaymentServiceDep
from api.payments.models.requests import AddPaymentMethodRequest
from api.payments.models.responses import PaymentMethodDetailResponse, PaymentMethodResponse
from api.exceptions.app import AppException, ErrorTypes

router = APIRouter(prefix="/api/v1/payment-methods", tags=["Payment Methods"])


def _require_customer(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role != "customer":
        raise AppException(ErrorTypes.NotEnoughPermission, "Customer access required")
    return claims


@router.get("", response_model=list[PaymentMethodResponse], summary="List my payment methods")
async def list_payment_methods(claims: CurrentUserDep, service: PaymentServiceDep):
    _require_customer(claims)
    return await service.list_payment_methods(claims.user_id)


@router.post("", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED, summary="Add payment method")
async def add_payment_method(body: AddPaymentMethodRequest, claims: CurrentUserDep, service: PaymentServiceDep):
    _require_customer(claims)
    return await service.add_payment_method(claims.user_id, body)


@router.get("/{pm_id}", response_model=PaymentMethodDetailResponse, summary="Get payment method with decrypted details")
async def get_payment_method(pm_id: str, claims: CurrentUserDep, service: PaymentServiceDep):
    _require_customer(claims)
    return await service.get_payment_method(pm_id, claims.user_id)


@router.delete("/{pm_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete payment method")
async def delete_payment_method(pm_id: str, claims: CurrentUserDep, service: PaymentServiceDep):
    _require_customer(claims)
    await service.delete_payment_method(pm_id, claims.user_id)
