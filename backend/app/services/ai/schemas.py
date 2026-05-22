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


class BriefSupportMixin(BaseModel):
    support_ids: list[str] = Field(default_factory=list)
    article_ids: list[int] = Field(default_factory=list)
    evidence_ids: list[int] = Field(default_factory=list)
    citations: list[BriefCitation] = Field(default_factory=list)


class BriefMetricCard(BriefSupportMixin):
    model_config = ConfigDict(extra="ignore")

    label: str
    value: str
    delta: str | None = None
    tone: Literal["neutral", "up", "down", "warning"] = "neutral"


class BriefRiskChange(BriefSupportMixin):
    model_config = ConfigDict(extra="ignore")

    vessel_id: int | None = None
    vessel_name: str
    change: str
    severity: RiskLevel = "low"
    summary: str


class BriefEntityLinkageChange(BriefSupportMixin):
    model_config = ConfigDict(extra="ignore")

    entity_id: int | None = None
    entity_name: str
    change: str
    relationship_type: str | None = None
    summary: str


class BriefOperationalItem(BriefSupportMixin):
    model_config = ConfigDict(extra="ignore")

    title: str
    summary: str
    signal_type: Literal["ais_gap", "flag_change", "ownership_change", "voyage_port_irregularity", "port_activity", "platform_delta", "method_gap"] = "platform_delta"
    severity: RiskLevel = "none"


class BriefNewsRow(BriefSupportMixin):
    """A source row summarized from stored articles."""

    model_config = ConfigDict(extra="ignore")

    title: str
    source: str | None = None
    summary: str = ""
    source_quality: str | None = None


class BriefPlatformSignals(BaseModel):
    """SEAM-internal deltas since the previous brief.

    Kept for compatibility with older clients; the weekly brief presents
    the same information through metric cards and operational context.
    """

    model_config = ConfigDict(extra="ignore")

    new_risk_flags: int = 0
    new_port_events: int = 0
    new_evidence_records: int = 0
    since: datetime | None = None


class AiNewsOverviewPayload(BaseModel):
    """Schema for SEAM's evidence-first AI Weekly Brief."""

    model_config = ConfigDict(extra="ignore")

    headline: str
    executive_summary: str
    metric_cards: list[BriefMetricCard] = Field(default_factory=list)
    vessel_risk_changes: list[BriefRiskChange] = Field(default_factory=list)
    entity_linkage_changes: list[BriefEntityLinkageChange] = Field(default_factory=list)
    operational_context: list[BriefOperationalItem] = Field(default_factory=list)
    news_rows: list[BriefNewsRow] = Field(default_factory=list)
    method_note: str = ""
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
    global_metrics: dict[str, Any] = Field(default_factory=dict)
    previous_window: dict[str, Any] = Field(default_factory=dict)
    vessel_risk_changes: list[dict[str, Any]] = Field(default_factory=list)
    entity_linkage_changes: list[dict[str, Any]] = Field(default_factory=list)
    operational_context: list[dict[str, Any]] = Field(default_factory=list)
    method_gaps: list[str] = Field(default_factory=list)
