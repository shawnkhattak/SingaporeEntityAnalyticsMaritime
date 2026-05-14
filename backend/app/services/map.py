from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ingestion import IngestionJob
from app.models.maritime import Vessel, VesselPositionLatest
from app.schemas.map import VesselMapFeature

# Vessels matching these IMOs are placeholders from upstream feeds and
# must never surface in the UI.
INVALID_IMO_VALUES = ("0", "00", "000", "0000")
POSITIONS_JOB_TYPE = "oceansx.positions_snapshot"


class MapService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_vessel_positions(self, limit: int = 500, scope: str = "latest-snapshot") -> list[VesselMapFeature]:
        statement = (
            select(Vessel, VesselPositionLatest)
            .join(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .where(or_(Vessel.imo.is_(None), Vessel.imo.notin_(INVALID_IMO_VALUES)))
            .order_by(desc(VesselPositionLatest.position_timestamp))
            .limit(limit)
        )

        if scope == "latest-snapshot":
            latest_job = await self.session.scalar(
                select(IngestionJob)
                .where(
                    IngestionJob.job_type == POSITIONS_JOB_TYPE,
                    IngestionJob.status == "succeeded",
                    IngestionJob.started_at.is_not(None),
                    IngestionJob.finished_at.is_not(None),
                )
                .order_by(desc(IngestionJob.finished_at))
                .limit(1)
            )
            if latest_job is not None and latest_job.started_at is not None and latest_job.finished_at is not None:
                statement = statement.where(VesselPositionLatest.snapshot_job_id == latest_job.id)

        rows = await self.session.execute(
            statement
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
