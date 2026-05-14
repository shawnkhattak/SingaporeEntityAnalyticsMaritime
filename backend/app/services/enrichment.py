import socket
from csv import DictReader
from io import StringIO
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.evidence import SourceObservation
from app.models.maritime import Entity, Vessel
from app.models.risk import NewsArticle, NewsLink, RiskFlag, SanctionsRecord
from app.services.ingestion import _datetime_value, stable_payload_hash


def classify_match(candidate: str, target: str) -> str:
    c = _normalize_match_text(candidate)
    t = _normalize_match_text(target)
    if not c or not t:
        return "weak"
    if c == t:
        return "exact"
    if c in t or t in c:
        return "strong"
    c_words = set(c.split())
    t_words = set(t.split())
    return "possible" if len(c_words & t_words) >= 2 else "weak"


def conservative_name_match(candidate: str, target: str) -> str:
    c = _normalize_match_text(candidate)
    t = _normalize_match_text(target)
    if not c or not t:
        return "weak"
    if c == t:
        return "exact"
    if len(c) >= 8 and len(t) >= 8 and (c in t or t in c):
        return "strong"
    return "weak"


def _normalize_match_text(value: str) -> str:
    return " ".join(value.casefold().replace(".", " ").replace(",", " ").split())


class EnrichmentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def ingest_sanctions_live(self, settings: Settings) -> dict[str, int]:
        if not settings.opensanctions_api_url or not settings.opensanctions_api_key:
            raise ValueError("OPENSANCTIONS_API_URL and OPENSANCTIONS_API_KEY are required for live sanctions ingestion.")
        entities = list(await self.session.scalars(select(Entity).order_by(Entity.id)))
        call_budget = max(settings.opensanctions_live_call_budget, 0)
        batch_size = max(settings.opensanctions_batch_size, 1)
        stats = {
            "api_calls_used": 0,
            "api_call_budget": call_budget,
            "entities_available": len(entities),
            "entities_checked": 0,
            "rows_seen": 0,
            "observations_inserted": 0,
            "records_inserted": 0,
            "risk_flags_inserted": 0,
        }
        now = datetime.now(UTC)
        if call_budget <= 0:
            raise ValueError("OpenSanctions live call budget is 0. Use CSV ingestion or increase OPENSANCTIONS_LIVE_CALL_BUDGET.")
        for start in range(0, len(entities), batch_size):
            if stats["api_calls_used"] >= call_budget:
                break
            batch = entities[start:start + batch_size]
            responses = await _match_opensanctions(settings, batch)
            stats["api_calls_used"] += 1
            stats["entities_checked"] += len(batch)
            await self._ingest_sanctions_match_responses(responses, {str(entity.id): entity for entity in batch}, now, stats)
        await self.session.commit()
        return stats

    async def ingest_sanctions_csv(self, csv_text: str) -> dict[str, int]:
        rows = list(DictReader(StringIO(csv_text)))
        vessels = list(await self.session.scalars(select(Vessel).order_by(Vessel.id)))
        entities = list(await self.session.scalars(select(Entity).order_by(Entity.id)))
        vessel_index = _build_vessel_index(vessels)
        entity_index = _build_entity_index(entities)
        stats = {
            "rows_seen": len(rows),
            "vessels_checked": len(vessels),
            "entities_checked": len(entities),
            "vessel_matches": 0,
            "entity_matches": 0,
            "name_fallback_matches": 0,
            "observations_inserted": 0,
            "records_inserted": 0,
            "risk_flags_inserted": 0,
        }
        now = datetime.now(UTC)
        for raw_row in rows:
            row = _normalize_sanctions_csv_row(raw_row)
            matched_vessels = _match_sanctions_vessels(row, vessel_index)
            matched_entities = _match_sanctions_entities(row, entity_index)
            stats["vessel_matches"] += len(matched_vessels)
            stats["entity_matches"] += len(matched_entities)
            if not matched_vessels and not matched_entities:
                fallback_vessels = _match_sanctions_vessels_by_name(row, vessels)
                fallback_entities = _match_sanctions_entities_by_name(row, entities)
                stats["name_fallback_matches"] += len(fallback_vessels) + len(fallback_entities)
                matched_vessels.extend(fallback_vessels)
                matched_entities.extend(fallback_entities)
            for vessel in matched_vessels:
                await self._ingest_sanctions_row(vessel, row, _csv_confidence(row, "vessel"), now, stats)
            for entity in matched_entities:
                await self._ingest_sanctions_row(entity, row, _csv_confidence(row, "entity"), now, stats)
        await self.session.commit()
        return stats

    async def ingest_sanctions_csv_url(self, settings: Settings) -> dict[str, int | str]:
        csv_text = await _fetch_text(settings.opensanctions_maritime_csv_url)
        stats = await self.ingest_sanctions_csv(csv_text)
        return {"source_url": settings.opensanctions_maritime_csv_url, **stats}

    async def ingest_news_live(self, settings: Settings) -> dict[str, int]:
        if not settings.news_rss_urls:
            raise ValueError("NEWS_RSS_URLS must contain at least one live RSS or Atom feed URL.")
        stats = {"feeds_seen": 0, "rows_seen": 0, "articles_inserted": 0, "links_inserted": 0}
        now = datetime.now(UTC)
        entities = list(await self.session.scalars(select(Entity)))
        vessels = list(await self.session.scalars(select(Vessel)))
        for feed_url in settings.news_rss_urls:
            rows = await _fetch_feed_articles(feed_url)
            stats["feeds_seen"] += 1
            stats["rows_seen"] += len(rows)
            for row in rows:
                if not row.get("url") or not row.get("title"):
                    continue
                observation, _ = await self._observation(row.get("source", "RSS"), "news_article", row.get("url"), row, now)
                article = await self.session.scalar(select(NewsArticle).where(NewsArticle.url == row["url"]))
                if article is None:
                    article = NewsArticle(
                        source=row.get("source", "RSS"),
                        title=row["title"],
                        url=row["url"],
                        published_at=_news_datetime(row.get("published_at"), now),
                        summary=row.get("summary"),
                        raw_payload=row,
                    )
                    self.session.add(article)
                    await self.session.flush()
                    stats["articles_inserted"] += 1
                haystack = f"{row.get('title', '')} {row.get('summary', '')}"
                for entity in entities:
                    if entity.name.casefold() in haystack.casefold():
                        stats["links_inserted"] += int(await self._ensure_news_link(article.id, entity.id, None, "strong", entity.name, observation.id))
                        await self._ensure_risk_flag(None, entity.id, "negative_news_mention", "medium", f"News mention: {row['title']}", observation.id)
                for vessel in vessels:
                    if vessel.name.casefold() in haystack.casefold():
                        stats["links_inserted"] += int(await self._ensure_news_link(article.id, None, vessel.id, "strong", vessel.name, observation.id))
        await self.session.commit()
        return stats


    async def _observation(self, source: str, observation_type: str, record_id: str | None, payload: dict[str, Any], now: datetime) -> tuple[SourceObservation, bool]:
        payload_hash = stable_payload_hash(payload)
        observation = await self.session.scalar(
            select(SourceObservation).where(
                SourceObservation.source == source,
                SourceObservation.observation_type == observation_type,
                SourceObservation.payload_hash == payload_hash,
            )
        )
        if observation is not None:
            return observation, False
        observation = SourceObservation(
            source=source,
            observation_type=observation_type,
            source_record_id=record_id,
            observed_at=now,
            fetched_at=now,
            payload_hash=payload_hash,
            raw_payload=payload,
        )
        self.session.add(observation)
        await self.session.flush()
        return observation, True

    async def _ensure_news_link(self, article_id: int, entity_id: int | None, vessel_id: int | None, confidence: str, matched_text: str, evidence_id: int) -> bool:
        existing = await self.session.scalar(
            select(NewsLink).where(
                NewsLink.article_id == article_id,
                NewsLink.entity_id == entity_id,
                NewsLink.vessel_id == vessel_id,
                NewsLink.evidence_id == evidence_id,
            )
        )
        if existing is not None:
            return False
        self.session.add(NewsLink(article_id=article_id, entity_id=entity_id, vessel_id=vessel_id, confidence=confidence, matched_text=matched_text, evidence_id=evidence_id))
        await self.session.flush()
        return True

    async def _ingest_sanctions_match_responses(
        self,
        responses: dict[str, Any],
        entities_by_query_id: dict[str, Entity],
        now: datetime,
        stats: dict[str, int],
    ) -> None:
        for query_id, response in responses.items():
            entity = entities_by_query_id.get(str(query_id))
            if entity is None or not isinstance(response, dict):
                continue
            results = response.get("results")
            if not isinstance(results, list):
                continue
            stats["rows_seen"] += len(results)
            for result in results:
                if not isinstance(result, dict):
                    continue
                confidence = _confidence_from_opensanctions_result(result, entity.name)
                if confidence in {"weak", "possible"}:
                    continue
                await self._ingest_sanctions_row(entity, result, confidence, now, stats)

    async def _ingest_sanctions_row(
        self,
        subject: Entity | Vessel,
        row: dict[str, Any],
        confidence: str,
        now: datetime,
        stats: dict[str, int],
    ) -> None:
        names = _sanctions_names(row)
        matched_name = names[0] if names else _string_value(row.get("caption") or row.get("id") or "")
        entity_id = subject.id if isinstance(subject, Entity) else None
        vessel_id = subject.id if isinstance(subject, Vessel) else None
        observation, inserted_observation = await self._observation(
            "OpenSanctions",
            "sanctions_record",
            _string_value(row.get("id")),
            row,
            now,
        )
        stats["observations_inserted"] += int(inserted_observation)
        record = await self.session.scalar(
            select(SanctionsRecord).where(
                SanctionsRecord.entity_id == entity_id,
                SanctionsRecord.vessel_id == vessel_id,
                SanctionsRecord.matched_name == matched_name,
                SanctionsRecord.evidence_id == observation.id,
            )
        )
        if record is None:
            self.session.add(
                SanctionsRecord(
                    entity_id=entity_id,
                    vessel_id=vessel_id,
                    source="OpenSanctions Maritime",
                    program=_program_name(row),
                    matched_name=matched_name or subject.name,
                    confidence=confidence,
                    evidence_id=observation.id,
                )
            )
            stats["records_inserted"] += 1
        flag_type = _risk_flag_type(row)
        severity = _severity_for_risk(row)
        inserted = await self._ensure_risk_flag(
            entity_id=entity_id,
            vessel_id=vessel_id,
            flag_type=flag_type,
            severity=severity,
            summary=f"{confidence.title()} OpenSanctions maritime match: {matched_name or subject.name} ({'; '.join(_risk_topics(row)) or 'watchlist'})",
            evidence_id=observation.id,
        )
        stats["risk_flags_inserted"] += int(inserted)

    async def _ensure_risk_flag(self, vessel_id: int | None, entity_id: int | None, flag_type: str, severity: str, summary: str, evidence_id: int | None) -> bool:
        """Insert-or-update a unique active risk flag per (subject, flag_type).
        Mirrors `RiskService._ensure_flag` — drops `evidence_id` from the
        uniqueness key so a vessel accumulates one active sanctions /
        news flag, not one per matching observation. Latest evidence
        replaces the older row's evidence_id.
        """
        existing = await self.session.scalar(
            select(RiskFlag).where(
                RiskFlag.vessel_id == vessel_id,
                RiskFlag.entity_id == entity_id,
                RiskFlag.flag_type == flag_type,
                RiskFlag.status == "active",
            )
        )
        if existing is not None:
            if evidence_id is not None and existing.evidence_id != evidence_id:
                existing.evidence_id = evidence_id
            if existing.severity != severity:
                existing.severity = severity
            if existing.summary != summary:
                existing.summary = summary
            await self.session.flush()
            return False
        self.session.add(RiskFlag(vessel_id=vessel_id, entity_id=entity_id, flag_type=flag_type, severity=severity, summary=summary, evidence_id=evidence_id, status="active"))
        await self.session.flush()
        return True


