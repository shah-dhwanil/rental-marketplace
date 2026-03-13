from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class CloudinaryConfig(BaseSettings):
    CLOUD_NAME: str = Field(default="", description="Cloudinary cloud name")
    API_KEY: str = Field(default="", description="Cloudinary API key")
    API_SECRET: str = Field(default="", description="Cloudinary API secret")

    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")
