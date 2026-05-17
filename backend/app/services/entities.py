from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maritime import Entity, Relationship, Vessel
from app.schemas.entities import EntityRead, EntityRelationshipRead
from app.schemas.vessels import VesselSummary

ENTITY_TYPE_COMPANY = "company"
ENTITY_RELATIONSHIP_TYPES = ("owner", "operator", "ship_manager", "ism_manager")


class EntityService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def search(self, query: str, limit: int = 20) -> list[EntityRead]:
        pattern = f"%{query.strip()}%"
        rows = await self.session.scalars(
            select(Entity)
            .where(or_(Entity.name.ilike(pattern), Entity.entity_type.ilike(pattern), Entity.country_code.ilike(pattern)))
            .where(Entity.entity_type == ENTITY_TYPE_COMPANY)
            .where(
                select(Relationship.id)
                .where(
                    Relationship.to_entity_id == Entity.id,
                    Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES),
                )
                .exists()
            )
            .order_by((func.lower(Entity.name) == query.strip().lower()).desc(), Entity.name)
            .limit(limit)
        )
        return [EntityRead.model_validate(row) for row in rows]

    async def list_recent(self, limit: int = 50) -> list[EntityRead]:
        """Recent-first listing, used when no search query is active."""
        rows = await self.session.scalars(
            select(Entity)
            .where(Entity.entity_type == ENTITY_TYPE_COMPANY)
            .where(
                select(Relationship.id)
                .where(
                    Relationship.to_entity_id == Entity.id,
                    Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES),
                )
                .exists()
            )
            .order_by(desc(Entity.updated_at), desc(Entity.id))
            .limit(limit)
        )
        return [EntityRead.model_validate(row) for row in rows]

    async def get(self, entity_id: int) -> EntityRead | None:
        entity = await self.session.get(Entity, entity_id)
        if entity is None or entity.entity_type != ENTITY_TYPE_COMPANY:
            return None
        has_owner_or_operator = await self.session.scalar(
            select(Relationship.id)
            .where(
                Relationship.to_entity_id == entity_id,
                Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES),
            )
            .limit(1)
        )
        if has_owner_or_operator is None:
            return None
        return EntityRead.model_validate(entity) if entity is not None else None

    async def vessels(self, entity_id: int) -> list[VesselSummary] | None:
        if await self.get(entity_id) is None:
            return None
        rows = await self.session.scalars(
            select(Vessel)
            .join(Relationship, Relationship.vessel_id == Vessel.id)
            .where(Relationship.to_entity_id == entity_id)
            .where(Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES))
            .order_by(Vessel.name)
        )
        return [
            VesselSummary(
                id=row.id,
                imo=row.imo,
                mmsi=row.mmsi,
                name=row.name,
                call_sign=row.call_sign,
                flag_country_code=row.flag_country_code,
                vessel_type_code=row.vessel_type_code,
                source_updated_at=row.source_updated_at,
            )
            for row in rows
        ]

    async def relationships(self, entity_id: int, limit: int = 50) -> list[EntityRelationshipRead] | None:
        if await self.get(entity_id) is None:
            return None
        rows = await self.session.execute(
            select(Relationship, Vessel)
            .outerjoin(Vessel, Vessel.id == Relationship.vessel_id)
            .where(or_(Relationship.to_entity_id == entity_id, Relationship.from_entity_id == entity_id))
            .where(Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES))
            .order_by(desc(Relationship.created_at))
            .limit(limit)
        )
        relationships: list[EntityRelationshipRead] = []
        for relationship, vessel in rows:
            relationships.append(
                EntityRelationshipRead(
                    id=relationship.id,
                    relationship_type=relationship.relationship_type,
                    confidence=relationship.confidence,
                    evidence_id=relationship.evidence_id,
                    evidence_summary=relationship.evidence_summary,
                    vessel=VesselSummary(
                        id=vessel.id,
                        imo=vessel.imo,
                        mmsi=vessel.mmsi,
                        name=vessel.name,
                        call_sign=vessel.call_sign,
                        flag_country_code=vessel.flag_country_code,
                        vessel_type_code=vessel.vessel_type_code,
                        source_updated_at=vessel.source_updated_at,
                    )
                    if vessel is not None
                    else None,
                )
            )
        return relationships
