"""Singapore Analyst Brief — generation + caching service.

Pipeline:
    NewsFactPacketService  →  AnthropicNewsProvider (or MockNewsProvider)
                            →  AiNewsOverviewPayload  (analyst case-file shape)
                            →  cached row in `ai_news_overviews`

The brief shape is defined in `schemas.py` (Singapore Analyst Brief).
It deliberately reads like a desk officer's morning note rather than a
press summary. The runtime fuses news output with SEAM platform deltas
(new risk flags / port events / evidence records since the prior brief)
to give the analyst a single starting card.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.evidence import SourceObservation
from app.models.maritime import PortEvent
from app.models.risk import AiNewsOverview, RiskFlag
from app.services.ai.mock_provider import MockNewsProvider
from app.services.ai.news_fact_packet import NewsFactPacketService
from app.services.ai.provider import get_ai_provider
from app.services.ai.schemas import (
    AiNewsDebugInfo,
    AiNewsOverviewPayload,
    AiNewsOverviewRead,
    BriefCitation,
    BriefPlatformSignals,
    BriefTheme,
    BriefWatchItem,
)
from app.services.ingestion import stable_payload_hash


PROMPT_VERSION = "singapore-analyst-brief-v2"

EMPTY_OVERVIEW = AiNewsOverviewPayload(
    headline="No Singapore maritime developments in window",
    bottom_line=(
        "No Singapore-relevant source coverage in this window. Refresh RSS feeds and "
        "regenerate when Singapore coverage is in the source set."
    ),
    watch_items=[],
    themes=[],
    platform_signals=BriefPlatformSignals(),
    coverage_gaps=["No Singapore-relevant articles in the selected time window."],
)


class AiNewsOverviewService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings

    async def get_overview(
        self,
        window_hours: int | None = None,
        bundle_name: str | None = None,
        force: bool = False,
        generate_if_missing: bool = True,
    ) -> AiNewsOverviewRead:
        window_hours = window_hours or self.settings.ai_news_window_hours
        if not self.settings.feature_ai:
            return AiNewsOverviewRead(
                status="disabled",
                disabled_reason="AI features are disabled. Set FEATURE_AI=true to enable the Singapore Brief.",
                scope="singapore_maritime_news",
                window_hours=window_hours,
                generated_at=None,
                article_count=0,
                source_count=0,
                model_provider=self.settings.ai_provider,
                model_name=self.settings.ai_model,
                overview=EMPTY_OVERVIEW,
                debug=AiNewsDebugInfo(reason="feature_ai_disabled"),
            )

        provider, warnings = await get_ai_provider(self.settings)
        provider_name = getattr(provider, "name", "mock")
        model_name = getattr(provider, "model_name", self.settings.ai_model)

        if not force and not generate_if_missing:
            latest = await self._latest(provider_name=provider_name, model_name=model_name, bundle_name=bundle_name)
            if latest:
                payload = AiNewsOverviewPayload.model_validate(latest.overview_json or {})
                payload.platform_signals = await self._platform_signals(latest.generated_at)
                debug = {
                    **(latest.debug_json or {}),
                    "cache_hit": True,
                    "reason": "latest_saved_result",
                    "warnings": [*(latest.debug_json or {}).get("warnings", []), *warnings],
                }
                return self._read(latest, payload=payload, window_hours=window_hours, status="ready", debug=debug)
            return AiNewsOverviewRead(
                status="ready",
                disabled_reason=None,
                scope="singapore_maritime_news",
                window_hours=window_hours,
                generated_at=None,
                article_count=0,
                source_count=0,
                model_provider=provider_name,
                model_name=model_name,
                overview=EMPTY_OVERVIEW,
                debug=AiNewsDebugInfo(reason="no_saved_brief", warnings=warnings),
            )

        packet = await NewsFactPacketService(self.session).build(
            window_hours=window_hours,
            bundle_name=bundle_name,
            max_articles=self.settings.ai_news_max_articles,
        )
        packet_dict = packet.model_dump(mode="json")
        previous = await self._latest(provider_name=provider_name, model_name=model_name, bundle_name=bundle_name)
        if previous is not None:
            previous_overview = previous.overview_json or {}
            packet_dict["previous_brief"] = {
                "generated_at": previous.generated_at.isoformat() if previous.generated_at else None,
                "article_ids": previous.article_ids or [],
                "headline": previous_overview.get("headline"),
            }
        input_hash = stable_payload_hash(packet_dict)
        cached = await self._cached(input_hash, provider_name=provider_name, model_name=model_name)
        if cached and not force:
            payload = AiNewsOverviewPayload.model_validate(cached.overview_json or {})
            payload.platform_signals = await self._platform_signals(cached.generated_at)
            debug = {
                **(cached.debug_json or {}),
                "cache_hit": True,
                "reason": "fresh_cached_result",
                "warnings": [*(cached.debug_json or {}).get("warnings", []), *warnings],
            }
            return self._read(cached, payload=payload, window_hours=window_hours, status="ready", debug=debug)

        if not packet.articles:
            payload = EMPTY_OVERVIEW.model_copy(deep=True)
            raw_response = payload.model_dump(mode="json")
        else:
            try:
                raw = await provider.generate_news_overview(packet_dict)
            except Exception as exc:
                warnings.append(f"{getattr(provider, 'name', 'AI')} provider failed; falling back to mock: {exc}")
                provider = MockNewsProvider(self.settings)
                raw = await provider.generate_news_overview(packet_dict)
            payload = AiNewsOverviewPayload.model_validate(self._coerce(raw))
            if packet.articles and not payload.watch_items:
                warnings.append("AI provider returned no watch items; filling brief from deterministic fallback.")
                fallback = await MockNewsProvider(self.settings).generate_news_overview(packet_dict)
                merged = {
                    **payload.model_dump(mode="json"),
                    "watch_items": fallback.get("watch_items", []),
                    "themes": fallback.get("themes", payload.themes),
                    "coverage_gaps": fallback.get("coverage_gaps", payload.coverage_gaps),
                }
                payload = AiNewsOverviewPayload.model_validate(self._coerce(merged))
            payload = self._attach_citations(payload, packet_dict)
            raw_response = raw

        now = datetime.now(UTC)
        payload.platform_signals = await self._platform_signals(previous.generated_at if previous else None)

        debug = AiNewsDebugInfo(
            input_hash=input_hash,
            cache_hit=False,
            candidate_article_count=packet.candidate_article_count,
            selected_article_count=packet.selected_article_count,
            selected_article_ids=packet.article_ids,
            reason="forced_regeneration" if force else "generated_new_result",
            warnings=warnings,
            schema_valid=True,
            input_tokens=(getattr(provider, "last_usage", {}) or {}).get("input_tokens"),
            output_tokens=(getattr(provider, "last_usage", {}) or {}).get("output_tokens"),
            estimated_cost_usd=(getattr(provider, "last_usage", {}) or {}).get("estimated_cost_usd"),
        ).model_dump(mode="json")

        row = AiNewsOverview(
            scope=packet.scope,
            bundle_name=bundle_name,
            window_start=packet.window_start,
            window_end=packet.window_end,
            article_count=packet.article_count,
            source_count=packet.source_count,
            evidence_ids=packet.evidence_ids,
            article_ids=packet.article_ids,
            linked_vessel_ids=packet.linked_vessel_ids,
            linked_entity_ids=packet.linked_entity_ids,
            input_hash=input_hash,
            model_provider=getattr(provider, "name", "mock"),
            model_name=getattr(provider, "model_name", self.settings.ai_model),
            prompt_version=PROMPT_VERSION,
            overview_json=payload.model_dump(mode="json"),
            debug_json=debug,
            raw_response=raw_response,
            generated_at=now,
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return self._read(row, payload=payload, window_hours=window_hours, status="ready", debug=debug)

    # --------------------- platform signals ---------------------

    async def _platform_signals(self, since: datetime | None) -> BriefPlatformSignals:
        """Count SEAM platform changes since the previous brief.

        These are *not* news — they are SEAM's own ingested deltas
        (risk flags raised, port events ingested, evidence records
        stored). They give the brief a fused intel/platform feel.
        """
        if since is None:
            since = datetime.now(UTC) - timedelta(hours=24)
        new_risk = await self.session.scalar(
            select(func.count(RiskFlag.id)).where(RiskFlag.created_at >= since)
        )
        new_events = await self.session.scalar(
            select(func.count(PortEvent.id)).where(PortEvent.created_at >= since)
        )
        new_evidence = await self.session.scalar(
            select(func.count(SourceObservation.id)).where(SourceObservation.fetched_at >= since)
        )
        return BriefPlatformSignals(
            new_risk_flags=int(new_risk or 0),
            new_port_events=int(new_events or 0),
            new_evidence_records=int(new_evidence or 0),
            since=since,
        )

    # --------------------- cache lookup ---------------------

    async def _cached(self, input_hash: str, provider_name: str, model_name: str) -> AiNewsOverview | None:
        if self.settings.ai_news_cache_minutes <= 0:
            return None
        min_generated_at = datetime.now(UTC) - timedelta(minutes=self.settings.ai_news_cache_minutes)
        return await self.session.scalar(
            select(AiNewsOverview)
            .where(
                AiNewsOverview.input_hash == input_hash,
                AiNewsOverview.model_provider == provider_name,
                AiNewsOverview.model_name == model_name,
                AiNewsOverview.generated_at >= min_generated_at,
                AiNewsOverview.prompt_version == PROMPT_VERSION,
            )
            .order_by(desc(AiNewsOverview.generated_at), desc(AiNewsOverview.id))
            .limit(1)
        )

    async def _latest(self, provider_name: str, model_name: str, bundle_name: str | None) -> AiNewsOverview | None:
        return await self.session.scalar(
            select(AiNewsOverview)
            .where(
                AiNewsOverview.model_provider == provider_name,
                AiNewsOverview.model_name == model_name,
                AiNewsOverview.prompt_version == PROMPT_VERSION,
                AiNewsOverview.bundle_name.is_(None) if bundle_name is None else AiNewsOverview.bundle_name == bundle_name,
            )
            .order_by(desc(AiNewsOverview.generated_at), desc(AiNewsOverview.id))
            .limit(1)
        )

    def _read(
        self,
        row: AiNewsOverview,
        payload: AiNewsOverviewPayload,
        window_hours: int,
        status: str,
        debug: dict[str, Any],
    ) -> AiNewsOverviewRead:
        return AiNewsOverviewRead(
            id=row.id,
            status=status,  # type: ignore[arg-type]
            disabled_reason=None,
            scope=row.scope,
            window_hours=window_hours,
            generated_at=row.generated_at,
            article_count=row.article_count,
            source_count=row.source_count,
            model_provider=row.model_provider,
            model_name=row.model_name,
            overview=payload,
            debug=AiNewsDebugInfo.model_validate(debug),
        )

    # --------------------- shaping ---------------------

    def _coerce(self, raw: dict[str, Any]) -> dict[str, Any]:
        """Light coercion so AI / mock output validates cleanly."""
        data = dict(raw)
        data.setdefault("headline", "Singapore maritime brief")
        data.setdefault("bottom_line", "")
        data.setdefault("watch_items", [])
        data.setdefault("themes", [])
        data.setdefault("coverage_gaps", [])
        data.pop("platform_signals", None)  # runtime overwrites
        for item in data.get("watch_items", []):
            if not isinstance(item, dict):
                continue
            item.setdefault("kind", "monitor")
            item.setdefault("severity", "low")
            item.setdefault("article_ids", [])
            item.setdefault("evidence_ids", [])
            item.setdefault("subject", None)
            # Old schema migration: collapse legacy "high" severity into
            # SEAM's merged "critical" tier.
            if item.get("severity") == "high":
                item["severity"] = "critical"
        for theme in data.get("themes", []):
            if not isinstance(theme, dict):
                continue
            theme.setdefault("article_count", 0)
            theme.setdefault("one_line", "")
            theme.setdefault("article_ids", [])
        return data

    def _attach_citations(self, payload: AiNewsOverviewPayload, packet_dict: dict[str, Any]) -> AiNewsOverviewPayload:
        """Resolve article_ids on each watch item into citation chips.

        The model never sees URLs — we never want to hand it a chance to
        invent them — so we attach them here from the fact packet.
        """
        articles: dict[int, dict[str, Any]] = {}
        for article in packet_dict.get("articles", []):
            if isinstance(article, dict) and article.get("id") is not None:
                try:
                    articles[int(article["id"])] = article
                except (TypeError, ValueError):
                    continue
        for item in payload.watch_items:
            citations: list[BriefCitation] = []
            seen: set[int] = set()
            for article_id in item.article_ids:
                try:
                    normalised = int(article_id)
                except (TypeError, ValueError):
                    continue
                if normalised in seen:
                    continue
                article = articles.get(normalised)
                if not article:
                    continue
                url = str(article.get("url") or "").strip()
                if not url:
                    continue
                seen.add(normalised)
                citations.append(
                    BriefCitation(
                        id=normalised,
                        title=str(article.get("title") or f"Article {normalised}"),
                        source=str(article.get("source") or article.get("source_badge") or "Source"),
                        url=url,
                    )
                )
            item.citations = citations
        return payload
