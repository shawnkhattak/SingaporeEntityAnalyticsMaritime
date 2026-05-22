"""SEAM AI Weekly Brief — generation + caching service.

Deterministic SEAM services build the fact pack first. Providers only
phrase that structured fact pack, then the service validates support IDs
before persisting the result in `ai_news_overviews`.
"""
from __future__ import annotations

import re
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
)
from app.services.ingestion import stable_payload_hash


PROMPT_VERSION = "agentic-weekly-brief-v1"
WEEKLY_SCOPE = "agentic_weekly_brief"
BLOCKED_PHRASES = (
    "take action",
    "recommended",
    "recommendation",
    "likely",
    "critical impact",
    "must",
    "should",
)

EMPTY_OVERVIEW = AiNewsOverviewPayload(
    headline="Weekly brief: no supported developments in this window",
    executive_summary="No scoped source coverage or deterministic SEAM changes were available for this weekly window.",
    metric_cards=[],
    vessel_risk_changes=[],
    entity_linkage_changes=[],
    operational_context=[],
    news_rows=[],
    method_note="Generated from deterministic SEAM fact-pack fields only.",
    platform_signals=BriefPlatformSignals(),
    coverage_gaps=["No scoped source coverage in the selected weekly window."],
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
                disabled_reason="AI features are disabled. Set FEATURE_AI=true to enable the AI Weekly Brief.",
                scope=WEEKLY_SCOPE,
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
                scope=WEEKLY_SCOPE,
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
        cached = None if force else await self._cached(input_hash, provider_name=provider_name, model_name=model_name)
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

        try:
            raw = await provider.generate_news_overview(packet_dict)
        except Exception as exc:
            warnings.append(f"{getattr(provider, 'name', 'AI')} provider failed; falling back to mock: {exc}")
            provider = MockNewsProvider(self.settings)
            raw = await provider.generate_news_overview(packet_dict)
        payload = AiNewsOverviewPayload.model_validate(self._coerce(raw, packet_dict))
        payload, validation_warnings = self._validate_payload(payload, packet_dict)
        warnings.extend(validation_warnings)
        payload, fallback_warnings = await self._fill_missing_from_fallback(payload, packet_dict)
        warnings.extend(fallback_warnings)
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
            scope=WEEKLY_SCOPE,
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

    def _coerce(self, raw: dict[str, Any], packet_dict: dict[str, Any] | None = None) -> dict[str, Any]:
        """Light coercion so AI / mock output validates cleanly."""
        data = dict(raw)
        data.setdefault("headline", "Weekly brief")
        data.setdefault("executive_summary", "")
        data.setdefault("metric_cards", [])
        data.setdefault("vessel_risk_changes", [])
        data.setdefault("entity_linkage_changes", [])
        data.setdefault("operational_context", [])
        data.setdefault("news_rows", [])
        data.setdefault("method_note", "Generated from deterministic SEAM fact-pack fields only.")
        data.setdefault("coverage_gaps", [])
        data.pop("platform_signals", None)  # runtime overwrites
        if not data["metric_cards"] and packet_dict is not None:
            metrics = packet_dict.get("global_metrics") or {}
            data["metric_cards"] = [
                {
                    "label": "News sources",
                    "value": f"{packet_dict.get('article_count', 0)} articles / {packet_dict.get('source_count', 0)} sources",
                    "support_ids": ["metric:articles", "metric:sources"],
                    "article_ids": packet_dict.get("article_ids", [])[:12],
                    "evidence_ids": [],
                },
                {
                    "label": "Risk flags",
                    "value": str(metrics.get("new_risk_flags", 0)),
                    "support_ids": ["metric:risk_flags"],
                    "article_ids": [],
                    "evidence_ids": [],
                },
            ]
        for section in ("metric_cards", "vessel_risk_changes", "entity_linkage_changes", "operational_context", "news_rows"):
            if not isinstance(data.get(section), list):
                data[section] = []
        for section in ("metric_cards", "vessel_risk_changes", "entity_linkage_changes", "operational_context", "news_rows"):
            for item in data.get(section, []):
                if not isinstance(item, dict):
                    continue
                item.setdefault("support_ids", [])
                item.setdefault("article_ids", [])
                item.setdefault("evidence_ids", [])
        for item in data.get("metric_cards", []):
            if not isinstance(item, dict):
                continue
            item.setdefault("label", "Metric")
            item.setdefault("value", "0")
            item.setdefault("delta", None)
            if item.get("tone") not in {"neutral", "up", "down", "warning"}:
                item["tone"] = "neutral"
        for item in data.get("vessel_risk_changes", []):
            if not isinstance(item, dict):
                continue
            item.setdefault("vessel_id", None)
            item.setdefault("vessel_name", "Vessel")
            item.setdefault("change", "Stored risk change")
            item.setdefault("summary", "")
            item.setdefault("severity", "low")
            if item.get("severity") == "high":
                item["severity"] = "critical"
            if item.get("severity") not in {"critical", "medium", "low", "none"}:
                item["severity"] = "low"
        for item in data.get("entity_linkage_changes", []):
            if not isinstance(item, dict):
                continue
            item.setdefault("entity_id", None)
            item.setdefault("entity_name", "Entity")
            item.setdefault("change", "Stored linkage change")
            item.setdefault("relationship_type", None)
            item.setdefault("summary", "")
        for item in data.get("operational_context", []):
            if not isinstance(item, dict):
                continue
            item.setdefault("title", "Operational context")
            item.setdefault("summary", "")
            if item.get("signal_type") not in {
                "ais_gap",
                "flag_change",
                "ownership_change",
                "voyage_port_irregularity",
                "port_activity",
                "platform_delta",
                "method_gap",
            }:
                item["signal_type"] = "platform_delta"
            item.setdefault("severity", "none")
            if item.get("severity") == "high":
                item["severity"] = "critical"
            if item.get("severity") not in {"critical", "medium", "low", "none"}:
                item["severity"] = "none"
        for item in data.get("news_rows", []):
            if not isinstance(item, dict):
                continue
            item.setdefault("title", "Stored source")
            item.setdefault("source", None)
            item.setdefault("summary", "")
            item.setdefault("source_quality", None)
        return data

    def _attach_citations(self, payload: AiNewsOverviewPayload, packet_dict: dict[str, Any]) -> AiNewsOverviewPayload:
        """Resolve article_ids on each substantive item into citation chips.

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
        items = [
            *payload.vessel_risk_changes,
            *payload.entity_linkage_changes,
            *payload.operational_context,
            *payload.news_rows,
            *payload.metric_cards,
        ]
        for item in items:
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

    def _validate_payload(self, payload: AiNewsOverviewPayload, packet_dict: dict[str, Any]) -> tuple[AiNewsOverviewPayload, list[str]]:
        warnings: list[str] = []
        valid_articles = {int(id_) for id_ in packet_dict.get("article_ids", []) if isinstance(id_, int)}
        valid_evidence = {int(id_) for id_ in packet_dict.get("evidence_ids", []) if isinstance(id_, int)}
        for section in ("vessel_risk_changes", "entity_linkage_changes", "operational_context"):
            for item in packet_dict.get(section, []) or []:
                if isinstance(item, dict):
                    valid_evidence.update(int(id_) for id_ in item.get("evidence_ids", []) if isinstance(id_, int))
        support_prefixes = ("metric:", "risk_flag:", "relationship:", "latest_position:", "port_event:", "source_observation:", "article:")

        def clean_text(value: str) -> str:
            text = value or ""
            lowered = text.casefold()
            for phrase in BLOCKED_PHRASES:
                if phrase in lowered:
                    text = re.sub(re.escape(phrase), "", text, flags=re.IGNORECASE)
                    warnings.append(f"Removed action-oriented phrase: {phrase}")
                    lowered = text.casefold()
            return " ".join(text.split())

        def supported(item: Any) -> bool:
            support_ids = [sid for sid in getattr(item, "support_ids", []) if isinstance(sid, str)]
            article_ids = [id_ for id_ in getattr(item, "article_ids", []) if id_ in valid_articles]
            evidence_ids = [id_ for id_ in getattr(item, "evidence_ids", []) if id_ in valid_evidence]
            item.article_ids = article_ids
            item.evidence_ids = evidence_ids
            item.support_ids = [sid for sid in support_ids if sid.startswith(support_prefixes)]
            return bool(item.support_ids or item.article_ids or item.evidence_ids)

        payload.headline = clean_text(payload.headline) or EMPTY_OVERVIEW.headline
        payload.executive_summary = clean_text(payload.executive_summary) or EMPTY_OVERVIEW.executive_summary
        payload.method_note = clean_text(payload.method_note) or EMPTY_OVERVIEW.method_note
        for collection_name in ("metric_cards", "vessel_risk_changes", "entity_linkage_changes", "operational_context", "news_rows"):
            kept = []
            for item in getattr(payload, collection_name):
                for field in ("label", "value", "delta", "title", "vessel_name", "entity_name", "change", "summary", "source_quality"):
                    if hasattr(item, field):
                        value = getattr(item, field)
                        if isinstance(value, str):
                            setattr(item, field, clean_text(value))
                if supported(item):
                    kept.append(item)
                else:
                    warnings.append(f"Dropped unsupported weekly brief item from {collection_name}.")
            setattr(payload, collection_name, kept)
        payload.coverage_gaps = [clean_text(gap) for gap in payload.coverage_gaps if clean_text(gap)]
        return payload, warnings

    async def _fill_missing_from_fallback(
        self,
        payload: AiNewsOverviewPayload,
        packet_dict: dict[str, Any],
    ) -> tuple[AiNewsOverviewPayload, list[str]]:
        warnings: list[str] = []
        needs_fallback = (
            not payload.metric_cards
            or (bool(packet_dict.get("articles")) and not payload.news_rows)
            or (bool(packet_dict.get("vessel_risk_changes")) and not payload.vessel_risk_changes)
            or (bool(packet_dict.get("entity_linkage_changes")) and not payload.entity_linkage_changes)
            or (bool(packet_dict.get("operational_context")) and not payload.operational_context)
        )
        if not needs_fallback:
            return payload, warnings

        raw_fallback = await MockNewsProvider(self.settings).generate_news_overview(packet_dict)
        fallback = AiNewsOverviewPayload.model_validate(self._coerce(raw_fallback, packet_dict))
        fallback, validation_warnings = self._validate_payload(fallback, packet_dict)
        warnings.extend(validation_warnings)

        if not payload.metric_cards and fallback.metric_cards:
            payload.metric_cards = fallback.metric_cards
            warnings.append("Filled metric cards from deterministic fallback.")
        if packet_dict.get("articles") and not payload.news_rows and fallback.news_rows:
            payload.news_rows = fallback.news_rows
            warnings.append("Filled news rows from deterministic fallback.")
        if packet_dict.get("vessel_risk_changes") and not payload.vessel_risk_changes and fallback.vessel_risk_changes:
            payload.vessel_risk_changes = fallback.vessel_risk_changes
            warnings.append("Filled vessel risk changes from deterministic fallback.")
        if packet_dict.get("entity_linkage_changes") and not payload.entity_linkage_changes and fallback.entity_linkage_changes:
            payload.entity_linkage_changes = fallback.entity_linkage_changes
            warnings.append("Filled entity linkage changes from deterministic fallback.")
        if packet_dict.get("operational_context") and not payload.operational_context and fallback.operational_context:
            payload.operational_context = fallback.operational_context
            warnings.append("Filled operational context from deterministic fallback.")
        if not payload.coverage_gaps and fallback.coverage_gaps:
            payload.coverage_gaps = fallback.coverage_gaps
        return payload, warnings
