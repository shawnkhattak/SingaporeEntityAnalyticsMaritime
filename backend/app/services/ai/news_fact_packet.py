from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import SourceObservation
from app.models.maritime import Entity, PortEvent, Relationship, Vessel, VesselPositionLatest
from app.models.risk import NewsArticle, NewsLink, RiskFlag
from app.services.ai.schemas import AiNewsFactPacket, ScoredNewsArticle


RISK_WORDS = ("sanction", "ofac", "sdn", "detained", "watchlist", "confiscation", "insurance", "closure", "evasion")
SINGAPORE_WORDS = (
    "singapore",
    "singapore strait",
    "port of singapore",
    "mpa singapore",
    "mpa ",
    "psa singapore",
    "psa international",
    "psa ",
    "jurong port",
    "jurong island",
    "tuas mega port",
    "tuas port",
    "tuas terminal",
    "sembawang",
    "sembcorp",
    "keppel terminal",
    "keppel ",
    "changi naval",
    "marina south",
    "pasir panjang",
    "shell singapore",
    "exxon singapore",
    "sg-flag",
    "singapore-flag",
    "singapore-flagged",
    "singapore bunker",
    "singapore registry",
    "rsn ",
    "republic of singapore navy",
)
SINGAPORE_FLAG_CODES = ("SG", "SGP")
OIL_GAS_WORDS = ("tanker", "lng", "crude", "bunker", "oil", "gas", "refinery", "vlcc")
CREDIBLE_SOURCES = ("government source", "tradewinds", "gcaptain", "the maritime executive", "maritime news", "splash 24/7", "lloyd")
GENERIC_MARITIME_WORDS = ("shipping", "maritime", "vessel", "ship", "port")
RECRUITING_WORDS = (" job ", "/job/", "career", "hiring", "vacancy", "superintendent", "recruitment")
VESSEL_CONTEXT_WORDS = (
    "vessel",
    "ship",
    "tanker",
    "product tanker",
    "container ship",
    "bulk carrier",
    "bulker",
    "carrier",
    "lng carrier",
    "vlcc",
    "ahts",
    "imo",
    "mmsi",
    "detained",
    "grounded",
    "flagged",
    "master",
    "captain",
)

RISK_GROUP_ORDER = {
    "sanctions": 0,
    "watchlist": 1,
    "detention": 2,
    "adverse_news": 3,
    "high_risk_flag_country": 4,
    "identity_conflict": 5,
    "other": 6,
}
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "none": 4, None: 5}
ROLE_LABELS = {
    "owner": "Registered Owner",
    "registered_owner": "Registered Owner",
    "operator": "Operator",
    "ship_manager": "Ship Manager",
    "ism_manager": "ISM Manager",
}


def normalize_headline(value: str) -> str:
    value = re.sub(r"[^a-z0-9\s]", " ", value.casefold())
    value = re.sub(r"\s+", " ", value).strip()
    return value


def source_quality_label(source: str | None, badge: str | None) -> str:
    text = f"{source or ''} {badge or ''}".casefold()
    if any(word in text for word in ("mpa", "government", "gov", "navy", "centcom", "coast guard")):
        return "Government or military source"
    if any(word in text for word in ("lloyd", "tradewinds", "gcaptain", "maritime executive", "marinelink", "splash")):
        return "Trade publication"
    if any(word in text for word in ("twitter", "x/twitter", "social")):
        return "Social media or unverified source"
    if "rss.app search" in text or "search feed" in text:
        return "General news source"
    return "Unclassified source"


def source_class(source: str | None, badge: str | None) -> str:
    quality = source_quality_label(source, badge).casefold()
    if "government" in quality or "military" in quality:
        return "official"
    if "trade" in quality:
        return "trade"
    if "social" in quality:
        return "social_unverified"
    if "general" in quality:
        return "general_news"
    return "unknown"


def risk_group_type(flag_type: str | None) -> str:
    text = (flag_type or "").casefold()
    if "sanction" in text:
        return "sanctions"
    if "watchlist" in text:
        return "watchlist"
    if "detention" in text or "detained" in text:
        return "detention"
    if "adverse" in text or "news" in text:
        return "adverse_news"
    if "high_risk_flag" in text or "high risk flag" in text:
        return "high_risk_flag_country"
    if "identity" in text or "conflict" in text:
        return "identity_conflict"
    return "other"


def normalize_entity_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.casefold().replace(".", "")).strip()


def clip_words(value: str, max_words: int) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    words = value.split()
    if len(words) <= max_words:
        return value
    return " ".join(words[:max_words]).rstrip(".,;:") + "..."


def is_recruiting_article(article: Any) -> bool:
    def get_value(name: str) -> str:
        if isinstance(article, dict):
            value = article.get(name)
        else:
            value = getattr(article, name, None)
        return str(value or "")

    text = f" {get_value('title')} {get_value('summary')} {get_value('url')} ".casefold()
    return any(word in text for word in RECRUITING_WORDS)


