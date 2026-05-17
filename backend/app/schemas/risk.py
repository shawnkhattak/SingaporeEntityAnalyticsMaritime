from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RiskFlagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vessel_id: int | None
    entity_id: int | None
    flag_type: str
    severity: str
    summary: str
    evidence_id: int | None
    status: str
    created_at: datetime
    resolved_at: datetime | None


class RiskFeedItem(BaseModel):
    flag: RiskFlagRead
    subject: str
    vessel_id: int | None = None
    entity_id: int | None = None
    evidence_payload: dict | None = None
    conflict_details: list[dict] | None = None
