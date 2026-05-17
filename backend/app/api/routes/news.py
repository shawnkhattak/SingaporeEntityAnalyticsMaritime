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
    source_badge: str | None = None
    bundle_name: str | None = None
    title: str
    url: str
    published_at: datetime | None
    summary: str | None
    image: str | None = None


@router.get("", response_model=list[NewsArticleRead])
async def list_news(
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    bundle_name: Annotated[str | None, Query()] = None,
) -> list[NewsArticleRead]:
    """Most-recent-first news article listing.

    Backs the NewsInspector — previously the inspector filtered
    `getRecentObservations()` for an `observation_type` that never
    appeared, so the page always rendered zero rows.
    """
    statement = select(NewsArticle).order_by(desc(NewsArticle.published_at), desc(NewsArticle.id)).limit(limit)
    if bundle_name:
        statement = statement.where(NewsArticle.raw_payload["bundle_name"].astext == bundle_name)
    rows = await session.scalars(statement)
    return [
        NewsArticleRead(
            id=row.id,
            source=row.source,
            source_badge=(row.raw_payload or {}).get("source_badge"),
            bundle_name=(row.raw_payload or {}).get("bundle_name"),
            title=row.title,
            url=row.url,
            published_at=row.published_at,
            summary=row.summary,
            image=(row.raw_payload or {}).get("image"),
        )
        for row in rows
    ]