def has_singapore_signal(article: dict[str, Any]) -> bool:
    """True when the article materially relates to Singapore.

    Either:
    - the title/summary mentions a Singapore keyword, OR
    - a linked vessel sails under the Singapore flag, OR
    - a linked entity is registered in Singapore.
    """
    text = f"{article.get('title') or ''} {article.get('summary') or ''}".casefold()
    if any(word in text for word in SINGAPORE_WORDS):
        return True
    for vessel in article.get("linked_vessels", []) or []:
        if str(vessel.get("flag_country_code") or "").upper() in SINGAPORE_FLAG_CODES:
            return True
    for entity in article.get("linked_entities", []) or []:
        if str(entity.get("country_code") or "").upper() in SINGAPORE_FLAG_CODES:
            return True
    return False


def score_news_article(article: dict[str, Any], now: datetime | None = None) -> tuple[int, list[str]]:
    now = now or datetime.now(UTC)
    text = f"{article.get('title') or ''} {article.get('summary') or ''}".casefold()
    source = f"{article.get('source') or ''} {article.get('source_badge') or ''}".casefold()
    score = 0
    reasons: list[str] = []

    if article.get("linked_vessel_ids"):
        score += 5
        reasons.append("exact vessel link")
    if article.get("linked_entity_ids"):
        score += 5
        reasons.append("exact entity link")
    if any(word in text for word in RISK_WORDS):
        score += 4
        reasons.append("risk/sanctions language")
    if any(word in text for word in SINGAPORE_WORDS):
        score += 4
        reasons.append("Singapore maritime relevance")
    if any(word in text for word in OIL_GAS_WORDS):
        score += 3
        reasons.append("oil and gas relevance")
    if any(word in source for word in CREDIBLE_SOURCES):
        score += 3
        reasons.append("credible maritime source")
    if article.get("bundle_name"):
        score += 2
        reasons.append("curated SEAM feed")
    published_at = article.get("published_at")
    if isinstance(published_at, datetime) and now - published_at <= timedelta(hours=24):
        score += 1
        reasons.append("published in last 24 hours")

    has_specific_tie = any(word in text for word in (*RISK_WORDS, *SINGAPORE_WORDS, *OIL_GAS_WORDS)) or article.get("linked_vessel_ids") or article.get("linked_entity_ids")
    if any(word in text for word in GENERIC_MARITIME_WORDS) and not has_specific_tie:
        score -= 3
        reasons.append("generic maritime article")
    if is_recruiting_article(article):
        score -= 8
        reasons.append("recruiting article")
    return score, reasons


def is_explicit_vessel_mention(article: NewsArticle, link: NewsLink, vessel: Vessel | None) -> bool:
    if vessel is None:
        return False
    text = f"{article.title or ''} {article.summary or ''}".casefold()
    if vessel.imo and vessel.imo.casefold() in text:
        return True
    if vessel.mmsi and vessel.mmsi.casefold() in text:
        return True

    name = (vessel.name or link.matched_text or "").strip()
    if len(name) < 4:
        return False
    match = re.search(rf"\b{re.escape(name.casefold())}\b", text)
    if not match:
        return False
    context = text[max(0, match.start() - 90) : min(len(text), match.end() + 90)]
    if any(re.search(rf"\b{re.escape(word)}\b", context) for word in VESSEL_CONTEXT_WORDS):
        return True
    return False


