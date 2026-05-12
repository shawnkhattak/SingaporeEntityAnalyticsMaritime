from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    observation_type: str
    source_record_id: str | None
    observed_at: datetime | None
    fetched_at: datetime
    payload_hash: str
    raw_payload: dict[str, Any] = Field(default_factory=dict)
