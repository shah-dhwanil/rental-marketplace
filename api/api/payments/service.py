"""Payment methods service — handles encryption/decryption logic."""
from uuid import UUID

import structlog

from api.crypto import encrypt_dict, decrypt_dict
from api.exceptions.app import AppException, UnkownAppException
from api.payments.exceptions import (
    PaymentDecryptionException,
    PaymentMethodAccessDeniedException,
    PaymentMethodNotFoundException,
)
from api.payments.models.requests import AddPaymentMethodRequest
from api.payments.models.responses import PaymentMethodDetailResponse, PaymentMethodResponse
from api.payments.repository import PaymentMethodRepository

logger = structlog.get_logger(__name__)


def _build_display_label(pm_type: str, details: dict) -> str:
    if pm_type == "card":
        return f"•••• {details.get('last4', '????')}"
    if pm_type == "upi":
        return details.get("upi_id", "UPI")
    if pm_type == "net_banking":
        return details.get("bank_name", "Net Banking")
    if pm_type == "wallet":
        return details.get("wallet_name", "Wallet")
    return pm_type.replace("_", " ").title()


def _row_to_response(row: dict) -> PaymentMethodResponse:
    return PaymentMethodResponse(
        id=str(row["id"]),
        customer_id=str(row["customer_id"]),
        type=row["type"],
        display_label=row["display_label"],
        created_at=row["created_at"],
    )


class PaymentMethodService:
    def __init__(self, repo: PaymentMethodRepository, key: bytes) -> None:
        self._repo = repo
        self._key = key

    async def add_payment_method(
        self, customer_id: str, data: AddPaymentMethodRequest
    ) -> PaymentMethodResponse:
        try:
            encrypted = encrypt_dict(self._key, data.details)
            row = await self._repo.create({
                "customer_id": UUID(customer_id),
                "type": data.type,
                "display_label": _build_display_label(data.type, data.details),
                "details": encrypted,
            })
            logger.info("payment_method_added", pm_id=str(row["id"]), customer_id=customer_id)
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("add_payment_method_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_payment_methods(self, customer_id: str) -> list[PaymentMethodResponse]:
        try:
            rows = await self._repo.list_by_customer(UUID(customer_id))
            return [_row_to_response(r) for r in rows]
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_payment_methods_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def get_payment_method(
        self, pm_id: str, customer_id: str
    ) -> PaymentMethodDetailResponse:
        try:
            row = await self._repo.find_by_id(UUID(pm_id))
            if not row:
                raise PaymentMethodNotFoundException(pm_id)
            if str(row["customer_id"]) != customer_id:
                raise PaymentMethodAccessDeniedException()
            try:
                decrypted = decrypt_dict(self._key, bytes(row["details"]))
            except Exception:
                logger.error("payment_method_decryption_failed", pm_id=pm_id)
                raise PaymentDecryptionException()
            base = _row_to_response(row)
            return PaymentMethodDetailResponse(**base.model_dump(), details=decrypted)
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_payment_method_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_payment_method(self, pm_id: str, customer_id: str) -> None:
        try:
            row = await self._repo.find_by_id(UUID(pm_id))
            if not row:
                raise PaymentMethodNotFoundException(pm_id)
            if str(row["customer_id"]) != customer_id:
                raise PaymentMethodAccessDeniedException()
            await self._repo.soft_delete(UUID(pm_id))
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_payment_method_failed", exc_info=True)
            raise UnkownAppException() from exc
