from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.risk import RiskFeedItem
from app.services.risk import RiskService

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/feed", response_model=list[RiskFeedItem])
async def get_risk_feed(
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=2000)] = 250,
    include_resolved: bool = False,
    flag_types: Annotated[list[str] | None, Query()] = None,
) -> list[RiskFeedItem]:
    """Aggregated risk feed used by RiskFeedInspector, SanctionsInspector,
    and the command palette. Pass `flag_types` to filter (repeat the
    parameter for OR semantics, e.g. `?flag_types=sanctions_match`)."""
    return await RiskService(session).feed(
        limit=limit, include_resolved=include_resolved, flag_types=flag_types
    )
