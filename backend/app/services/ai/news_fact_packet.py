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
            .limit(8)
        )
        return [
            {
                "vessel_id": vessel.id if vessel else flag.vessel_id,
                "vessel_name": vessel.name if vessel else f"Vessel {flag.vessel_id}",
                "change": f"New {flag.flag_type.replace('_', ' ')} flag",
                "severity": "critical" if flag.severity == "high" else flag.severity,
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
            .limit(8)
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
                    "relationship_type": relationship.relationship_type,
                    "change": f"New {relationship.relationship_type.replace('_', ' ')} linkage",
                    "summary": relationship.evidence_summary or f"{subject} linked to {target}.",
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
            .limit(5)
        )
        for vessel, position in stale_rows:
            hours = int((now - position.position_timestamp).total_seconds() // 3600)
            context.append(
                {
                    "title": f"{vessel.name} AIS position is {hours}h old",
                    "summary": "Computed from latest stored position timestamp; this is a data freshness signal, not a confirmed AIS outage.",
                    "signal_type": "ais_gap",
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
            .limit(5)
        )
        for event, vessel in port_rows:
            vessel_name = vessel.name if vessel else "Unlinked vessel"
            port_name = event.port_name or event.port_code or "port"
            context.append(
                {
                    "title": f"{vessel_name} {event.event_type.replace('_', ' ')} at {port_name}",
                    "summary": "Stored port event observed in the weekly window.",
                    "signal_type": "port_activity",
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
        return context[:10], method_gaps[:4]

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
