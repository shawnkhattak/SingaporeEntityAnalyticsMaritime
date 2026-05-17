from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maritime import Entity, Relationship, Vessel
from app.models.risk import RiskFlag
from app.schemas.graph import GraphEdge, GraphNode, GraphRead

ENTITY_TYPE_COMPANY = "company"
ENTITY_RELATIONSHIP_TYPES = ("owner", "operator", "ship_manager", "ism_manager")


class GraphService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def for_vessel(self, vessel_id: int) -> GraphRead | None:
        vessel = await self.session.get(Vessel, vessel_id)
        if vessel is None:
            return None

        nodes = {
            f"vessel:{vessel.id}": GraphNode(
                id=f"vessel:{vessel.id}",
                type="vessel",
                label=vessel.name,
                summary={"imo": vessel.imo, "mmsi": vessel.mmsi, "flag": vessel.flag_country_code},
            )
        }
        edges: list[GraphEdge] = []

        rows = await self.session.execute(
            select(Relationship, Entity)
            .join(Entity, Entity.id == Relationship.to_entity_id)
            .where(Relationship.vessel_id == vessel.id)
            .where(Entity.entity_type == ENTITY_TYPE_COMPANY)
            .where(Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES))
            .order_by(Relationship.relationship_type, Entity.name)
        )
        for relationship, entity in rows:
            entity_id = f"entity:{entity.id}"
            nodes[entity_id] = GraphNode(
                id=entity_id,
                type=entity.entity_type,
                label=entity.name,
                summary={"country": entity.country_code},
            )
            edges.append(
                GraphEdge(
                    id=f"relationship:{relationship.id}",
                    source=f"vessel:{vessel.id}",
                    target=entity_id,
                    type=relationship.relationship_type,
                    confidence=relationship.confidence,
                    evidence_id=relationship.evidence_id,
                    summary=relationship.evidence_summary,
                )
            )

        risk_rows = await self.session.scalars(
            select(RiskFlag).where(RiskFlag.vessel_id == vessel.id, RiskFlag.status == "active")
        )
        for risk in risk_rows:
            risk_id = f"risk:{risk.id}"
            nodes[risk_id] = GraphNode(
                id=risk_id,
                type="risk",
                label=risk.flag_type,
                summary={"severity": risk.severity, "summary": risk.summary},
            )
            edges.append(
                GraphEdge(
                    id=f"risk-edge:{risk.id}",
                    source=f"vessel:{vessel.id}",
                    target=risk_id,
                    type="has_risk_flag",
                    evidence_id=risk.evidence_id,
                )
            )

        return GraphRead(nodes=list(nodes.values()), edges=edges)

    async def for_entity(self, entity_id: int) -> GraphRead | None:
        entity = await self.session.get(Entity, entity_id)
        if entity is None or entity.entity_type != ENTITY_TYPE_COMPANY:
            return None

        nodes = {
            f"entity:{entity.id}": GraphNode(
                id=f"entity:{entity.id}",
                type=entity.entity_type,
                label=entity.name,
                summary={"country": entity.country_code},
            )
        }
        edges: list[GraphEdge] = []
        rows = await self.session.execute(
            select(Relationship, Vessel)
            .join(Vessel, Vessel.id == Relationship.vessel_id)
            .where(Relationship.to_entity_id == entity.id)
            .where(Relationship.relationship_type.in_(ENTITY_RELATIONSHIP_TYPES))
            .order_by(Vessel.name)
        )
        for relationship, vessel in rows:
            vessel_id = f"vessel:{vessel.id}"
            nodes[vessel_id] = GraphNode(
                id=vessel_id,
                type="vessel",
                label=vessel.name,
                summary={"imo": vessel.imo, "mmsi": vessel.mmsi, "flag": vessel.flag_country_code},
            )
            edges.append(
                GraphEdge(
                    id=f"relationship:{relationship.id}",
                    source=vessel_id,
                    target=f"entity:{entity.id}",
                    type=relationship.relationship_type,
                    confidence=relationship.confidence,
                    evidence_id=relationship.evidence_id,
                    summary=relationship.evidence_summary,
                )
            )
        return GraphRead(nodes=list(nodes.values()), edges=edges)
