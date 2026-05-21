from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


RiskLevel = Literal["critical", "medium", "low", "none"]


class BriefCitation(BaseModel):
    """Reference to a single source article that supports a brief item."""

    id: int
    title: str
    source: str
    url: str


class BriefWatchItem(BaseModel):
    """A single item on the analyst's morning checklist.

    `kind` is the action verb the brief recommends:
      - "action"      → take operational action this shift
      - "investigate" → open the evidence chain and confirm
      - "monitor"     → keep on the radar; no action required yet
    """

    model_config = ConfigDict(extra="ignore")

    kind: Literal["action", "investigate", "monitor"] = "monitor"
    title: str
    subject: str | None = None
    summary: str
    severity: RiskLevel = "low"
    article_ids: list[int] = Field(default_factory=list)
    evidence_ids: list[int] = Field(default_factory=list)
    citations: list[BriefCitation] = Field(default_factory=list)


class BriefTheme(BaseModel):
    """A thematic bucket of Singapore coverage."""

    model_config = ConfigDict(extra="ignore")

    title: str
    article_count: int = 0
    one_line: str = ""
    article_ids: list[int] = Field(default_factory=list)


class BriefPlatformSignals(BaseModel):
    """SEAM-internal deltas since the previous brief."""

    model_config = ConfigDict(extra="ignore")

    new_risk_flags: int = 0
    new_port_events: int = 0
    new_evidence_records: int = 0
    since: datetime | None = None


class AiNewsOverviewPayload(BaseModel):
    """Schema for the Singapore Analyst Brief.

    Designed to read like a maritime intelligence morning brief, not a
    press release. The top of the brief is a single-sentence headline
    plus a one-paragraph bottom line that answers *should I act today*.
    The watch list is the analyst's prioritized action queue. Themes
    give a scannable map of what the source set is covering. Platform
    signals fuse SEAM's own ingested risk flags and port events so the
    brief is more than a news roll-up.
    """

    model_config = ConfigDict(extra="ignore")

    headline: str
    bottom_line: str
    watch_items: list[BriefWatchItem] = Field(default_factory=list)
    themes: list[BriefTheme] = Field(default_factory=list)
    platform_signals: BriefPlatformSignals = Field(default_factory=BriefPlatformSignals)
    coverage_gaps: list[str] = Field(default_factory=list)


class AiNewsDebugInfo(BaseModel):
    input_hash: str | None = None
    cache_hit: bool = False
    candidate_article_count: int = 0
    selected_article_count: int = 0
    selected_article_ids: list[int] = Field(default_factory=list)
    reason: str
    warnings: list[str] = Field(default_factory=list)
    schema_valid: bool = True
    input_tokens: int | None = None
    output_tokens: int | None = None
    estimated_cost_usd: float | None = None


class AiNewsOverviewRead(BaseModel):
    id: int | None = None
    status: Literal["ready", "disabled", "error"] = "ready"
    disabled_reason: str | None = None
    scope: str
    window_hours: int
    generated_at: datetime | None = None
    article_count: int
    source_count: int
    model_provider: str
    model_name: str
    overview: AiNewsOverviewPayload
    debug: AiNewsDebugInfo


class ScoredNewsArticle(BaseModel):
    id: int
    title: str
    summary: str | None = None
    source: str
    source_badge: str | None = None
    bundle_name: str | None = None
    published_at: datetime | None = None
    url: str
    image: str | None = None
    evidence_ids: list[int] = Field(default_factory=list)
    linked_vessel_ids: list[int] = Field(default_factory=list)
    linked_entity_ids: list[int] = Field(default_factory=list)
    linked_vessels: list[dict[str, Any]] = Field(default_factory=list)
    linked_entities: list[dict[str, Any]] = Field(default_factory=list)
    matched_text: list[str] = Field(default_factory=list)
    relevance_score: int = 0
    relevance_reasons: list[str] = Field(default_factory=list)
    source_quality: str = "Unclassified source"


class AiNewsFactPacket(BaseModel):
    scope: str
    window_hours: int
    window_start: datetime
    window_end: datetime
    bundle_name: str | None = None
    candidate_article_count: int = 0
    selected_article_count: int = 0
    article_count: int = 0
    source_count: int = 0
    evidence_ids: list[int] = Field(default_factory=list)
    article_ids: list[int] = Field(default_factory=list)
    linked_vessel_ids: list[int] = Field(default_factory=list)
    linked_entity_ids: list[int] = Field(default_factory=list)
    articles: list[ScoredNewsArticle] = Field(default_factory=list)
    risk_context: dict[str, int] = Field(default_factory=dict)
