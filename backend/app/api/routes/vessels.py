from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.risk import RiskFlagRead
from app.schemas.vessels import VesselDetail, VesselEventRead, VesselObservationRead, VesselSearchResult
from app.services.risk import RiskService
from app.services.vessels import VesselService

router = APIRouter(prefix="/api/vessels", tags=["vessels"])


@router.get("/search", response_model=list[VesselSearchResult])
async def search_vessels(
    session: Annotated[AsyncSession, Depends(get_session)],
    q: Annotated[str, Query(min_length=1)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[VesselSearchResult]:
    return await VesselService(session).search(query=q, limit=limit)


@router.get("/{vessel_id}", response_model=VesselDetail)
async def get_vessel(
    session: Annotated[AsyncSession, Depends(get_session)],
    vessel_id: int,
) -> VesselDetail:
    detail = await VesselService(session).detail(vessel_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return detail


@router.get("/{vessel_id}/observations", response_model=list[VesselObservationRead])
async def get_vessel_observations(
    session: Annotated[AsyncSession, Depends(get_session)],
    vessel_id: int,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> list[VesselObservationRead]:
    observations = await VesselService(session).observations(vessel_id, limit=limit)
    if observations is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return observations


@router.get("/{vessel_id}/events", response_model=list[VesselEventRead])
async def get_vessel_events(
    session: Annotated[AsyncSession, Depends(get_session)],
    vessel_id: int,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[VesselEventRead]:
    events = await VesselService(session).events(vessel_id, limit=limit)
    if events is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return events


@router.get("/{vessel_id}/risk-flags", response_model=list[RiskFlagRead])
async def get_vessel_risk_flags(
    session: Annotated[AsyncSession, Depends(get_session)],
    vessel_id: int,
) -> list[RiskFlagRead]:
    if await VesselService(session).detail(vessel_id) is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return await RiskService(session).for_vessel(vessel_id)
