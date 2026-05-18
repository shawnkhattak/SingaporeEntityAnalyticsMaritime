from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class VesselSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    imo: str | None
    mmsi: str | None
    name: str
    call_sign: str | None
    flag_country_code: str | None
    vessel_type_code: str | None
    year_built: int | None = None
    deadweight: int | None = None
    gross_tonnage: int | None = None
    net_tonnage: int | None = None
    length_meters: float | None = None
    breadth_meters: float | None = None
    depth_meters: float | None = None
    source_updated_at: datetime | None


class VesselPositionRead(BaseModel):
    latitude: float
    longitude: float
    speed_knots: float | None
    course_degrees: float | None
    heading_degrees: float | None
    navigational_status: str | None
    position_timestamp: datetime
    evidence_id: int | None


class VesselSearchResult(VesselSummary):
    latest_position: VesselPositionRead | None = None
    match_fields: list[str] = Field(default_factory=list)


class VesselDetail(BaseModel):
    vessel: VesselSummary
    latest_position: VesselPositionRead | None
    evidence_ids: list[int] = Field(default_factory=list)
    source_timestamps: dict[str, datetime | None] = Field(default_factory=dict)


class VesselObservationRead(BaseModel):
    id: int
    source: str
    observation_type: str
    source_record_id: str | None
    observed_at: datetime | None
    fetched_at: datetime
    payload_hash: str
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class VesselEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vessel_id: int | None
    vessel: VesselSummary | None = None
    port_code: str | None
    port_name: str | None
    event_type: str
    event_time: datetime | None
    evidence_id: int | None
    created_at: datetime
