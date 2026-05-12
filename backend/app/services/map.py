from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maritime import Vessel, VesselPositionLatest
from app.schemas.map import VesselMapFeature


class MapService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_vessel_positions(self, limit: int = 500) -> list[VesselMapFeature]:
        rows = await self.session.execute(
            select(Vessel, VesselPositionLatest)
            .join(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .order_by(desc(VesselPositionLatest.position_timestamp))
            .limit(limit)
        )

        features: list[VesselMapFeature] = []
        for vessel, position in rows:
            features.append(
                VesselMapFeature(
                    vessel_id=vessel.id,
                    name=vessel.name,
                    imo=vessel.imo,
                    mmsi=vessel.mmsi,
                    call_sign=vessel.call_sign,
                    flag_country_code=vessel.flag_country_code,
                    vessel_type_code=vessel.vessel_type_code,
                    latitude=float(position.latitude),
                    longitude=float(position.longitude),
                    speed_knots=float(position.speed_knots) if position.speed_knots is not None else None,
                    course_degrees=float(position.course_degrees) if position.course_degrees is not None else None,
                    heading_degrees=float(position.heading_degrees) if position.heading_degrees is not None else None,
                    navigational_status=position.navigational_status,
                    position_timestamp=position.position_timestamp,
                    evidence_id=position.evidence_id,
                )
            )
        return features