class NewsFactPacketService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def build(self, window_hours: int = 24, bundle_name: str | None = None, max_articles: int = 40) -> AiNewsFactPacket:
        now = datetime.now(UTC)
        window_start = now - timedelta(hours=window_hours)
        statement = (
            select(NewsArticle)
            .where(or_(NewsArticle.published_at.is_(None), NewsArticle.published_at >= window_start))
            .order_by(desc(NewsArticle.published_at), desc(NewsArticle.id))
            .limit(max(max_articles * 3, 80))
        )
        if bundle_name:
            statement = statement.where(NewsArticle.raw_payload["bundle_name"].astext == bundle_name)
        article_rows = list(await self.session.scalars(statement))
        article_ids = [row.id for row in article_rows]

        links_by_article: dict[int, list[NewsLink]] = defaultdict(list)
        if article_ids:
            link_rows = await self.session.scalars(select(NewsLink).where(NewsLink.article_id.in_(article_ids)))
            for link in link_rows:
                links_by_article[link.article_id].append(link)

        vessel_ids = sorted({link.vessel_id for links in links_by_article.values() for link in links if link.vessel_id is not None})
        entity_ids = sorted({link.entity_id for links in links_by_article.values() for link in links if link.entity_id is not None})
        vessels = {}
        entities = {}
        if vessel_ids:
            for vessel in await self.session.scalars(select(Vessel).where(Vessel.id.in_(vessel_ids))):
                vessels[vessel.id] = vessel
        if entity_ids:
            for entity in await self.session.scalars(select(Entity).where(Entity.id.in_(entity_ids))):
                entities[entity.id] = entity

        risk_context = await self._risk_context(vessel_ids, entity_ids)
        global_metrics = await self._global_metrics(window_start, now)
        previous_window = await self._previous_window(window_start, window_hours, bundle_name)
        vessel_risk_changes = await self._vessel_risk_changes(window_start)
        entity_linkage_changes = await self._entity_linkage_changes(window_start)
        operational_context, method_gaps = await self._operational_context(window_start, now)
        articles: list[ScoredNewsArticle] = []
        seen_headlines: set[str] = set()
        duplicate_count = 0
        for row in article_rows:
            raw = row.raw_payload or {}
            links = links_by_article.get(row.id, [])
            evidence_ids = sorted({link.evidence_id for link in links if link.evidence_id is not None})
            explicit_vessel_links = [
                link
                for link in links
                if link.vessel_id is not None and is_explicit_vessel_mention(row, link, vessels.get(link.vessel_id))
            ]
            linked_vessel_ids = sorted({link.vessel_id for link in explicit_vessel_links if link.vessel_id is not None})
            linked_entity_ids = sorted({link.entity_id for link in links if link.entity_id is not None})
            base = {
                "id": row.id,
                "title": row.title,
                "summary": row.summary,
                "source": row.source,
                "source_badge": raw.get("source_badge"),
                "bundle_name": raw.get("bundle_name"),
                "published_at": row.published_at,
                "linked_vessel_ids": linked_vessel_ids,
                "linked_entity_ids": linked_entity_ids,
            }
            score, reasons = score_news_article(base, now=now)
            normalized = normalize_headline(row.title)
            if normalized in seen_headlines:
                score -= 4
                reasons.append("near-duplicate headline")
                duplicate_count += 1
            seen_headlines.add(normalized)
            articles.append(
                ScoredNewsArticle(
                    id=row.id,
                    title=row.title,
                    summary=row.summary,
                    source=row.source,
                    source_badge=raw.get("source_badge"),
                    bundle_name=raw.get("bundle_name"),
                    published_at=row.published_at,
                    url=row.url,
                    image=raw.get("image"),
                    evidence_ids=evidence_ids,
                    linked_vessel_ids=linked_vessel_ids,
                    linked_entity_ids=linked_entity_ids,
                    linked_vessels=[
                        {
                            "id": vessel.id,
                            "name": vessel.name,
                            "imo": vessel.imo,
                            "mmsi": vessel.mmsi,
                            "type": vessel.vessel_type_code,
                            "call_sign": vessel.call_sign,
                            "flag_country_code": vessel.flag_country_code,
                        }
                        for vessel in (vessels.get(id_) for id_ in linked_vessel_ids)
                        if vessel is not None
                    ],
                    linked_entities=[
                        {
                            "id": entity.id,
                            "name": entity.name,
                            "type": entity.entity_type,
                            "country_code": entity.country_code,
                        }
                        for entity in (entities.get(id_) for id_ in linked_entity_ids)
                        if entity is not None
                    ],
                    matched_text=sorted({link.matched_text for link in links if link.matched_text}),
                    relevance_score=score,
                    relevance_reasons=reasons,
                    source_quality=source_quality_label(row.source, raw.get("source_badge")),
                )
            )

        # Singapore-only scope: keep articles that mention Singapore by
        # name or are tied to a Singapore-flagged vessel / Singapore
        # entity. Items with no Singapore tie are dropped before
        # selection so the AI brief never invents Singapore relevance.
        singapore_relevant = [
            article
            for article in articles
            if has_singapore_signal(
                {
                    "title": article.title,
                    "summary": article.summary,
                    "linked_vessels": article.linked_vessels,
                    "linked_entities": article.linked_entities,
                }
            )
        ]
        selected = sorted(
            singapore_relevant,
            key=lambda item: (item.relevance_score, item.published_at or datetime.min.replace(tzinfo=UTC), item.id),
            reverse=True,
        )[:max_articles]
        evidence_ids = sorted({id_ for article in selected for id_ in article.evidence_ids})
        selected_article_ids = [article.id for article in selected]
        selected_vessel_ids = sorted({id_ for article in selected for id_ in article.linked_vessel_ids})
        selected_entity_ids = sorted({id_ for article in selected for id_ in article.linked_entity_ids})
        sources = {article.source for article in selected if article.source}
        selected_news = self._selected_news(selected)
        grouped_risk_changes = self._group_risk_changes(vessel_risk_changes)
        grouped_entity_changes = self._group_entity_changes(entity_linkage_changes)
        grouped_operational_context = self._group_operational_context(operational_context)
        affected_vessel_count = len({item.get("vessel_id") for item in vessel_risk_changes if item.get("vessel_id") is not None})
        high_or_critical = sum(
            1
            for item in vessel_risk_changes
            if item.get("status") in {"active", "open"} and item.get("severity") in {"critical", "high"}
        )
        global_metrics.update(
            {
                "affected_vessel_count": affected_vessel_count,
                "high_or_critical_active_risk_count": high_or_critical,
                "new_entity_link_count": len(entity_linkage_changes),
                "selected_news_count": len(selected_news),
            }
        )
        metadata = {
            "evidence_record_count": global_metrics.get("new_evidence_records"),
            "active_positioned_vessel_count": global_metrics.get("active_positioned_vessels"),
            "candidate_article_count": len(article_rows),
            "gaps": method_gaps,
            "method": [
                "Generated from deterministic SEAM fact-pack fields only.",
                "Risk, entity, operation, and news sections are grouped before model phrasing.",
                "AIS freshness uses stored position timestamps and is not a confirmed AIS outage.",
                "Sanctions and watchlist records are source matches; original sources remain available for review.",
            ],
        }
        key_developments = self._key_developments(grouped_risk_changes, grouped_entity_changes, grouped_operational_context, selected_news)
        packet = AiNewsFactPacket(
            scope="singapore_maritime_news",
            window_hours=window_hours,
            window_start=window_start,
            window_end=now,
            bundle_name=bundle_name,
            candidate_article_count=len(article_rows),
            selected_article_count=len(selected),
            article_count=len(selected),
            source_count=len(sources),
            evidence_ids=evidence_ids,
            article_ids=selected_article_ids,
            linked_vessel_ids=selected_vessel_ids,
            linked_entity_ids=selected_entity_ids,
            articles=selected,
            risk_context={**risk_context, "duplicate_headlines": duplicate_count},
            global_metrics=global_metrics,
            previous_window=previous_window,
            key_developments=key_developments,
            grouped_risk_changes=grouped_risk_changes,
            grouped_entity_changes=grouped_entity_changes,
            grouped_operational_context=grouped_operational_context,
            selected_news=selected_news,
            metadata=metadata,
            vessel_risk_changes=vessel_risk_changes,
            entity_linkage_changes=entity_linkage_changes,
            operational_context=operational_context,
            method_gaps=method_gaps,
        )
        return packet

    async def _risk_context(self, vessel_ids: list[int], entity_ids: list[int]) -> dict[str, int]:
        if not vessel_ids and not entity_ids:
            return {}
        statement = select(RiskFlag.severity, RiskFlag.flag_type, func.count(RiskFlag.id)).where(RiskFlag.status != "resolved")
        filters = []
        if vessel_ids:
            filters.append(RiskFlag.vessel_id.in_(vessel_ids))
        if entity_ids:
            filters.append(RiskFlag.entity_id.in_(entity_ids))
        statement = statement.where(or_(*filters)).group_by(RiskFlag.severity, RiskFlag.flag_type)
        rows = await self.session.execute(statement)
        counter: Counter[str] = Counter()
        for severity, flag_type, count in rows:
            counter[f"severity:{severity}"] += int(count)
            counter[f"type:{flag_type}"] += int(count)
        return dict(counter)

    async def _global_metrics(self, window_start: datetime, window_end: datetime) -> dict[str, Any]:
        risk_count = await self.session.scalar(select(func.count(RiskFlag.id)).where(RiskFlag.created_at >= window_start))
        port_count = await self.session.scalar(select(func.count(PortEvent.id)).where(PortEvent.created_at >= window_start))
        evidence_count = await self.session.scalar(select(func.count(SourceObservation.id)).where(SourceObservation.fetched_at >= window_start))
        active_vessels = await self.session.scalar(
            select(func.count(VesselPositionLatest.vessel_id)).where(VesselPositionLatest.position_timestamp >= window_start)
        )
        return {
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
            "new_risk_flags": int(risk_count or 0),
            "new_port_events": int(port_count or 0),
            "new_evidence_records": int(evidence_count or 0),
            "active_positioned_vessels": int(active_vessels or 0),
            "support_ids": ["metric:risk_flags", "metric:port_events", "metric:evidence_records", "metric:latest_positions"],
        }

    async def _previous_window(self, window_start: datetime, window_hours: int, bundle_name: str | None) -> dict[str, Any]:
        previous_start = window_start - timedelta(hours=window_hours)
        statement = select(func.count(NewsArticle.id)).where(
            or_(NewsArticle.published_at.is_(None), NewsArticle.published_at >= previous_start),
            or_(NewsArticle.published_at.is_(None), NewsArticle.published_at < window_start),
        )
        if bundle_name:
            statement = statement.where(NewsArticle.raw_payload["bundle_name"].astext == bundle_name)
        article_count = await self.session.scalar(statement)
        risk_count = await self.session.scalar(
            select(func.count(RiskFlag.id)).where(RiskFlag.created_at >= previous_start, RiskFlag.created_at < window_start)
        )
        port_count = await self.session.scalar(
            select(func.count(PortEvent.id)).where(PortEvent.created_at >= previous_start, PortEvent.created_at < window_start)
        )
        return {
            "window_start": previous_start.isoformat(),
            "window_end": window_start.isoformat(),
            "article_count": int(article_count or 0),
            "new_risk_flags": int(risk_count or 0),
            "new_port_events": int(port_count or 0),
        }

    async def _vessel_risk_changes(self, window_start: datetime) -> list[dict[str, Any]]:
        rows = await self.session.execute(
            select(RiskFlag, Vessel)
            .outerjoin(Vessel, Vessel.id == RiskFlag.vessel_id)
            .where(RiskFlag.created_at >= window_start, RiskFlag.vessel_id.is_not(None))
            .order_by(desc(RiskFlag.created_at), RiskFlag.id)
            .limit(80)
        )
        return [
            {
                "vessel_id": vessel.id if vessel else flag.vessel_id,
                "vessel_name": vessel.name if vessel else f"Vessel {flag.vessel_id}",
                "imo": vessel.imo if vessel else None,
                "flag_type": flag.flag_type,
                "group_type": risk_group_type(flag.flag_type),
                "change": f"New {flag.flag_type.replace('_', ' ')} flag",
                "severity": flag.severity,
                "status": flag.status,
                "summary": flag.summary,
                "support_ids": [f"risk_flag:{flag.id}"],
                "evidence_ids": [flag.evidence_id] if flag.evidence_id is not None else [],
                "article_ids": [],
            }
            for flag, vessel in rows
        ]

    async def _entity_linkage_changes(self, window_start: datetime) -> list[dict[str, Any]]:
        rows = await self.session.execute(
            select(Relationship, Entity, Vessel)
            .outerjoin(Entity, or_(Entity.id == Relationship.to_entity_id, Entity.id == Relationship.from_entity_id))
            .outerjoin(Vessel, Vessel.id == Relationship.vessel_id)
            .where(Relationship.created_at >= window_start)
            .order_by(desc(Relationship.created_at), Relationship.id)
            .limit(80)
        )
        changes: list[dict[str, Any]] = []
        seen: set[tuple[int | None, int | None, str]] = set()
        for relationship, entity, vessel in rows:
            key = (relationship.vessel_id, entity.id if entity else None, relationship.relationship_type)
            if key in seen:
                continue
            seen.add(key)
            subject = entity.name if entity else f"Entity {relationship.to_entity_id or relationship.from_entity_id}"
            target = vessel.name if vessel else f"vessel {relationship.vessel_id}" if relationship.vessel_id else "linked entity"
            changes.append(
                {
                    "entity_id": entity.id if entity else relationship.to_entity_id or relationship.from_entity_id,
                    "entity_name": subject,
                    "country_code": entity.country_code if entity else None,
                    "vessel_id": vessel.id if vessel else relationship.vessel_id,
                    "vessel_name": vessel.name if vessel else None,
                    "relationship_type": relationship.relationship_type,
                    "change": f"New {relationship.relationship_type.replace('_', ' ')} linkage",
                    "summary": relationship.evidence_summary or f"{subject} linked to {target}.",
                    "confidence": relationship.confidence,
                    "support_ids": [f"relationship:{relationship.id}"],
                    "evidence_ids": [relationship.evidence_id] if relationship.evidence_id is not None else [],
                    "article_ids": [],
                }
            )
        return changes

    async def _operational_context(self, window_start: datetime, now: datetime) -> tuple[list[dict[str, Any]], list[str]]:
        context: list[dict[str, Any]] = []
        method_gaps: list[str] = []

        stale_threshold = now - timedelta(hours=24)
        stale_rows = await self.session.execute(
            select(Vessel, VesselPositionLatest)
            .join(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .where(VesselPositionLatest.position_timestamp < stale_threshold)
            .order_by(VesselPositionLatest.position_timestamp, Vessel.name)
            .limit(50)
        )
        for vessel, position in stale_rows:
            hours = int((now - position.position_timestamp).total_seconds() // 3600)
            context.append(
                {
                    "title": f"{vessel.name} AIS position is {hours}h old",
                    "summary": "Computed from latest stored position timestamp; this is a data freshness signal, not a confirmed AIS outage.",
                    "signal_type": "ais_gap",
                    "group_type": "ais_freshness",
                    "vessel_id": vessel.id,
                    "vessel_name": vessel.name,
                    "detail": f"stored AIS position is {hours}h old",
                    "timestamp": position.position_timestamp.isoformat(),
                    "severity": "medium" if hours >= 72 else "low",
                    "support_ids": [f"latest_position:{vessel.id}"],
                    "evidence_ids": [position.evidence_id] if position.evidence_id is not None else [],
                    "article_ids": [],
                }
            )

        port_rows = await self.session.execute(
            select(PortEvent, Vessel)
            .outerjoin(Vessel, Vessel.id == PortEvent.vessel_id)
            .where(or_(PortEvent.created_at >= window_start, PortEvent.event_time >= window_start))
            .order_by(desc(PortEvent.event_time).nullslast(), desc(PortEvent.created_at))
            .limit(40)
        )
        for event, vessel in port_rows:
            vessel_name = vessel.name if vessel else "Unlinked vessel"
            port_name = event.port_name or event.port_code or "port"
            context.append(
                {
                    "title": f"{vessel_name} {event.event_type.replace('_', ' ')} at {port_name}",
                    "summary": "Stored port event observed in the weekly window.",
                    "signal_type": "port_activity",
                    "group_type": "port_activity",
                    "vessel_id": vessel.id if vessel else event.vessel_id,
                    "vessel_name": vessel_name,
                    "detail": f"{event.event_type.replace('_', ' ')} at {port_name}",
                    "timestamp": (event.event_time or event.created_at).isoformat() if (event.event_time or event.created_at) else None,
                    "source": "stored port event",
                    "severity": "none",
                    "support_ids": [f"port_event:{event.id}"],
                    "evidence_ids": [event.evidence_id] if event.evidence_id is not None else [],
                    "article_ids": [],
                }
            )

        flag_changes = await self._flag_change_context(window_start)
        context.extend(flag_changes)
        if not flag_changes:
            method_gaps.append("Flag-change detection found no comparable vessel identity snapshots in this window.")
        if not await self.session.scalar(select(func.count(Relationship.id)).where(Relationship.created_at >= window_start)):
            method_gaps.append("Ownership and manager changes require relationship history; no new relationship rows were available in this window.")
        method_gaps.append("Voyage irregularity is limited to stored port events and latest positions; planned voyage schedules are not available.")
        return context[:100], method_gaps[:4]

    async def _flag_change_context(self, window_start: datetime) -> list[dict[str, Any]]:
        rows = await self.session.scalars(
            select(SourceObservation)
            .where(SourceObservation.observation_type.in_(("vessel_particulars", "vessel_identity", "particulars")))
            .where(SourceObservation.fetched_at >= window_start)
            .order_by(SourceObservation.fetched_at)
            .limit(200)
        )
        by_key: dict[str, list[tuple[SourceObservation, str]]] = defaultdict(list)
        for observation in rows:
            payload = observation.raw_payload or {}
            particulars = payload.get("vesselParticulars") if isinstance(payload.get("vesselParticulars"), dict) else {}
            flag = str(
                particulars.get("flag")
                or particulars.get("flagCountryCode")
                or payload.get("flag")
                or payload.get("flagCountryCode")
                or payload.get("flag_country_code")
                or ""
            ).strip()
            imo = str(particulars.get("imo") or payload.get("imo") or payload.get("imoNumber") or "").strip()
            mmsi = str(particulars.get("mmsi") or payload.get("mmsi") or "").strip()
            key = imo or mmsi or str(observation.source_record_id or "").strip()
            if key and flag:
                by_key[key].append((observation, flag.upper()))

        changes: list[dict[str, Any]] = []
        for key, observations in by_key.items():
            last_flag: str | None = None
            last_observation: SourceObservation | None = None
            for observation, flag in observations:
                if last_flag and flag != last_flag:
                    changes.append(
                        {
                            "title": f"Stored flag changed for vessel identity {key}",
                            "summary": f"Stored particulars changed from {last_flag} to {flag}.",
                            "signal_type": "flag_change",
                            "severity": "medium",
                            "support_ids": [f"source_observation:{last_observation.id}", f"source_observation:{observation.id}"] if last_observation else [f"source_observation:{observation.id}"],
                            "evidence_ids": [id_ for id_ in (last_observation.id if last_observation else None, observation.id) if id_ is not None],
                            "article_ids": [],
                        }
                    )
                last_flag = flag
                last_observation = observation
        return changes[:5]

    def _group_risk_changes(self, changes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        grouped: dict[tuple[str, str | None, str | None], list[dict[str, Any]]] = defaultdict(list)
        for item in changes:
            grouped[(item.get("group_type") or "other", item.get("severity"), item.get("status"))].append(item)
        result: list[dict[str, Any]] = []
        for (group_type, severity, status), items in grouped.items():
            vessel_ids = {item.get("vessel_id") for item in items if item.get("vessel_id") is not None}
            field_counter: Counter[str] = Counter()
            examples = []
            for item in items:
                fields = _identity_fields(item.get("summary") or "")
                field_counter.update(fields)
                if len(examples) < 8:
                    examples.append(
                        {
                            "vessel_name": item.get("vessel_name") or "Vessel",
                            "imo": item.get("imo"),
                            "fields": fields,
                            "source_label": item.get("flag_type"),
                            "evidence_id": (item.get("evidence_ids") or [None])[0],
                        }
                    )
            summary = self._risk_group_summary(group_type, len(items), len(vessel_ids), field_counter)
            result.append(
                {
                    "group_type": group_type,
                    "severity": severity,
                    "status": status,
                    "count": len(items),
                    "vessel_count": len(vessel_ids),
                    "summary": summary,
                    "examples": examples,
                    "hidden_example_count": max(0, len(items) - len(examples)),
                    "why_shown": "New risk flag records were created during this report window.",
                    "support_ids": sorted({sid for item in items for sid in item.get("support_ids", [])}),
                    "article_ids": [],
                    "evidence_ids": sorted({eid for item in items for eid in item.get("evidence_ids", []) if eid is not None}),
                }
            )
        result.sort(key=lambda item: (RISK_GROUP_ORDER.get(item["group_type"], 99), SEVERITY_ORDER.get(item.get("severity"), 99), -item["vessel_count"], -item["count"]))
        return result[:6]

    def _risk_group_summary(self, group_type: str, count: int, vessel_count: int, fields: Counter[str]) -> str:
        if group_type == "identity_conflict":
            common = ", ".join(name.lower() for name, _ in fields.most_common(3)) or "stored vessel details"
            return f"{vessel_count} vessels had {count} new identity-conflict records this week. Most involved {common}."
        if group_type == "high_risk_flag_country":
            return f"{vessel_count} vessels had {count} new high-risk flag country records this week."
        label = group_type.replace("_", " ")
        return f"{vessel_count} vessels had {count} new {label} records this week."

    def _group_entity_changes(self, changes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        display_names: dict[str, str] = {}
        for item in changes:
            key = normalize_entity_name(item.get("entity_name") or "Entity")
            grouped[key].append(item)
            display_names[key] = item.get("entity_name") or "Entity"
        result: list[dict[str, Any]] = []
        for key, items in grouped.items():
            vessel_ids = {item.get("vessel_id") for item in items if item.get("vessel_id") is not None}
            roles = sorted({ROLE_LABELS.get(item.get("relationship_type"), str(item.get("relationship_type") or "Relationship").replace("_", " ").title()) for item in items})
            examples = [
                {
                    "vessel_name": item.get("vessel_name"),
                    "role": ROLE_LABELS.get(item.get("relationship_type"), str(item.get("relationship_type") or "Relationship").replace("_", " ").title()),
                    "evidence_id": (item.get("evidence_ids") or [None])[0],
                }
                for item in items[:8]
            ]
            result.append(
                {
                    "entity_name": display_names[key],
                    "country_code": next((item.get("country_code") for item in items if item.get("country_code")), None),
                    "roles": roles,
                    "vessel_count": len(vessel_ids),
                    "relationship_count": len(items),
                    "confidence": next((item.get("confidence") for item in items if item.get("confidence")), None),
                    "source_summary": _source_summary(items),
                    "examples": examples,
                    "hidden_example_count": max(0, len(items) - len(examples)),
                    "why_shown": "New vessel relationship records were added during this report window.",
                    "support_ids": sorted({sid for item in items for sid in item.get("support_ids", [])}),
                    "article_ids": [],
                    "evidence_ids": sorted({eid for item in items for eid in item.get("evidence_ids", []) if eid is not None}),
                }
            )
        result.sort(key=lambda item: (-item["vessel_count"], -item["relationship_count"], item["entity_name"]))
        return result[:6]

    def _group_operational_context(self, context: list[dict[str, Any]]) -> list[dict[str, Any]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for item in context:
            group_type = item.get("group_type") or ("ais_freshness" if item.get("signal_type") == "ais_gap" else item.get("signal_type") or "other")
            if group_type == "ais_gap":
                group_type = "ais_freshness"
            grouped[group_type].append(item)
        result: list[dict[str, Any]] = []
        for group_type, items in grouped.items():
            vessel_ids = {item.get("vessel_id") for item in items if item.get("vessel_id") is not None}
            examples = [
                {
                    "vessel_name": item.get("vessel_name") or item.get("title") or "Vessel",
                    "detail": item.get("detail") or item.get("summary") or "",
                    "timestamp": item.get("timestamp"),
                    "source": item.get("source"),
                    "evidence_id": (item.get("evidence_ids") or [None])[0],
                }
                for item in items[:5]
            ]
            if group_type == "ais_freshness":
                summary = f"{len(vessel_ids)} vessels had stored AIS positions older than expected. SEAM treats this as data freshness, not confirmed vessel behavior."
                why = "Stored AIS position timestamps were older than the weekly freshness threshold."
            elif group_type == "port_activity":
                summary = f"{len(items)} stored port event observations were recorded for {len(vessel_ids)} vessels."
                why = "Stored port event records were observed during this report window."
            else:
                summary = f"{len(items)} stored operational context records were observed for {len(vessel_ids)} vessels."
                why = "Stored operational records were observed during this report window."
            result.append(
                {
                    "group_type": group_type,
                    "count": len(items),
                    "vessel_count": len(vessel_ids),
                    "summary": summary,
                    "examples": examples,
                    "hidden_example_count": max(0, len(items) - len(examples)),
                    "why_shown": why,
                    "support_ids": sorted({sid for item in items for sid in item.get("support_ids", [])}),
                    "article_ids": [],
                    "evidence_ids": sorted({eid for item in items for eid in item.get("evidence_ids", []) if eid is not None}),
                }
            )
        order = {"ais_freshness": 0, "port_activity": 1, "arrival_departure": 2, "movement": 3, "other": 4}
        result.sort(key=lambda item: (order.get(item["group_type"], 99), -item["count"]))
        return result[:5]

    def _selected_news(self, articles: list[ScoredNewsArticle]) -> list[dict[str, Any]]:
        seen_urls: set[str] = set()
        seen_titles: set[str] = set()
        ranked = sorted(articles, key=lambda item: (_news_rank(item), item.published_at or datetime.min.replace(tzinfo=UTC), item.id), reverse=True)
        rows: list[dict[str, Any]] = []
        for article in ranked:
            normalized = normalize_headline(article.title)
            if article.url in seen_urls or normalized in seen_titles:
                continue
            seen_urls.add(article.url)
            seen_titles.add(normalized)
            matched_to = None
            if article.linked_vessels:
                matched_to = {"type": "vessel", "label": str(article.linked_vessels[0].get("name") or "Vessel")}
            elif article.linked_entities:
                matched_to = {"type": "entity", "label": str(article.linked_entities[0].get("name") or "Entity")}
            elif article.relevance_reasons:
                matched_to = {"type": "topic", "label": article.relevance_reasons[0]}
            cls = source_class(article.source, article.source_badge)
            rows.append(
                {
                    "title": article.title,
                    "source": article.source_badge or article.source,
                    "published_at": article.published_at.isoformat() if article.published_at else None,
                    "url": article.url,
                    "summary": clip_words(article.summary or article.title, 38),
                    "source_quality": article.source_quality,
                    "source_class": cls,
                    "matched_to": matched_to,
                    "why_shown": _news_why_shown(cls, matched_to),
                    "support_ids": [f"article:{article.id}"],
                    "article_ids": [article.id],
                    "evidence_ids": article.evidence_ids[:5],
                }
            )
            if len(rows) >= 8:
                break
        return rows

    def _key_developments(
        self,
        risk_groups: list[dict[str, Any]],
        entity_groups: list[dict[str, Any]],
        operational_groups: list[dict[str, Any]],
        selected_news: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        developments: list[dict[str, Any]] = []
        for article in selected_news:
            if len(developments) >= 3:
                break
            developments.append(
                {
                    "id": f"news-{article['article_ids'][0]}",
                    "label": _news_development_label(article),
                    "facts": [article["summary"]],
                    "source_type": "official" if article["source_class"] == "official" else "trade" if article["source_class"] == "trade" else "social_unverified" if article["source_class"] == "social_unverified" else "mixed",
                    "confidence": "source_linked",
                    "why_shown": article["why_shown"],
                    "support_ids": article.get("support_ids", []),
                    "article_ids": article.get("article_ids", []),
                    "evidence_ids": article.get("evidence_ids", [])[:5],
                }
            )
        return developments[:3]


def _news_development_label(article: dict[str, Any]) -> str:
    title = str(article.get("title") or "Source-linked maritime news")
    matched_to = article.get("matched_to") if isinstance(article.get("matched_to"), dict) else None
    vessel_name = str(matched_to.get("label") or "").strip() if matched_to and matched_to.get("type") == "vessel" else ""
    if vessel_name and vessel_name.casefold() not in title.casefold():
        return clip_words(f"{vessel_name}: {title}", 24)
    return clip_words(title, 24)


def _identity_fields(summary: str) -> list[str]:
    match = re.search(r"Conflicting identity fields detected:\s*(.+)", summary, flags=re.IGNORECASE)
    if not match:
        return []
    return [part.strip().strip(".") for part in match.group(1).split(",") if part.strip()]


def _source_summary(items: list[dict[str, Any]]) -> str:
    text = " ".join(str(item.get("summary") or "") for item in items).casefold()
    if "oceans-x" in text or "particulars" in text:
        return "OCEANS-X vessel particulars"
    return items[0].get("summary") or "Stored relationship records"


def _news_rank(article: ScoredNewsArticle) -> int:
    cls = source_class(article.source, article.source_badge)
    class_score = {"official": 40, "trade": 30, "general_news": 20, "social_unverified": 5, "unknown": 0}.get(cls, 0)
    link_score = 12 if article.linked_vessel_ids or article.linked_entity_ids else 0
    recruiting_penalty = 30 if is_recruiting_article(article) else 0
    return class_score + link_score + article.relevance_score - recruiting_penalty


def _news_why_shown(cls: str, matched_to: dict[str, str] | None) -> str:
    if matched_to:
        if matched_to["type"] == "topic":
            return "Article selected because it matched a SEAM topic."
        return f"Article selected because it matched a SEAM {matched_to['type']} or topic."
    if cls == "official":
        return "Official source included because it is related to Singapore maritime operations."
    return "Article selected from the scoped weekly Singapore maritime source set."
