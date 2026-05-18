from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.risk import RiskFlagRead


class VesselMapFeature(BaseModel):
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
    latitude: float
    longitude: float
    speed_knots: float | None
    course_degrees: float | None
    heading_degrees: float | None
    navigational_status: str | None
    position_timestamp: datetime
    evidence_id: int | None
    highest_risk_severity: str | None = None
    risk_flags: list[RiskFlagRead] = Field(default_factory=list)