def _confidence_rank(value: str) -> int:
    return {"weak": 0, "possible": 1, "strong": 2, "exact": 3}[value]


async def _match_opensanctions(settings: Settings, entities: list[Entity]) -> dict[str, Any]:
    url = f"{settings.opensanctions_api_url.rstrip('/')}/match/{settings.opensanctions_dataset}"
    headers = {"Accept": "application/json", "User-Agent": "SEAM/1.0"}
    headers["Authorization"] = f"ApiKey {settings.opensanctions_api_key}"
    headers["Content-Type"] = "application/json"
    payload = {
        "queries": {
            str(entity.id): {
                "schema": "Organization",
                "properties": {"name": [entity.name]},
            }
            for entity in entities
        }
    }
    response = await _fetch_json(url, headers=headers, data=payload, params={"limit": 3, "threshold": 0.72})
    if isinstance(response, dict) and isinstance(response.get("responses"), dict):
        return response["responses"]
    return {}


async def _fetch_json(url: str, headers: dict[str, str], data: dict[str, Any] | None = None, params: dict[str, Any] | None = None) -> Any:
    import asyncio
    import json

    def _sync_fetch() -> Any:
        request_url = url
        if params:
            request_url = f"{url}?{urllib.parse.urlencode(params)}"
        body = json.dumps(data).encode("utf-8") if data is not None else None
        request = urllib.request.Request(request_url, data=body, headers=headers, method="POST" if data is not None else "GET")
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                body = response.read()
        except TimeoutError as exc:
            raise ValueError(f"Timed out while fetching {url}") from exc
        except socket.timeout as exc:
            raise ValueError(f"Timed out while fetching {url}") from exc
        except urllib.error.HTTPError as exc:
            raise ValueError(f"Live source returned HTTP {exc.code}: {url}") from exc
        except urllib.error.URLError as exc:
            raise ValueError(f"Live source request failed for {url}: {exc.reason}") from exc
        return json.loads(body.decode("utf-8"))

    return await asyncio.to_thread(_sync_fetch)


