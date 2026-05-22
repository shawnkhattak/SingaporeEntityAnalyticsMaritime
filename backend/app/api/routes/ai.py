from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db import get_session
from app.schemas.ai import AiNewsOverviewRead
from app.services.ai.news_overview import AiNewsOverviewService

router = APIRouter(tags=["ai"])


def require_dev_mutations(settings: Annotated[Settings, Depends(get_settings)]) -> Settings:
    if not settings.feature_mutations or settings.environment not in {"development", "local", "test"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return settings


async def _get_weekly_brief(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    window_hours: int,
    bundle_name: str | None,
) -> AiNewsOverviewRead:
    return await AiNewsOverviewService(session, settings).get_overview(
        window_hours=window_hours,
        bundle_name=bundle_name,
        generate_if_missing=False,
    )


@router.get("/api/ai/weekly-brief", response_model=AiNewsOverviewRead)
async def get_ai_weekly_brief(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    window_hours: Annotated[int, Query(ge=1, le=168)] = 168,
    bundle_name: Annotated[str | None, Query()] = None,
) -> AiNewsOverviewRead:
    return await _get_weekly_brief(session, settings, window_hours, bundle_name)


@router.get("/api/ai/news-overview", response_model=AiNewsOverviewRead)
async def get_ai_news_overview(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    window_hours: Annotated[int, Query(ge=1, le=168)] = 168,
    bundle_name: Annotated[str | None, Query()] = None,
) -> AiNewsOverviewRead:
    return await _get_weekly_brief(session, settings, window_hours, bundle_name)


@router.post(
    "/api/dev/ai/weekly-brief/recompute",
    response_model=AiNewsOverviewRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def recompute_ai_weekly_brief(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    window_hours: Annotated[int, Query(ge=1, le=168)] = 168,
    bundle_name: Annotated[str | None, Query()] = None,
) -> AiNewsOverviewRead:
    return await AiNewsOverviewService(session, settings).get_overview(window_hours=window_hours, bundle_name=bundle_name, force=True)


@router.post(
    "/api/dev/ai/news-overview/recompute",
    response_model=AiNewsOverviewRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def recompute_ai_news_overview(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    window_hours: Annotated[int, Query(ge=1, le=168)] = 168,
    bundle_name: Annotated[str | None, Query()] = None,
) -> AiNewsOverviewRead:
    return await AiNewsOverviewService(session, settings).get_overview(window_hours=window_hours, bundle_name=bundle_name, force=True)
