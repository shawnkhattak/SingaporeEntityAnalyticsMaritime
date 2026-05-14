from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.vessels import VesselEventRead
from app.services.ports import PortService

router = APIRouter(prefix="/api/ports", tags=["ports"])


@router.get("/activity", response_model=list[VesselEventRead])
async def list_port_activity(
    session: Annotated[AsyncSession, Depends(get_session)],
    kind: Annotated[Literal["due-arrive", "due-depart", "movement"] | None, Query()] = None,
    activity_date: Annotated[date | None, Query(alias="date")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[VesselEventRead]:
    return await PortService(session).activity(kind=kind, limit=limit, activity_date=activity_date)