async def _fetch_text(url: str) -> str:
    import asyncio

    def _sync_fetch() -> str:
        request = urllib.request.Request(url, headers={"Accept": "text/csv,text/plain,*/*", "User-Agent": "SEAM/1.0"}, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                body = response.read()
        except TimeoutError as exc:
            raise ValueError(f"Timed out while fetching {url}") from exc
        except socket.timeout as exc:
            raise ValueError(f"Timed out while fetching {url}") from exc
        except urllib.error.HTTPError as exc:
            raise ValueError(f"Live source returned HTTP {exc.code}: {url}") from exc
        except urllib.error.URLError as exc:
            raise ValueError(f"Live source request failed for {url}: {exc.reason}") from exc
        return body.decode("utf-8-sig")

    return await asyncio.to_thread(_sync_fetch)


async def _fetch_feed_articles(feed_url: str) -> list[dict[str, Any]]:
    import asyncio

    def _sync_fetch() -> list[dict[str, Any]]:
        request = urllib.request.Request(feed_url, headers={"Accept": "application/rss+xml, application/atom+xml, application/xml", "User-Agent": "SEAM/1.0"}, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                body = response.read()
        except TimeoutError as exc:
            raise ValueError(f"Timed out while fetching news feed {feed_url}") from exc
        except socket.timeout as exc:
            raise ValueError(f"Timed out while fetching news feed {feed_url}") from exc
        except urllib.error.HTTPError as exc:
            raise ValueError(f"News feed returned HTTP {exc.code}: {feed_url}") from exc
        except urllib.error.URLError as exc:
            raise ValueError(f"News feed request failed for {feed_url}: {exc.reason}") from exc
        root = ET.fromstring(body)
        host = urllib.parse.urlparse(feed_url).netloc or "RSS"
        source = _xml_text(root.find("./channel/title")) or host
        articles = []
        for item in root.findall(".//item"):
            articles.append(
                {
                    "source": source,
                    "feed_url": feed_url,
                    "title": _xml_text(item.find("title")),
                    "url": _xml_text(item.find("link")) or _xml_text(item.find("guid")),
                    "published_at": _xml_text(item.find("pubDate")) or _xml_text(item.find("published")),
                    "summary": _xml_text(item.find("description")),
                }
            )
        atom = "{http://www.w3.org/2005/Atom}"
        for entry in root.findall(f".//{atom}entry"):
            link_node = entry.find(f"{atom}link")
            articles.append(
                {
                    "source": source,
                    "feed_url": feed_url,
                    "title": _xml_text(entry.find(f"{atom}title")),
                    "url": link_node.attrib.get("href") if link_node is not None else None,
                    "published_at": _xml_text(entry.find(f"{atom}published")) or _xml_text(entry.find(f"{atom}updated")),
                    "summary": _xml_text(entry.find(f"{atom}summary")) or _xml_text(entry.find(f"{atom}content")),
                }
            )
        return [article for article in articles if article.get("title") and article.get("url")]

    return await asyncio.to_thread(_sync_fetch)


def _xml_text(node: ET.Element | None) -> str | None:
    if node is None or node.text is None:
        return None
    text = " ".join(node.text.split())
    return text or None


def _news_datetime(value: Any, fallback: datetime) -> datetime:
    if isinstance(value, str):
        try:
            parsed = parsedate_to_datetime(value)
            return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)
        except (TypeError, ValueError, IndexError):
            pass
    return _datetime_value(value, fallback)


def _sanctions_names(row: dict[str, Any]) -> list[str]:
    values: list[str] = []
    for key in ("caption", "name"):
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            values.append(value.strip())
    properties = row.get("properties")
    if isinstance(properties, dict):
        for key in ("name", "alias"):
            value = properties.get(key)
            if isinstance(value, list):
                values.extend([str(item).strip() for item in value if str(item).strip()])
            elif isinstance(value, str) and value.strip():
                values.append(value.strip())
    return list(dict.fromkeys(values))


def _program_name(row: dict[str, Any]) -> str | None:
    datasets = row.get("datasets")
    if isinstance(datasets, list) and datasets:
        return ", ".join(str(item) for item in datasets[:3])
    schema = row.get("schema")
    return str(schema) if schema else None


def _string_value(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _confidence_from_opensanctions_result(row: dict[str, Any], entity_name: str) -> str:
    score = row.get("score")
    try:
        numeric_score = float(score)
    except (TypeError, ValueError):
        numeric_score = 0.0
    name_confidence = max((classify_match(name, entity_name) for name in _sanctions_names(row)), key=_confidence_rank, default="weak")
    if name_confidence == "exact" and numeric_score >= 0.9:
        return "exact"
    if numeric_score >= 0.85 or name_confidence == "strong":
        return "strong"
    if numeric_score >= 0.72:
        return "possible"
    return "weak"


def _normalize_sanctions_csv_row(row: dict[str, str]) -> dict[str, Any]:
    properties: dict[str, list[str]] = {}
    names = [
        row.get("name"),
        row.get("caption"),
        row.get("matched_name"),
        row.get("alias"),
        row.get("aliases"),
    ]
    values = [value.strip() for value in names if isinstance(value, str) and value.strip()]
    if values:
        properties["name"] = values
    datasets = _split_csv_cell(row.get("datasets") or row.get("dataset"))
    topics = _split_csv_cell(row.get("risk") or row.get("topics") or row.get("topic"))
    imo = _clean_maritime_identifier(row.get("imo"), "IMO")
    mmsi = _clean_maritime_identifier(row.get("mmsi"), "")
    return {
        "id": row.get("id") or row.get("entity_id") or row.get("canonical_id"),
        "caption": row.get("caption") or row.get("name") or row.get("matched_name"),
        "schema": row.get("schema") or ("Vessel" if row.get("type") == "VESSEL" else "Organization"),
        "maritime_type": row.get("type"),
        "imo": imo,
        "mmsi": mmsi,
        "countries": _split_csv_cell(row.get("countries")),
        "flag": _clean_maritime_identifier(row.get("flag"), ""),
        "datasets": datasets,
        "topics": topics,
        "risk": topics,
        "url": row.get("url"),
        "properties": properties,
        "raw_csv_row": row,
    }


def _split_csv_cell(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.replace(";", ",").replace("|", ",").split(",") if item.strip()]


def _clean_maritime_identifier(value: str | None, prefix: str) -> str | None:
    if not value:
        return None
    text = value.strip()
    if prefix and text.upper().startswith(prefix):
        text = text[len(prefix):]
    text = text.strip()
    return text or None


def _risk_topics(row: dict[str, Any]) -> list[str]:
    topics = row.get("risk") or row.get("topics")
    return [str(topic) for topic in topics] if isinstance(topics, list) else []


def _risk_flag_type(row: dict[str, Any]) -> str:
    topics = set(_risk_topics(row))
    if "sanction" in topics or "sanction.linked" in topics or "sanction.counter" in topics:
        return "sanctions_match"
    if any(topic.startswith("mare.") for topic in topics):
        return "maritime_watchlist"
    if "reg.action" in topics:
        return "regulatory_action"
    if "reg.warn" in topics:
        return "regulatory_warning"
    if "debarment" in topics:
        return "debarment_match"
    return "maritime_watchlist"


def _severity_for_risk(row: dict[str, Any]) -> str:
    topics = set(_risk_topics(row))
    if "sanction" in topics:
        return "critical"
    if "sanction.linked" in topics or "mare.shadow" in topics:
        return "high"
    if topics & {"sanction.counter", "mare.detained", "mare.sts", "reg.action", "reg.warn", "debarment"}:
        return "medium"
    return "low"


def _csv_confidence(row: dict[str, Any], subject_type: str) -> str:
    if subject_type == "vessel" and (row.get("imo") or row.get("mmsi")):
        return "exact"
    if subject_type == "entity" and row.get("imo"):
        return "exact"
    return "strong"


def _build_vessel_index(vessels: list[Vessel]) -> dict[str, dict[str, Vessel]]:
    by_imo = {vessel.imo: vessel for vessel in vessels if vessel.imo}
    by_mmsi = {vessel.mmsi: vessel for vessel in vessels if vessel.mmsi}
    return {"imo": by_imo, "mmsi": by_mmsi}


def _build_entity_index(entities: list[Entity]) -> dict[str, Entity]:
    return {entity.external_id: entity for entity in entities if entity.external_id}


def _match_sanctions_vessels(row: dict[str, Any], vessel_index: dict[str, dict[str, Vessel]]) -> list[Vessel]:
    matches: list[Vessel] = []
    imo = row.get("imo")
    mmsi = row.get("mmsi")
    if imo and imo in vessel_index["imo"]:
        matches.append(vessel_index["imo"][imo])
    if mmsi and mmsi in vessel_index["mmsi"] and vessel_index["mmsi"][mmsi] not in matches:
        matches.append(vessel_index["mmsi"][mmsi])
    return matches


def _match_sanctions_entities(row: dict[str, Any], entity_index: dict[str, Entity]) -> list[Entity]:
    external_id = row.get("id")
    return [entity_index[external_id]] if external_id in entity_index else []


def _match_sanctions_vessels_by_name(row: dict[str, Any], vessels: list[Vessel]) -> list[Vessel]:
    if row.get("maritime_type") != "VESSEL":
        return []
    names = _sanctions_names(row)
    return [vessel for vessel in vessels if max((conservative_name_match(name, vessel.name) for name in names), key=_confidence_rank, default="weak") in {"exact", "strong"}]


def _match_sanctions_entities_by_name(row: dict[str, Any], entities: list[Entity]) -> list[Entity]:
    if row.get("maritime_type") == "VESSEL":
        return []
    names = _sanctions_names(row)
    return [entity for entity in entities if max((conservative_name_match(name, entity.name) for name in names), key=_confidence_rank, default="weak") in {"exact", "strong"}]
