from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class IngestionLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    level: str
    message: str
    context: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class IngestionJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_type: str
    status: str
    requested_by: str | None
    parameters: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class SourceHealthRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    status: str
    last_checked_at: datetime | None
    last_success_at: datetime | None
    last_error: str | None
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    updated_at: datetime
