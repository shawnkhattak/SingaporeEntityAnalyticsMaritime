from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.risk import NewsArticle

router = APIRouter(prefix="/api/news", tags=["news"])


class NewsArticleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    title: str
    url: str
    published_at: datetime | None
    summary: str | None


@router.get("", response_model=list[NewsArticleRead])
async def list_news(
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[NewsArticleRead]:
    """Most-recent-first news article listing.

    Backs the NewsInspector — previously the inspector filtered
    `getRecentObservations()` for an `observation_type` that never
    appeared, so the page always rendered zero rows.
    """
    rows = await session.scalars(
        select(NewsArticle).order_by(desc(NewsArticle.published_at), desc(NewsArticle.id)).limit(limit)
    )
    return [NewsArticleRead.model_validate(row) for row in rows]
