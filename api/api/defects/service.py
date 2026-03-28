"""Service layer — business logic for order defect charges."""
from __future__ import annotations

from typing import Optional
from uuid import UUID
from decimal import Decimal

import stripe
import structlog

from api.exceptions.app import AppException, ErrorTypes
from api.defects.models.requests import CreateDefectChargeRequest, UpdateDefectStatusRequest
from api.defects.models.responses import (
    DefectChargeResponse,
    DefectChargeCreatedResponse,
    DefectChargeListResponse,
)
from api.defects.repository import DefectRepository
from api.settings import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

# Configure Stripe
stripe.api_key = settings.STRIPE.SECRET_KEY


class DefectChargeNotFoundException(AppException):
    """Defect charge not found."""
    def __init__(self):
        super().__init__(
            error_type=ErrorTypes.NOT_FOUND,
            message="Defect charge not found",
            details={"reason": "The requested defect charge does not exist"},
        )


class UnauthorizedDefectAccessException(AppException):
    """User is not authorized to access this defect charge."""
    def __init__(self):
        super().__init__(
            error_type=ErrorTypes.FORBIDDEN,
            message="You are not authorized to access this defect charge",
            details={"reason": "Only the vendor who created the defect charge can access it"},
        )


class DefectPaymentCreationException(AppException):
    """Failed to create payment intent for defect charge."""
    def __init__(self, reason: str = "Failed to create payment intent"):
        super().__init__(
            error_type=ErrorTypes.INTERNAL_ERROR,
            message="Failed to create defect charge payment",
            details={"reason": reason},
        )


