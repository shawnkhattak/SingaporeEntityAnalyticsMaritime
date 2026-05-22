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
        articles = list(fact_packet.get("articles") or [])
        metrics = dict(fact_packet.get("global_metrics") or {})
        previous = dict(fact_packet.get("previous_window") or {})
        vessel_changes = list(fact_packet.get("vessel_risk_changes") or [])
        entity_changes = list(fact_packet.get("entity_linkage_changes") or [])
        operational = list(fact_packet.get("operational_context") or [])
        method_gaps = list(fact_packet.get("method_gaps") or [])

        metric_cards = self._metric_cards(fact_packet, metrics, previous)
        news_rows = self._news_rows(articles)
        headline = self._headline(metric_cards, vessel_changes, entity_changes, news_rows)
        executive_summary = self._summary(fact_packet, metric_cards, vessel_changes, entity_changes, operational)

        return {
            "headline": headline,
            "executive_summary": executive_summary,
            "metric_cards": metric_cards,
            "vessel_risk_changes": vessel_changes[:6],
            "entity_linkage_changes": entity_changes[:6],
            "operational_context": operational[:8],
            "news_rows": news_rows,
            "method_note": "Generated from deterministic SEAM counts, deltas, links, positions, port events, and stored source records. The model only phrases this fact pack.",
            "coverage_gaps": self._coverage_gaps(fact_packet, method_gaps),
        }

    def _metric_cards(self, fact_packet: dict[str, Any], metrics: dict[str, Any], previous: dict[str, Any]) -> list[dict[str, Any]]:
        article_count = int(fact_packet.get("article_count") or 0)
        source_count = int(fact_packet.get("source_count") or 0)
        risk_count = int(metrics.get("new_risk_flags") or 0)
        port_count = int(metrics.get("new_port_events") or 0)
        active_positions = int(metrics.get("active_positioned_vessels") or 0)
        return [
            {
                "label": "News sources",
                "value": f"{article_count} articles / {source_count} sources",
                "delta": self._delta(article_count, int(previous.get("article_count") or 0)),
                "tone": "neutral",
                "support_ids": ["metric:articles", "metric:sources"],
                "article_ids": list(fact_packet.get("article_ids") or [])[:12],
                "evidence_ids": [],
            },
            {
                "label": "Risk flags",
                "value": str(risk_count),
                "delta": self._delta(risk_count, int(previous.get("new_risk_flags") or 0)),
                "tone": "warning" if risk_count else "neutral",
                "support_ids": ["metric:risk_flags"],
                "article_ids": [],
                "evidence_ids": [],
            },
            {
                "label": "Port events",
                "value": str(port_count),
                "delta": self._delta(port_count, int(previous.get("new_port_events") or 0)),
                "tone": "neutral",
                "support_ids": ["metric:port_events"],
                "article_ids": [],
                "evidence_ids": [],
            },
            {
                "label": "Position coverage",
                "value": f"{active_positions} vessels",
                "delta": None,
                "tone": "neutral",
                "support_ids": ["metric:latest_positions"],
                "article_ids": [],
                "evidence_ids": [],
            },
        ]

    def _news_rows(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ranked = sorted(
            articles,
            key=lambda article: (article.get("relevance_score") or 0, article.get("published_at") or "", article.get("id") or 0),
            reverse=True,
        )
        rows: list[dict[str, Any]] = []
        for article in ranked[:6]:
            rows.append(
                {
                    "title": self._clip(str(article.get("title") or "Stored maritime article"), 16),
                    "source": article.get("source") or article.get("source_badge"),
                    "summary": self._clip(str(article.get("summary") or article.get("title") or ""), 34),
                    "source_quality": article.get("source_quality"),
                    "support_ids": [f"article:{article['id']}"] if article.get("id") is not None else [],
                    "article_ids": [article["id"]] if article.get("id") is not None else [],
                    "evidence_ids": list(article.get("evidence_ids") or [])[:6],
                }
            )
        return rows

    def _headline(
        self,
        metric_cards: list[dict[str, Any]],
        vessel_changes: list[dict[str, Any]],
        entity_changes: list[dict[str, Any]],
        news_rows: list[dict[str, Any]],
    ) -> str:
        if vessel_changes:
            top = vessel_changes[0]
            return self._clip(f"Weekly brief: {top.get('vessel_name', 'vessel')} has a stored risk change", 18)
        if entity_changes:
            top = entity_changes[0]
            return self._clip(f"Weekly brief: {top.get('entity_name', 'entity')} has a new linkage", 18)
        if news_rows:
            return self._clip(f"Weekly brief: {news_rows[0]['title']}", 18)
        return "Weekly brief: no supported developments in this window"

    def _summary(
        self,
        fact_packet: dict[str, Any],
        metric_cards: list[dict[str, Any]],
        vessel_changes: list[dict[str, Any]],
        entity_changes: list[dict[str, Any]],
        operational: list[dict[str, Any]],
    ) -> str:
        article_count = int(fact_packet.get("article_count") or 0)
        source_count = int(fact_packet.get("source_count") or 0)
        parts = [f"The weekly window contains {article_count} scoped articles from {source_count} sources."]
        if vessel_changes:
            parts.append(f"{len(vessel_changes)} vessel risk change(s) were computed from stored risk flags.")
        if entity_changes:
            parts.append(f"{len(entity_changes)} entity linkage change(s) were computed from relationship history.")
        if operational:
            parts.append(f"{len(operational)} operational context item(s) were computed from positions, port events, or source snapshots.")
        if len(parts) == 1:
            parts.append("No unsupported risk judgments were added.")
        return " ".join(parts)

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
