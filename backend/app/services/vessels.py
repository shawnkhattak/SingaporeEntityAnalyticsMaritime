from __future__ import annotations

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import SourceObservation
from app.models.maritime import Entity, PortEvent, Relationship, Vessel, VesselPositionLatest
from app.schemas.vessels import (
    VesselDetail,
    VesselCurrentPortRead,
    VesselEventRead,
    VesselLinkedEntityRead,
    VesselObservationRead,
    VesselPositionRead,
    VesselSearchResult,
    VesselSummary,
)

INVALID_IMO_VALUES = ("0", "00", "000", "0000")


class VesselService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def search(self, query: str, limit: int = 20) -> list[VesselSearchResult]:
        normalized_query = query.strip()
        if not normalized_query:
            return []

        pattern = f"%{normalized_query}%"
        rows = await self.session.execute(
            select(Vessel, VesselPositionLatest)
            .outerjoin(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .where(
                or_(
                    Vessel.imo.ilike(pattern),
                    Vessel.mmsi.ilike(pattern),
                    Vessel.call_sign.ilike(pattern),
                    Vessel.name.ilike(pattern),
                )
            )
            .where(or_(Vessel.imo.is_(None), Vessel.imo.notin_(INVALID_IMO_VALUES)))
            .order_by(
                (func.lower(Vessel.imo) == normalized_query.lower()).desc(),
                (func.lower(Vessel.mmsi) == normalized_query.lower()).desc(),
                (func.lower(Vessel.call_sign) == normalized_query.lower()).desc(),
                Vessel.name,
            )
            .limit(limit)
        )

        results: list[VesselSearchResult] = []
        for vessel, latest in rows:
            results.append(
                VesselSearchResult(
                    **self._summary(vessel).model_dump(),
                    latest_position=self._position(latest),
                    match_fields=self._match_fields(vessel, normalized_query),
                )
            )
        return results

    async def detail(self, vessel_id: int) -> VesselDetail | None:
        row = await self.session.execute(
            select(Vessel, VesselPositionLatest)
            .outerjoin(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .where(Vessel.id == vessel_id)
        )
        item = row.first()
        if item is None:
            return None

        vessel, latest = item
        evidence_ids = await self._evidence_ids(vessel.id, latest.evidence_id if latest is not None else None)
        source_timestamps: dict[str, object] = {}
        if vessel.source_updated_at is not None:
            source_timestamps["vessel"] = vessel.source_updated_at
        if latest is not None:
            source_timestamps["latest_position"] = latest.position_timestamp

        return VesselDetail(
            vessel=self._summary(vessel),
            latest_position=self._position(latest),
            evidence_ids=evidence_ids,
            source_timestamps=source_timestamps,
            linked_entities=await self._linked_entities(vessel.id),
            current_port=self._current_port(vessel),
        )

    async def observations(self, vessel_id: int, limit: int = 25) -> list[VesselObservationRead] | None:
        vessel = await self.session.get(Vessel, vessel_id)
        if vessel is None:
            return None

        evidence_ids = await self._evidence_ids(vessel.id, None)
        identity_terms = [value for value in (vessel.imo, vessel.mmsi, vessel.call_sign) if value]
        filters = []
        if evidence_ids:
            filters.append(SourceObservation.id.in_(evidence_ids))
        for term in identity_terms:
            filters.append(SourceObservation.source_record_id.ilike(f"%{term}%"))

        if not filters:
            return []

        rows = await self.session.scalars(
            select(SourceObservation)
            .where(or_(*filters))
            .order_by(desc(SourceObservation.fetched_at))
            .limit(limit)
        )
        return [
            VesselObservationRead(
                id=row.id,
                source=row.source,
                observation_type=row.observation_type,
                source_record_id=row.source_record_id,
                observed_at=row.observed_at,
                fetched_at=row.fetched_at,
                payload_hash=row.payload_hash,
                raw_payload=row.raw_payload,
            )
            for row in rows
        ]

    async def events(self, vessel_id: int, limit: int = 50) -> list[VesselEventRead] | None:
        if await self.session.get(Vessel, vessel_id) is None:
            return None

        rows = await self.session.scalars(
            select(PortEvent)
            .where(PortEvent.vessel_id == vessel_id)
            .order_by(desc(PortEvent.event_time), desc(PortEvent.created_at))
            .limit(limit)
        )
        return [VesselEventRead.model_validate(row) for row in rows]

    async def _evidence_ids(self, vessel_id: int, latest_evidence_id: int | None) -> list[int]:
        ids = set()
        if latest_evidence_id is not None:
            ids.add(latest_evidence_id)

        relationship_ids = await self.session.scalars(
            select(Relationship.evidence_id).where(
                Relationship.vessel_id == vessel_id,
                Relationship.evidence_id.is_not(None),
            )
        )
        ids.update(evidence_id for evidence_id in relationship_ids if evidence_id is not None)
        return sorted(ids)

    async def _linked_entities(self, vessel_id: int) -> list[VesselLinkedEntityRead]:
        rows = await self.session.execute(
            select(Relationship, Entity)
            .join(Entity, or_(Entity.id == Relationship.from_entity_id, Entity.id == Relationship.to_entity_id))
            .where(
                Relationship.vessel_id == vessel_id,
                or_(Relationship.from_entity_id.is_not(None), Relationship.to_entity_id.is_not(None)),
            )
            .order_by(Entity.name, Relationship.relationship_type, Relationship.id)
        )
        linked: list[VesselLinkedEntityRead] = []
        seen: set[tuple[int, str, int | None]] = set()
        for relationship, entity in rows:
            key = (entity.id, relationship.relationship_type, relationship.evidence_id)
            if key in seen:
                continue
            seen.add(key)
            linked.append(
                VesselLinkedEntityRead(
                    id=entity.id,
                    entity_type=entity.entity_type,
                    name=entity.name,
                    country_code=entity.country_code,
                    external_id=entity.external_id,
                    relationship_type=relationship.relationship_type,
                    confidence=relationship.confidence,
                    evidence_id=relationship.evidence_id,
                    evidence_summary=relationship.evidence_summary,
                )
            )
        return linked

    @staticmethod
    def _summary(vessel: Vessel) -> VesselSummary:
        return VesselSummary.model_validate(vessel)

    @staticmethod
    def _current_port(vessel: Vessel) -> VesselCurrentPortRead | None:
        if not vessel.current_port_name:
            return None
        return VesselCurrentPortRead(
            code=vessel.current_port_code,
            name=vessel.current_port_name,
            distance_meters=float(vessel.current_port_distance_m) if vessel.current_port_distance_m is not None else None,
            detected_at=vessel.current_port_updated_at,
        )

    @staticmethod
    def _position(position: VesselPositionLatest | None) -> VesselPositionRead | None:
        if position is None:
            return None
        return VesselPositionRead(
            latitude=float(position.latitude),
            longitude=float(position.longitude),
            speed_knots=float(position.speed_knots) if position.speed_knots is not None else None,
            course_degrees=float(position.course_degrees) if position.course_degrees is not None else None,
            heading_degrees=float(position.heading_degrees) if position.heading_degrees is not None else None,
            navigational_status=position.navigational_status,
            position_timestamp=position.position_timestamp,
            evidence_id=position.evidence_id,
        )

    @staticmethod
    def _match_fields(vessel: Vessel, query: str) -> list[str]:
        lowered = query.lower()
        fields: list[str] = []
        for field_name, value in (
            ("imo", vessel.imo),
            ("mmsi", vessel.mmsi),
            ("call_sign", vessel.call_sign),
            ("name", vessel.name),
        ):
            if value and lowered in value.lower():
                fields.append(field_name)
        return fields
