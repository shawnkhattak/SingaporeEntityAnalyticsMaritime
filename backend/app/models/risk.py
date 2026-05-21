from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import CreatedAtMixin


class RiskFlag(CreatedAtMixin, Base):
    __tablename__ = "risk_flags"
    __table_args__ = (
        CheckConstraint("vessel_id IS NOT NULL OR entity_id IS NOT NULL", name="ck_risk_flags_subject_present"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vessel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vessels.id", ondelete="CASCADE"), index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    flag_type: Mapped[str] = mapped_column(String(80))
    severity: Mapped[str] = mapped_column(String(32))
    summary: Mapped[str] = mapped_column(Text)
    evidence_id: Mapped[Optional[int]] = mapped_column(ForeignKey("source_observations.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class SanctionsRecord(CreatedAtMixin, Base):
    __tablename__ = "sanctions_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    entity_id: Mapped[Optional[int]] = mapped_column(ForeignKey("entities.id", ondelete="SET NULL"), index=True)
    vessel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vessels.id", ondelete="SET NULL"), index=True)
    source: Mapped[str] = mapped_column(String(80))
    program: Mapped[Optional[str]] = mapped_column(String(255))
    matched_name: Mapped[str] = mapped_column(String(255))
    confidence: Mapped[str] = mapped_column(String(32))
    evidence_id: Mapped[Optional[int]] = mapped_column(ForeignKey("source_observations.id", ondelete="SET NULL"))


class NewsArticle(CreatedAtMixin, Base):
    __tablename__ = "news_articles"
    __table_args__ = (UniqueConstraint("url", name="uq_news_articles_url"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    source: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(Text)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB)


class NewsLink(CreatedAtMixin, Base):
    __tablename__ = "news_links"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("news_articles.id", ondelete="CASCADE"), index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    vessel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vessels.id", ondelete="CASCADE"), index=True)
    confidence: Mapped[str] = mapped_column(String(32))
    matched_text: Mapped[str] = mapped_column(String(255))
    evidence_id: Mapped[Optional[int]] = mapped_column(ForeignKey("source_observations.id", ondelete="SET NULL"))


class AiNewsOverview(CreatedAtMixin, Base):
    __tablename__ = "ai_news_overviews"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    scope: Mapped[str] = mapped_column(String(80), index=True)
    bundle_name: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    article_count: Mapped[int] = mapped_column(Integer)
    source_count: Mapped[int] = mapped_column(Integer)
    evidence_ids: Mapped[list[int]] = mapped_column(JSONB, default=list)
    article_ids: Mapped[list[int]] = mapped_column(JSONB, default=list)
    linked_vessel_ids: Mapped[list[int]] = mapped_column(JSONB, default=list)
    linked_entity_ids: Mapped[list[int]] = mapped_column(JSONB, default=list)
    input_hash: Mapped[str] = mapped_column(String(64), index=True)
    model_provider: Mapped[str] = mapped_column(String(80))
    model_name: Mapped[str] = mapped_column(String(120))
    prompt_version: Mapped[str] = mapped_column(String(80))
    overview_json: Mapped[dict] = mapped_column(JSONB)
    debug_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    raw_response: Mapped[Optional[dict]] = mapped_column(JSONB)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
