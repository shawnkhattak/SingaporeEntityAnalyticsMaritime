from sqlalchemy import String, case, cast, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maritime import Entity, Relationship, Vessel, VesselPositionLatest
from app.schemas.entities import EntityRead, EntityRelationshipRead
from app.schemas.vessels import VesselSummary

ENTITY_TYPE_COMPANY = "company"
ENTITY_RELATIONSHIP_TYPES = ("owner", "operator", "ship_manager", "ism_manager")


class EntityService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _unique_vessel_count_expr():
        return func.count(func.distinct(func.coalesce(Vessel.imo, cast(Vessel.id, String))))

    @staticmethod
    def _on_map_vessel_count_expr():
        """Distinct vessels with a current latest position (i.e. on the map)."""
        return func.count(
            func.distinct(
                case(
                    (VesselPositionLatest.vessel_id.is_not(None), func.coalesce(Vessel.imo, cast(Vessel.id, String))),
                    else_=None,
                )
            )
        )

    @staticmethod
    def _entity_relationship_filter(entity_id: int):
        return or_(Relationship.to_entity_id == entity_id, Relationship.from_entity_id == entity_id)

    @staticmethod
    def _entity_relationship_join():
        return or_(Relationship.to_entity_id == Entity.id, Relationship.from_entity_id == Entity.id)

    @staticmethod
    def _entity_read(entity: Entity, unique_vessel_count: int = 0) -> EntityRead:
        return EntityRead.model_validate(
            {
                "id": entity.id,
                "entity_type": entity.entity_type,
                "name": entity.name,
                "country_code": entity.country_code,
                "external_id": entity.external_id,
                "created_at": entity.created_at,
                "updated_at": entity.updated_at,
                "unique_vessel_count": unique_vessel_count,
            }
        )

    async def search(self, query: str, limit: int = 20, offset: int = 0) -> list[EntityRead]:
        pattern = f"%{query.strip()}%"
        unique_vessels = self._unique_vessel_count_expr()
        on_map_vessels = self._on_map_vessel_count_expr()
        rows = await self.session.execute(
            select(Entity, unique_vessels.label("unique_vessels"), on_map_vessels.label("on_map_vessels"))
            .join(Relationship, self._entity_relationship_join())
            .join(Vessel, Vessel.id == Relationship.vessel_id)
            .outerjoin(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .where(or_(Entity.name.ilike(pattern), Entity.entity_type.ilike(pattern), Entity.country_code.ilike(pattern)))
            .where(Entity.entity_type == ENTITY_TYPE_COMPANY)
            .where(Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES))
            .group_by(Entity.id)
            .order_by(
                desc(on_map_vessels),
                desc(unique_vessels),
                (func.lower(Entity.name) == query.strip().lower()).desc(),
                Entity.name,
            )
            .offset(offset)
            .limit(limit)
        )
        return [self._entity_read(row[0], int(row.unique_vessels or 0)) for row in rows]

    async def list_recent(self, limit: int = 50, offset: int = 0) -> list[EntityRead]:
        """Listing ordered by entities with the most vessels currently on the map."""
        unique_vessels = self._unique_vessel_count_expr()
        on_map_vessels = self._on_map_vessel_count_expr()
        rows = await self.session.execute(
            select(Entity, unique_vessels.label("unique_vessels"), on_map_vessels.label("on_map_vessels"))
            .join(Relationship, self._entity_relationship_join())
            .join(Vessel, Vessel.id == Relationship.vessel_id)
            .outerjoin(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .where(Entity.entity_type == ENTITY_TYPE_COMPANY)
            .where(Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES))
            .group_by(Entity.id)
            .order_by(desc(on_map_vessels), desc(unique_vessels), desc(Entity.updated_at), desc(Entity.id))
            .offset(offset)
            .limit(limit)
        )
        return [self._entity_read(row[0], int(row.unique_vessels or 0)) for row in rows]

    async def get(self, entity_id: int) -> EntityRead | None:
        entity = await self.session.get(Entity, entity_id)
        if entity is None or entity.entity_type != ENTITY_TYPE_COMPANY:
            return None
        unique_vessels = await self.session.scalar(
            select(self._unique_vessel_count_expr())
            .select_from(Relationship)
            .join(Vessel, Vessel.id == Relationship.vessel_id)
            .where(
                self._entity_relationship_filter(entity_id),
                Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES),
            )
        )
        if not unique_vessels:
            return None
        return self._entity_read(entity, int(unique_vessels or 0))

    async def vessels(self, entity_id: int) -> list[VesselSummary] | None:
        if await self.get(entity_id) is None:
            return None
        rows = await self.session.scalars(
            select(Vessel)
            .join(Relationship, Relationship.vessel_id == Vessel.id)
            .where(self._entity_relationship_filter(entity_id))
            .where(Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES))
            .order_by(Vessel.name)
        )
        vessels: list[VesselSummary] = []
        seen: set[str] = set()
        for row in rows:
            key = f"imo:{row.imo}" if row.imo else f"id:{row.id}"
            if key in seen:
                continue
            seen.add(key)
            vessels.append(VesselSummary.model_validate(row))
        return vessels

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
                    vessel=VesselSummary.model_validate(vessel) if vessel is not None else None,
                )
            )
        return relationships
