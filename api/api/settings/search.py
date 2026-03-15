from pydantic import Field
from pydantic_settings import BaseSettings


class SearchConfig(BaseSettings):
    GEOCODE_RADIUS_KM: float = Field(
        default=20.0,
        description="Default search radius in km for geo-filtered product listings",
    )
