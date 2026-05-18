from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.vessels import VesselSummary


class EntityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_type: str
    name: str
    country_code: str | None
    external_id: str | None
    created_at: datetime
    updated_at: datetime
    unique_vessel_count: int = 0


class EntityRelationshipRead(BaseModel):
    id: int
    relationship_type: str
    confidence: str
    evidence_id: int | None
    evidence_summary: str | None
    vessel: VesselSummary | None = None
