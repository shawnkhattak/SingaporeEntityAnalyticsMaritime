from datetime import datetime

from pydantic import BaseModel


class VesselMapFeature(BaseModel):
    vessel_id: int
    name: str
    imo: str | None
    mmsi: str | None
    call_sign: str | None
    flag_country_code: str | None
    vessel_type_code: str | None
    latitude: float
    longitude: float
    speed_knots: float | None
    course_degrees: float | None
    heading_degrees: float | None
    navigational_status: str | None
    position_timestamp: datetime
    evidence_id: int | None
