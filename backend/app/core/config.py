from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    feature_mutations: bool = True
    feature_ai: bool = False
    database_url: str = "postgresql+asyncpg://seam:seam@localhost:5432/seam"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    max_requests_per_run: int = 100
    max_particulars_per_batch: int = 25
    oceansx_api_key: str | None = None
    oceansx_base_url: str = "https://oceans-x.mpa.gov.sg"
    oceansx_request_timeout_seconds: int = 20
    opensanctions_api_url: str = "https://api.opensanctions.org"
    opensanctions_dataset: str = "maritime"
    opensanctions_api_key: str | None = None
    opensanctions_live_call_budget: int = 1
    opensanctions_batch_size: int = 50
    opensanctions_maritime_csv_url: str = "https://data.opensanctions.org/datasets/20260510/maritime/maritime.csv"
    news_rss_urls: list[str] = Field(default_factory=lambda: ["https://gcaptain.com/feed/"])

    @field_validator("news_rss_urls", mode="before")
    @classmethod
    def split_news_urls(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
