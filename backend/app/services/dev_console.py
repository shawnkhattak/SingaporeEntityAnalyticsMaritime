from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import SourceObservation
from app.models.ingestion import IngestionJob, IngestionLog, SourceHealth
from app.models.maritime import Entity, PortEvent, Relationship, Vessel, VesselPositionLatest
from app.models.reference import ReferenceData
from app.models.risk import NewsArticle, NewsLink, RiskFlag, SanctionsRecord
from app.schemas.evidence import EvidenceRead

TABLE_MODELS = {
    "vessels": Vessel,
    "vessel_positions_latest": VesselPositionLatest,
    "port_events": PortEvent,
    "entities": Entity,
    "relationships": Relationship,
    "risk_flags": RiskFlag,
    "sanctions_records": SanctionsRecord,
    "news_articles": NewsArticle,
    "news_links": NewsLink,
    "reference_data": ReferenceData,
    "ingestion_jobs": IngestionJob,
    "ingestion_logs": IngestionLog,
    "source_health": SourceHealth,
    "source_observations": SourceObservation,
}

INVALID_IMO_VALUES = ("0", "00", "000", "0000")


class DevConsoleService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def table_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for name, model in TABLE_MODELS.items():
            counts[name] = await self.session.scalar(select(func.count()).select_from(model)) or 0
        return counts

    async def observations(self, source: str | None = None, type_: str | None = None, limit: int = 25) -> list[EvidenceRead]:
        statement = select(SourceObservation).order_by(SourceObservation.fetched_at.desc()).limit(limit)
        if source:
            statement = statement.where(SourceObservation.source == source)
        if type_:
            statement = statement.where(SourceObservation.observation_type == type_)
        rows = await self.session.scalars(statement)
        return [EvidenceRead.model_validate(row) for row in rows]

    async def vessel_browser(self, q: str | None = None, limit: int = 5000) -> list[dict]:
        statement = (
            select(Vessel, VesselPositionLatest)
            .outerjoin(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .where(or_(Vessel.imo.is_(None), Vessel.imo.notin_(INVALID_IMO_VALUES)))
            .order_by(desc(VesselPositionLatest.position_timestamp).nullslast(), Vessel.name)
            .limit(limit)
        )
        if q:
            pattern = f"%{q.strip()}%"
            statement = statement.where(
                or_(
                    Vessel.name.ilike(pattern),
                    Vessel.imo.ilike(pattern),
                    Vessel.mmsi.ilike(pattern),
                    Vessel.call_sign.ilike(pattern),
                )
            )

        rows = list((await self.session.execute(statement)).all())
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

        return [
            self._vessel_browser_row(vessel, latest, flags_by_vessel.get(vessel.id, []))
            for vessel, latest in rows
        ]

    @staticmethod
    def _vessel_browser_row(vessel: Vessel, latest: VesselPositionLatest | None, flags: list[RiskFlag]) -> dict:
        severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        highest_flag = max(flags, key=lambda flag: severity_order.get(flag.severity, 0), default=None)
        return {
            "vessel_id": vessel.id,
            "name": vessel.name,
            "imo": vessel.imo,
            "mmsi": vessel.mmsi,
            "call_sign": vessel.call_sign,
            "flag_country_code": vessel.flag_country_code,
            "vessel_type_code": vessel.vessel_type_code,
            "source_updated_at": vessel.source_updated_at,
            "latest_position": None if latest is None else {
                "latitude": float(latest.latitude),
                "longitude": float(latest.longitude),
                "speed_knots": float(latest.speed_knots) if latest.speed_knots is not None else None,
                "course_degrees": float(latest.course_degrees) if latest.course_degrees is not None else None,
                "heading_degrees": float(latest.heading_degrees) if latest.heading_degrees is not None else None,
                "navigational_status": latest.navigational_status,
                "position_timestamp": latest.position_timestamp,
                "evidence_id": latest.evidence_id,
            },
            "risk_flags_count": len(flags),
            "highest_risk_severity": highest_flag.severity if highest_flag is not None else None,
            "risk_flag_types": sorted({flag.flag_type for flag in flags}),
        }
