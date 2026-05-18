from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.vessels import VesselPositionRead


class DevVesselBrowseRow(BaseModel):
    vessel_id: int
    name: str
    imo: str | None
    mmsi: str | None
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
    latest_position: VesselPositionRead | None
    risk_flags_count: int
    highest_risk_severity: str | None
    risk_flag_types: list[str] = Field(default_factory=list)
