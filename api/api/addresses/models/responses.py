"""Response models for the addresses module."""
from datetime import datetime
from pydantic import BaseModel


class AddressResponse(BaseModel):
    id: str
    customer_id: str
    name: str
    person_name: str
    contact_no: str
    address: str
    city: str
    pincode: str
    lat: float
    lng: float
    created_at: datetime
    updated_at: datetime
