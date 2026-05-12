from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.map import VesselMapFeature
from app.services.map import MapService

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/vessels", response_model=list[VesselMapFeature])
async def list_vessels_for_map(
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=5000)] = 500,
) -> list[VesselMapFeature]:
    service = MapService(session)
    return await service.list_vessel_positions(limit=limit)
