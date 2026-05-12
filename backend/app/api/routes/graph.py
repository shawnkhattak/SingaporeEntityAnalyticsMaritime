from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.graph import GraphRead
from app.services.graph import GraphService

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/vessels/{vessel_id}", response_model=GraphRead)
async def get_vessel_graph(
    session: Annotated[AsyncSession, Depends(get_session)],
    vessel_id: int,
) -> GraphRead:
    graph = await GraphService(session).for_vessel(vessel_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return graph


@router.get("/entities/{entity_id}", response_model=GraphRead)
async def get_entity_graph(
    session: Annotated[AsyncSession, Depends(get_session)],
    entity_id: int,
) -> GraphRead:
    graph = await GraphService(session).for_entity(entity_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    return graph
