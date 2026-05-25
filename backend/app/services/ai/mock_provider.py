"""Deterministic mock provider for the SEAM AI Weekly Brief."""
from __future__ import annotations

import re
from typing import Any

from app.core.config import Settings


class MockNewsProvider:
    name = "mock"

    def __init__(self, settings: Settings) -> None:
        self.model_name = settings.ai_model or "mock-agentic-weekly-brief-v1"

    async def generate_news_overview(self, fact_packet: dict[str, Any]) -> dict[str, Any]:
        articles = list(fact_packet.get("selected_news") or fact_packet.get("articles") or [])
        metrics = dict(fact_packet.get("metrics") or fact_packet.get("global_metrics") or {})
        previous = dict(fact_packet.get("previous_window") or {})
        key_developments = self._news_key_developments(list(fact_packet.get("key_developments") or []))
        grouped_risk = list(fact_packet.get("grouped_risk_changes") or [])
        grouped_entities = list(fact_packet.get("grouped_entity_changes") or [])
        grouped_ops = list(fact_packet.get("grouped_operational_context") or [])
        metadata = dict(fact_packet.get("metadata") or {})
        method_gaps = list(metadata.get("gaps") or fact_packet.get("method_gaps") or [])

        metric_cards = self._metric_cards(fact_packet, metrics, previous)
        news_rows = self._news_rows(articles)
        headline = self._headline(key_developments, grouped_risk, grouped_entities, news_rows)
        executive_summary = self._summary(fact_packet)

        return {
            "headline": headline,
            "executive_summary": executive_summary,
            "key_developments": key_developments[:3],
            "metric_cards": metric_cards,
            "vessel_risk_changes": list(fact_packet.get("vessel_risk_changes") or [])[:3],
            "entity_linkage_changes": list(fact_packet.get("entity_linkage_changes") or [])[:3],
            "operational_context": list(fact_packet.get("operational_context") or [])[:3],
            "grouped_risk_changes": grouped_risk[:6],
            "grouped_entity_changes": grouped_entities[:6],
            "grouped_operational_context": grouped_ops[:5],
            "news_rows": news_rows,
            "method_note": "Source-linked facts only. No legal, compliance, trading, or operational recommendations.",
            "metadata": metadata,
            "coverage_gaps": self._coverage_gaps(fact_packet, method_gaps),
        }

    def _metric_cards(self, fact_packet: dict[str, Any], metrics: dict[str, Any], previous: dict[str, Any]) -> list[dict[str, Any]]:
        risk_count = int(metrics.get("new_risk_flags") or 0)
        affected_vessels = int(metrics.get("affected_vessel_count") or 0)
        high_critical = int(metrics.get("high_or_critical_active_risk_count") or 0)
        entity_links = int(metrics.get("new_entity_link_count") or 0)
        port_count = int(metrics.get("port_event_count") or metrics.get("new_port_events") or 0)
        selected_news = int(metrics.get("selected_news_count") or fact_packet.get("article_count") or 0)
        cards = [
            {
                "label": "New risk flags",
                "value": str(risk_count),
                "delta": self._delta(risk_count, int(previous.get("new_risk_flags") or 0)),
                "tone": "warning" if risk_count else "neutral",
                "support_ids": ["metric:risk_flags"],
                "article_ids": [],
                "evidence_ids": [],
                "why_shown": "New risk flag records created during this report window.",
            },
            {
                "label": "Vessels affected",
                "value": str(affected_vessels),
                "delta": None,
                "tone": "neutral",
                "support_ids": ["metric:affected_vessels"],
                "article_ids": [],
                "evidence_ids": [],
                "why_shown": "Distinct vessels with new risk flag records in this window.",
            },
            {
                "label": "High/Critical active risks",
                "value": str(high_critical),
                "delta": None,
                "tone": "warning" if high_critical else "neutral",
                "support_ids": ["metric:high_critical_active_risks"],
                "article_ids": [],
                "evidence_ids": [],
                "why_shown": "Active high or critical risk records created during this report window.",
            },
            {
                "label": "New entity links",
                "value": str(entity_links),
                "delta": None,
                "tone": "neutral",
                "support_ids": ["metric:entity_links"],
                "article_ids": [],
                "evidence_ids": [],
                "why_shown": "New vessel relationship records added during this report window.",
            },
            {
                "label": "Port events",
                "value": str(port_count),
                "delta": self._delta(port_count, int(previous.get("new_port_events") or 0)),
                "tone": "neutral",
                "support_ids": ["metric:port_events"],
                "article_ids": [],
                "evidence_ids": [],
                "why_shown": "Stored port event records observed during this report window.",
            },
            {
                "label": "Selected news",
                "value": str(selected_news),
                "delta": None,
                "tone": "neutral",
                "support_ids": ["metric:selected_news"],
                "article_ids": list(fact_packet.get("article_ids") or [])[:8],
                "evidence_ids": [],
                "why_shown": "News items selected after source ranking and deduplication.",
            },
        ]
        return [card for card in cards if card["value"] != "0" or card["label"] in {"New risk flags", "Selected news"}]

    def _news_rows(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ranked = list(articles)
        rows: list[dict[str, Any]] = []
        for article in ranked[:6]:
            article_id = (article.get("article_ids") or [article.get("id")])[0]
            rows.append(
                {
                    "title": self._clip(str(article.get("title") or "Stored maritime article"), 16),
                    "source": article.get("source") or article.get("source_badge"),
                    "published_at": article.get("published_at"),
                    "url": article.get("url"),
                    "summary": self._clip(str(article.get("summary") or article.get("title") or ""), 34),
                    "source_quality": article.get("source_quality"),
                    "source_class": article.get("source_class") or "unknown",
                    "matched_to": article.get("matched_to"),
                    "why_shown": article.get("why_shown") or "Article selected from the scoped weekly source set.",
                    "support_ids": [f"article:{article_id}"] if article_id is not None else [],
                    "article_ids": [article_id] if article_id is not None else [],
                    "evidence_ids": list(article.get("evidence_ids") or [])[:6],
                }
            )
        return rows

    def _headline(
        self,
        key_developments: list[dict[str, Any]],
        grouped_risk: list[dict[str, Any]],
        grouped_entities: list[dict[str, Any]],
        news_rows: list[dict[str, Any]],
    ) -> str:
        if key_developments:
            return self._clip(f"Weekly brief: {key_developments[0].get('label')}", 18)
        if news_rows:
            return self._clip(f"Weekly brief: {news_rows[0]['title']}", 18)
        return "Weekly brief: no source-linked news in this window"

    def _summary(
        self,
        fact_packet: dict[str, Any],
    ) -> str:
        window = fact_packet.get("window") or {}
        metrics = fact_packet.get("metrics") or {}
        article_count = int(window.get("article_count") or fact_packet.get("article_count") or metrics.get("selected_news_count") or 0)
        source_count = int(window.get("source_count") or fact_packet.get("source_count") or 0)
        if article_count == 0:
            return "No source-linked news items were available for this window."
        parts = [f"SEAM selected {article_count} important news items from {source_count} sources."]
        return self._clip(" ".join(parts), 110)

    def _news_key_developments(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [item for item in items if item.get("source_type") != "database"]

    def _coverage_gaps(self, fact_packet: dict[str, Any], method_gaps: list[str]) -> list[str]:
        gaps = [str(gap) for gap in method_gaps if str(gap).strip()]
        if int(fact_packet.get("article_count") or 0) == 0:
            gaps.insert(0, "No scoped news articles were available in this window.")
        if int(fact_packet.get("source_count") or 0) <= 1 and int(fact_packet.get("article_count") or 0) > 0:
            gaps.insert(0, "News coverage is limited to one source in this window.")
        return gaps[:5]

    def _delta(self, current: int, previous: int) -> str:
        diff = current - previous
        if diff > 0:
            return f"+{diff} vs previous window"
        if diff < 0:
            return f"{diff} vs previous window"
        return "no change vs previous window"

    def _clip(self, value: str, max_words: int) -> str:
        value = re.sub(r"\s+", " ", value).strip()
        words = value.split()
        if len(words) <= max_words:
            return value
        return " ".join(words[:max_words]).rstrip(".,;:") + "..."

    @staticmethod
    def _vessel_counter(articles: list[dict[str, Any]]) -> dict[str, int]:
        counter: dict[str, int] = {}
        for article in articles:
            for vessel in article.get("linked_vessels") or []:
                name = vessel.get("name")
                if name:
                    counter[name] = counter.get(name, 0) + 1
        return counter