class DefectService:
    """Service for order defect charge business logic."""
    
    def __init__(self, defect_repo: DefectRepository) -> None:
        self._repo = defect_repo

    async def create_defect_charge(
        self,
        order_id: UUID,
        vendor_id: UUID,
        request: CreateDefectChargeRequest,
    ) -> DefectChargeCreatedResponse:
        """Create a new defect charge for an order."""
        try:
            # Get order details for customer info
            order = await self._repo.get_order_details(order_id)
            if not order:
                raise AppException(
                    error_type=ErrorTypes.NOT_FOUND,
                    message="Order not found",
                    details={"order_id": str(order_id)},
                )

            # Verify vendor owns the order
            if order["vendor_id"] != vendor_id:
                logger.warning(
                    "defect_creation_failed_unauthorized",
                    order_id=order_id,
                    vendor_id=vendor_id,
                )
                raise UnauthorizedDefectAccessException()

            # Create Stripe PaymentIntent for the defect charge
            try:
                amount_cents = int(request.amount * 100)  # Convert to cents
                
                payment_intent = stripe.PaymentIntent.create(
                    amount=amount_cents,
                    currency="inr",
                    metadata={
                        "order_id": str(order_id),
                        "vendor_id": str(vendor_id),
                        "customer_id": str(order["customer_id"]),
                        "type": "defect_charge",
                    },
                    description=f"Defect charge for order {order_id}: {request.description[:50]}",
                )
                
                logger.info(
                    "stripe_payment_intent_created_for_defect",
                    payment_intent_id=payment_intent.id,
                    order_id=order_id,
                    amount=request.amount,
                )
            except stripe.StripeError as e:
                logger.error(
                    "stripe_payment_intent_creation_failed",
                    error=str(e),
                    order_id=order_id,
                )
                raise DefectPaymentCreationException(str(e))

            # Create defect charge record
            defect_data = await self._repo.create_defect_charge(
                order_id=order_id,
                vendor_id=vendor_id,
                amount=request.amount,
                description=request.description,
                images=request.images,
                stripe_payment_intent_id=payment_intent.id,
            )

            logger.info(
                "defect_charge_created",
                defect_id=defect_data["id"],
                order_id=order_id,
                amount=request.amount,
            )

            return DefectChargeCreatedResponse(
                id=defect_data["id"],
                order_id=order_id,
                amount=request.amount,
                stripe_payment_intent_id=payment_intent.id,
                client_secret=payment_intent.client_secret,
                message="Defect charge created successfully",
            )

        except AppException:
            raise
        except Exception as e:
            logger.error(
                "defect_charge_creation_failed",
                order_id=order_id,
                error=str(e),
                exc_info=True,
            )
            raise AppException(
                error_type=ErrorTypes.INTERNAL_ERROR,
                message="Failed to create defect charge",
                details={"reason": str(e)},
            )

    async def get_defect_charge_by_id(
        self,
        defect_id: UUID,
    ) -> DefectChargeResponse:
        """Get a defect charge by ID."""
        defect_data = await self._repo.get_defect_charge_by_id(defect_id)
        
        if not defect_data:
            raise DefectChargeNotFoundException()

        return DefectChargeResponse(**defect_data)

    async def list_defects_for_order(
        self,
        order_id: UUID,
    ) -> DefectChargeListResponse:
        """List all defect charges for an order."""
        defects_data = await self._repo.list_defects_for_order(order_id)
        
        defects = [DefectChargeResponse(**data) for data in defects_data]
        
        return DefectChargeListResponse(
            items=defects,
            total=len(defects),
        )

    async def update_defect_status(
        self,
        defect_id: UUID,
        request: UpdateDefectStatusRequest,
    ) -> DefectChargeResponse:
        """Update the status of a defect charge."""
        # Check if defect exists
        defect_data = await self._repo.get_defect_charge_by_id(defect_id)
        if not defect_data:
            raise DefectChargeNotFoundException()

        # Update status
        updated_data = await self._repo.update_defect_status(
            defect_id=defect_id,
            status=request.status,
        )

        if not updated_data:
            raise DefectChargeNotFoundException()

        logger.info(
            "defect_status_updated",
            defect_id=defect_id,
            new_status=request.status,
        )

        return DefectChargeResponse(**updated_data)

    async def confirm_defect_payment(
        self,
        defect_id: UUID,
        customer_id: UUID,
    ) -> DefectChargeResponse:
        """Confirm payment for a defect charge by verifying Stripe PaymentIntent."""
        defect_data = await self._repo.get_defect_charge_by_id(defect_id)
        
        if not defect_data:
            raise DefectChargeNotFoundException()

        # Verify customer owns the order
        order = await self._repo.get_order_details(defect_data["order_id"])
        if not order or order["customer_id"] != customer_id:
            logger.warning(
                "defect_payment_confirmation_failed_unauthorized",
                defect_id=defect_id,
                customer_id=customer_id,
            )
            raise UnauthorizedDefectAccessException()

        # Check current status
        if defect_data["status"] == "paid":
            logger.info(
                "defect_payment_already_confirmed",
                defect_id=defect_id,
            )
            return DefectChargeResponse(**defect_data)

        # Verify payment with Stripe
        try:
            payment_intent = stripe.PaymentIntent.retrieve(
                defect_data["stripe_payment_intent_id"]
            )
            
            if payment_intent.status != "succeeded":
                logger.warning(
                    "defect_payment_not_succeeded",
                    defect_id=defect_id,
                    stripe_status=payment_intent.status,
                )
                raise AppException(
                    error_type=ErrorTypes.VALIDATION_ERROR,
                    message="Payment not completed",
                    details={"stripe_status": payment_intent.status},
                )

            # Update status to paid
            updated_data = await self._repo.mark_defect_as_paid(defect_id)
            
            logger.info(
                "defect_payment_confirmed",
                defect_id=defect_id,
                payment_intent_id=payment_intent.id,
            )
            
            return DefectChargeResponse(**updated_data)

        except stripe.StripeError as e:
            logger.error(
                "stripe_payment_verification_failed",
                defect_id=defect_id,
                error=str(e),
            )
            raise AppException(
                error_type=ErrorTypes.INTERNAL_ERROR,
                message="Failed to verify payment",
                details={"reason": str(e)},
            )
