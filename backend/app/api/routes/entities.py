from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.entities import EntityRead, EntityRelationshipRead
from app.schemas.risk import RiskFlagRead
from app.schemas.vessels import VesselSummary
from app.services.entities import EntityService
from app.services.risk import RiskService

router = APIRouter(prefix="/api/entities", tags=["entities"])


@router.get("/search", response_model=list[EntityRead])
async def search_entities(
    session: Annotated[AsyncSession, Depends(get_session)],
    q: Annotated[str, Query(min_length=1)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[EntityRead]:
    return await EntityService(session).search(query=q, limit=limit, offset=offset)


@router.get("", response_model=list[EntityRead])
async def list_entities(
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[EntityRead]:
    """Recent-first list of entities — used by EntityListInspector when
    no search query is active so the page shows real rows on first
    paint instead of an empty state."""
    return await EntityService(session).list_recent(limit=limit, offset=offset)


@router.get("/{entity_id}", response_model=EntityRead)
async def get_entity(session: Annotated[AsyncSession, Depends(get_session)], entity_id: int) -> EntityRead:
    entity = await EntityService(session).get(entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.get("/{entity_id}/vessels", response_model=list[VesselSummary])
async def get_entity_vessels(
    session: Annotated[AsyncSession, Depends(get_session)], entity_id: int
) -> list[VesselSummary]:
    vessels = await EntityService(session).vessels(entity_id)
    if vessels is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    return vessels


@router.get("/{entity_id}/relationships", response_model=list[EntityRelationshipRead])
async def get_entity_relationships(
    session: Annotated[AsyncSession, Depends(get_session)],
    entity_id: int,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[EntityRelationshipRead]:
    relationships = await EntityService(session).relationships(entity_id, limit=limit)
    if relationships is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    return relationships


@router.get("/{entity_id}/risk-flags", response_model=list[RiskFlagRead])
async def get_entity_risk_flags(
    session: Annotated[AsyncSession, Depends(get_session)], entity_id: int
) -> list[RiskFlagRead]:
    return await RiskService(session).for_entity(entity_id)
