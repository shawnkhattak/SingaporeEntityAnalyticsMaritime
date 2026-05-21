"""Mock SingaporeAnalystBrief provider.

Produces a deterministic, evidence-grounded approximation of what the
real Anthropic provider would output, so the brief stays useful in
local/test environments without an API key.

Shape matches `AiNewsOverviewPayload` (Singapore Analyst Brief).
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from typing import Any

from app.core.config import Settings


SINGAPORE_HINTS = (
    "singapore",
    "mpa ",
    "psa ",
    "jurong",
    "tuas",
    "sembawang",
    "keppel",
    "changi",
    "pasir panjang",
    "marina south",
    "sg-flag",
    "singapore-flag",
    "republic of singapore",
)

THEME_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    # Order matters — themes higher in the list win when an article
    # crosses multiple buckets. Screening / enforcement is the most
    # consequential analyst bucket, so it takes precedence over the
    # broader port-operations theme.
    (
        "Screening & enforcement",
        ("sanction", "ofac", "sdn", "watchlist", "detained", "detention", "evasion", "confiscation", "court"),
    ),
    (
        "Bunker & energy market",
        ("bunker", "crude", "lng", "vlcc", "refinery"),
    ),
    (
        "Port & Strait operations",
        ("mpa", "psa", "jurong", "tuas", "sembawang", "keppel", "pasir panjang", "marina south", "strait", "port"),
    ),
    (
        "Owners, operators & registry",
        ("owner", "operator", "manager", "registry", "charter", "fleet"),
    ),
)


class MockNewsProvider:
    name = "mock"

    def __init__(self, settings: Settings) -> None:
        self.model_name = settings.ai_model or "mock-singapore-brief-v1"

    async def generate_news_overview(self, fact_packet: dict[str, Any]) -> dict[str, Any]:
        articles_raw = fact_packet.get("articles") or []
        articles = [article for article in articles_raw if self._is_singapore_article(article)]

        themes = self._themes(articles)
        watch_items = self._watch_items(articles)
        headline = self._headline(watch_items, themes, articles)
        bottom_line = self._bottom_line(watch_items, themes, articles)
        coverage_gaps = self._coverage_gaps(fact_packet, articles, articles_raw)

        return {
            "headline": headline,
            "bottom_line": bottom_line,
            "watch_items": watch_items,
            "themes": themes,
            "coverage_gaps": coverage_gaps,
        }

    # --------------------- watch items ---------------------

    def _watch_items(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        # Pick the highest-relevance articles and reshape them into
        # decision-supporting items.
        ranked = sorted(
            articles,
            key=lambda article: (article.get("relevance_score") or 0, article.get("published_at") or ""),
            reverse=True,
        )
        items: list[dict[str, Any]] = []
        for article in ranked[:6]:
            text = self._text(article)
            severity = self._severity(text)
            kind = self._kind(text, severity)
            subject = self._subject(article, text)
            items.append(
                {
                    "kind": kind,
                    "title": self._title(article),
                    "subject": subject,
                    "summary": self._summary(article, kind, subject),
                    "severity": severity,
                    "article_ids": [article["id"]] if "id" in article else [],
                    "evidence_ids": list(article.get("evidence_ids") or [])[:6],
                }
            )
        # Sort: action first, then investigate, then monitor; within each, severity desc.
        kind_rank = {"action": 0, "investigate": 1, "monitor": 2}
        sev_rank = {"critical": 0, "medium": 1, "low": 2, "none": 3}
        items.sort(key=lambda item: (kind_rank.get(item["kind"], 9), sev_rank.get(item["severity"], 9)))
        return items

    def _title(self, article: dict[str, Any]) -> str:
        title = re.sub(r"\s+", " ", str(article.get("title") or "Singapore maritime development")).strip()
        return self._clip(title, 14)

    def _subject(self, article: dict[str, Any], text: str) -> str | None:
        for vessel in article.get("linked_vessels") or []:
            if str(vessel.get("flag_country_code") or "").upper() in ("SG", "SGP"):
                return vessel.get("name")
        for entity in article.get("linked_entities") or []:
            if str(entity.get("country_code") or "").upper() in ("SG", "SGP"):
                return entity.get("name")
        for marker, label in (
            ("mpa", "MPA Singapore"),
            ("psa tuas", "PSA Tuas"),
            ("psa singapore", "PSA Singapore"),
            ("psa", "PSA"),
            ("jurong island", "Jurong Island"),
            ("jurong", "Jurong"),
            ("tuas mega port", "Tuas Mega Port"),
            ("tuas", "Tuas"),
            ("sembawang", "Sembawang"),
            ("keppel terminal", "Keppel Terminal"),
            ("keppel", "Keppel"),
            ("pasir panjang", "Pasir Panjang"),
            ("changi naval", "Changi Naval Base"),
            ("singapore strait", "Singapore Strait"),
            ("port of singapore", "Port of Singapore"),
        ):
            if marker in text:
                return label
        if "singapore" in text:
            return "Singapore"
        return None

    def _kind(self, text: str, severity: str) -> str:
        if severity == "critical":
            return "action"
        if any(word in text for word in ("court", "indictment", "subpoena", "detained", "designation", "ofac", "sdn")):
            return "investigate"
        if severity == "medium":
            return "investigate"
        return "monitor"

    def _severity(self, text: str) -> str:
        if any(word in text for word in ("ofac", "sdn", "designation", "sanctioned", "indicted", "seized", "confiscation")):
            return "critical"
        if any(word in text for word in ("detained", "detention", "court", "investigation", "fine", "suspended", "violation")):
            return "medium"
        if any(word in text for word in ("warning", "watchlist", "incident", "spill", "collision", "grounded")):
            return "medium"
        if any(word in text for word in ("delay", "disruption", "closure", "outage")):
            return "low"
        return "none"

    def _summary(self, article: dict[str, Any], kind: str, subject: str | None) -> str:
        base = str(article.get("summary") or article.get("title") or "").strip()
        base = re.sub(r"\s+", " ", base)
        actor = subject or "Singapore actor"
        body = self._clip(base, 28)
        action_clause = {
            "action": "Update screening and counterparty checks this shift.",
            "investigate": "Open the linked evidence and confirm before action.",
            "monitor": "Keep on the radar; no immediate change required.",
        }[kind]
        prefix = f"{actor}: " if subject and not body.lower().startswith(actor.lower()) else ""
        return f"{prefix}{body} {action_clause}".strip()

    # --------------------- themes ---------------------

    def _themes(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for article in articles:
            text = self._text(article)
            theme = next(
                (name for name, keywords in THEME_RULES if any(word in text for word in keywords)),
                None,
            )
            if theme is None:
                continue
            grouped[theme].append(article)
        themes: list[dict[str, Any]] = []
        for title, group in sorted(grouped.items(), key=lambda pair: len(pair[1]), reverse=True):
            ids = [article["id"] for article in group if "id" in article]
            sample = group[0]
            sample_text = self._clip(str(sample.get("title") or "").strip(), 16)
            themes.append(
                {
                    "title": title,
                    "article_count": len(group),
                    "one_line": f"{len(group)} article{'s' if len(group) != 1 else ''} · lead: {sample_text}".strip(" ·"),
                    "article_ids": ids,
                }
            )
        return themes[:5]

    # --------------------- top-level copy ---------------------

    def _headline(
        self,
        watch_items: list[dict[str, Any]],
        themes: list[dict[str, Any]],
        articles: list[dict[str, Any]],
    ) -> str:
        if watch_items:
            top = watch_items[0]
            subject = top.get("subject") or "Singapore"
            return self._clip(f"{subject} — {top['title']}", 22)
        if themes:
            return self._clip(f"Singapore brief: {themes[0]['title'].lower()} dominates the window", 22)
        if articles:
            return f"Singapore maritime brief — {len(articles)} stored mentions"
        return "No Singapore maritime developments in window"

    def _bottom_line(
        self,
        watch_items: list[dict[str, Any]],
        themes: list[dict[str, Any]],
        articles: list[dict[str, Any]],
    ) -> str:
        if not articles:
            return "No Singapore-relevant source coverage this window. Refresh RSS feeds and regenerate."
        actions = [item for item in watch_items if item["kind"] == "action"]
        investigate = [item for item in watch_items if item["kind"] == "investigate"]
        if actions:
            top = actions[0]
            subject = top.get("subject") or "Singapore"
            return (
                f"Take action this shift: {subject} surfaces a {top['severity']} signal. "
                f"Update screening and counterparty checks, then walk the remaining {len(watch_items) - 1} watch items in order."
            )
        if investigate:
            top = investigate[0]
            subject = top.get("subject") or "Singapore"
            return (
                f"No immediate operational action, but {subject} warrants confirmation. "
                f"Open the linked evidence on the top {min(len(investigate), 3)} item(s); monitor the rest."
            )
        if themes:
            return (
                f"Routine Singapore window covering {themes[0]['title'].lower()}. "
                f"Skim the watch list and set a re-check after the next RSS refresh."
            )
        return "Singapore window is light. Re-check after the next refresh."

    # --------------------- gaps ---------------------

    def _coverage_gaps(
        self,
        fact_packet: dict[str, Any],
        articles: list[dict[str, Any]],
        articles_raw: list[dict[str, Any]],
    ) -> list[str]:
        gaps: list[str] = []
        if not articles:
            gaps.append("No Singapore-relevant articles in this window after scope filter.")
            return gaps
        sources = {article.get("source") for article in articles if article.get("source")}
        if len(sources) < 2:
            gaps.append("Singapore coverage in this window comes from a single source.")
        if not any(self._text(article).find("mpa") >= 0 for article in articles):
            gaps.append("No MPA-attributed coverage this window.")
        if len(articles_raw) - len(articles) > 5 and len(articles) <= 3:
            gaps.append(f"{len(articles_raw) - len(articles)} non-Singapore articles dropped — coverage may be thin.")
        return gaps[:3]

    # --------------------- utilities ---------------------

    def _is_singapore_article(self, article: dict[str, Any]) -> bool:
        text = self._text(article)
        if any(word in text for word in SINGAPORE_HINTS):
            return True
        for vessel in article.get("linked_vessels") or []:
            if str(vessel.get("flag_country_code") or "").upper() in ("SG", "SGP"):
                return True
        for entity in article.get("linked_entities") or []:
            if str(entity.get("country_code") or "").upper() in ("SG", "SGP"):
                return True
        return False

    def _text(self, article: dict[str, Any]) -> str:
        return f"{article.get('title') or ''} {article.get('summary') or ''} {article.get('source') or ''}".casefold()

    def _clip(self, value: str, max_words: int) -> str:
        value = re.sub(r"\s+", " ", value).strip()
        words = value.split()
        if len(words) <= max_words:
            return value
        return " ".join(words[:max_words]).rstrip(".,;:") + "…"

    # Backwards compat for callers that introspect counter helpers.
    def _join_items(self, items: list[str]) -> str:
        if not items:
            return ""
        if len(items) == 1:
            return items[0]
        if len(items) == 2:
            return f"{items[0]} and {items[1]}"
        return f"{', '.join(items[:-1])}, and {items[-1]}"

    # Used by the deterministic test harness — kept for compatibility
    # so tests that import these helpers still work.
    @staticmethod
    def _vessel_counter(articles: list[dict[str, Any]]) -> Counter[str]:
        counter: Counter[str] = Counter()
        for article in articles:
            for vessel in article.get("linked_vessels") or []:
                name = vessel.get("name")
                if name:
                    counter[name] += 1
        return counter
