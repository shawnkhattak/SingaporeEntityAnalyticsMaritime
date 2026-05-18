from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ingestion import IngestionJob
from app.models.maritime import Vessel, VesselPositionLatest
from app.models.risk import RiskFlag
from app.schemas.map import VesselMapFeature
from app.schemas.risk import RiskFlagRead

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
        rows = list(rows.all())
        vessel_ids = [vessel.id for vessel, _ in rows]
        flags_by_vessel: dict[int, list[RiskFlag]] = {vessel_id: [] for vessel_id in vessel_ids}
        if vessel_ids:
            flags = await self.session.scalars(
                select(RiskFlag)
                .where(RiskFlag.vessel_id.in_(vessel_ids), RiskFlag.status == "active")
                .order_by(RiskFlag.created_at.desc())
            )
            for flag in flags:
                if flag.vessel_id is not None:
                    flags_by_vessel.setdefault(flag.vessel_id, []).append(flag)

        features: list[VesselMapFeature] = []
        for vessel, position in rows:
            vessel_flags = flags_by_vessel.get(vessel.id, [])
            highest_flag = max(
                vessel_flags,
                key=lambda flag: {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(flag.severity, 0),
                default=None,
            )
            features.append(
                VesselMapFeature(
                    vessel_id=vessel.id,
                    name=vessel.name,
                    imo=vessel.imo,
                    mmsi=vessel.mmsi,
                    call_sign=vessel.call_sign,
                    flag_country_code=vessel.flag_country_code,
                    vessel_type_code=vessel.vessel_type_code,
                    year_built=vessel.year_built,
                    deadweight=vessel.deadweight,
                    gross_tonnage=vessel.gross_tonnage,
                    net_tonnage=vessel.net_tonnage,
                    length_meters=float(vessel.length_meters) if vessel.length_meters is not None else None,
                    breadth_meters=float(vessel.breadth_meters) if vessel.breadth_meters is not None else None,
                    depth_meters=float(vessel.depth_meters) if vessel.depth_meters is not None else None,
                    latitude=float(position.latitude),
                    longitude=float(position.longitude),
                    speed_knots=float(position.speed_knots) if position.speed_knots is not None else None,
                    course_degrees=float(position.course_degrees) if position.course_degrees is not None else None,
                    heading_degrees=float(position.heading_degrees) if position.heading_degrees is not None else None,
                    navigational_status=position.navigational_status,
                    position_timestamp=position.position_timestamp,
                    evidence_id=position.evidence_id,
                    highest_risk_severity=highest_flag.severity if highest_flag is not None else None,
                    risk_flags=[RiskFlagRead.model_validate(flag) for flag in vessel_flags],
                )
            )
        return features
