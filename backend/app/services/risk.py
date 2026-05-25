from datetime import datetime, UTC
from typing import Any

from sqlalchemy import bindparam, case, desc, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import SourceObservation
from app.models.maritime import Entity, Vessel
from app.models.risk import RiskFlag
from app.schemas.risk import RiskFeedItem, RiskFlagRead


HIGH_RISK_FLAG_COUNTRIES = {"KP", "IR", "SY"}

IDENTITY_CONFLICT_FIELDS: tuple[tuple[str, str], ...] = (
    ("name", "Name"),
    ("imo", "IMO"),
    ("mmsi", "MMSI"),
    ("flag", "Flag"),
    ("call_sign", "Callsign"),
    ("owner", "Owner"),
    ("operator", "Operator"),
)


def flag_country_severity(flag_country_code: str | None) -> str | None:
    if not flag_country_code:
        return None
    return "high" if flag_country_code.upper() in HIGH_RISK_FLAG_COUNTRIES else None

class RiskService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def feed(
        self,
        *,
        limit: int = 250,
        include_resolved: bool = False,
        flag_types: list[str] | None = None,
    ) -> list[RiskFeedItem]:
        severity_rank = case(
            (RiskFlag.severity == "critical", 4),
            (RiskFlag.severity == "high", 3),
            (RiskFlag.severity == "medium", 2),
            (RiskFlag.severity == "low", 1),
            else_=0,
        )
        statement = (
            select(RiskFlag, Vessel.name, Vessel.imo, Entity.name, SourceObservation.raw_payload)
            .outerjoin(Vessel, RiskFlag.vessel_id == Vessel.id)
            .outerjoin(Entity, RiskFlag.entity_id == Entity.id)
            .outerjoin(SourceObservation, SourceObservation.id == RiskFlag.evidence_id)
            .order_by(desc(severity_rank), desc(RiskFlag.created_at))
            .limit(limit)
        )
        if not include_resolved:
            statement = statement.where(RiskFlag.status == "active")
        if flag_types:
            statement = statement.where(RiskFlag.flag_type.in_(flag_types))

        rows = await self.session.execute(statement)
        raw_rows = list(rows)
        conflict_vessels: dict[int, Vessel] = {}
        for flag, vessel_name, vessel_imo, _entity_name, _evidence_payload in raw_rows:
            if flag.flag_type != "conflicting_identity" or flag.vessel_id is None or flag.status != "active":
                continue
            if not _has_structured_identity_summary(flag.summary):
                continue
            if not vessel_imo:
                continue
            conflict_vessels[flag.vessel_id] = Vessel(id=flag.vessel_id, name=vessel_name or "", imo=vessel_imo)
        conflict_details_by_vessel = await self._identity_conflicts_for_vessels(list(conflict_vessels.values()))

        items: list[RiskFeedItem] = []
        for flag, vessel_name, _vessel_imo, entity_name, evidence_payload in raw_rows:
            if flag.vessel_id is not None:
                subject = vessel_name or f"Vessel #{flag.vessel_id}"
            else:
                subject = entity_name or f"Entity #{flag.entity_id}"
            conflict_details = None
            if flag.flag_type == "conflicting_identity" and flag.vessel_id is not None:
                conflict_details = conflict_details_by_vessel.get(flag.vessel_id)
                if flag.status == "active" and not conflict_details:
                    continue
            items.append(
                RiskFeedItem(
                    flag=RiskFlagRead.model_validate(flag),
                    subject=subject,
                    vessel_id=flag.vessel_id,
                    entity_id=flag.entity_id,
                    evidence_payload=evidence_payload,
                    conflict_details=conflict_details,
                )
            )
        return items

    async def for_vessel(self, vessel_id: int) -> list[RiskFlagRead]:
        rows = await self.session.scalars(
            select(RiskFlag)
            .where(RiskFlag.vessel_id == vessel_id, RiskFlag.status == "active")
            .order_by(desc(RiskFlag.created_at))
        )
        return [RiskFlagRead.model_validate(row) for row in rows]

    async def feed_for_vessel(self, vessel_id: int) -> list[RiskFeedItem]:
        statement = (
            select(RiskFlag, Vessel.name, Vessel.imo, SourceObservation.raw_payload)
            .join(Vessel, RiskFlag.vessel_id == Vessel.id)
            .outerjoin(SourceObservation, SourceObservation.id == RiskFlag.evidence_id)
            .where(RiskFlag.vessel_id == vessel_id, RiskFlag.status == "active")
            .order_by(desc(RiskFlag.created_at))
        )
        rows = list(await self.session.execute(statement))
        vessel = None
        for _flag, vessel_name, vessel_imo, _evidence_payload in rows:
            vessel = Vessel(id=vessel_id, name=vessel_name or "", imo=vessel_imo)
            break
        conflict_details_by_vessel = await self._identity_conflicts_for_vessels([vessel]) if vessel is not None else {}
        items: list[RiskFeedItem] = []
        for flag, vessel_name, _vessel_imo, evidence_payload in rows:
            conflict_details = None
            if flag.flag_type == "conflicting_identity":
                conflict_details = conflict_details_by_vessel.get(vessel_id)
            items.append(
                RiskFeedItem(
                    flag=RiskFlagRead.model_validate(flag),
                    subject=vessel_name or f"Vessel #{vessel_id}",
                    vessel_id=flag.vessel_id,
                    entity_id=flag.entity_id,
                    evidence_payload=evidence_payload,
                    conflict_details=conflict_details,
                )
            )
        return items

    async def for_entity(self, entity_id: int) -> list[RiskFlagRead]:
        rows = await self.session.scalars(
            select(RiskFlag)
            .where(RiskFlag.entity_id == entity_id, RiskFlag.status == "active")
            .order_by(desc(RiskFlag.created_at))
        )
        return [RiskFlagRead.model_validate(row) for row in rows]

    async def recompute(self, vessel_id: int | None = None) -> dict[str, int]:
        stats = {"vessels_seen": 0, "flags_inserted": 0, "flags_retired": 0, "flags_deduped": 0}

        # Retire historical "unknown_ownership" flags — the rule was removed.
        retire_stmt = (
            update(RiskFlag)
            .where(RiskFlag.flag_type == "unknown_ownership", RiskFlag.status == "active")
            .values(status="resolved", resolved_at=datetime.now(UTC))
        )
        if vessel_id is not None:
            retire_stmt = retire_stmt.where(RiskFlag.vessel_id == vessel_id)
        retired = await self.session.execute(retire_stmt)
        stats["flags_retired"] = retired.rowcount or 0

        # Dedup pass: collapse duplicate active risk flags down to the
        # most-recent row per (vessel_id, entity_id, flag_type). The old
        # _ensure_flag treated evidence_id as part of the uniqueness key,
        # which let enrichment matchers (sanctions, news) accumulate
        # multiple active rows per vessel × flag type as new evidence
        # arrived. Keep the newest, mark the rest resolved.
        stats["flags_deduped"] = await self._dedup_active_flags(vessel_id)

        statement = select(Vessel)
        if vessel_id is not None:
            statement = statement.where(Vessel.id == vessel_id)
        vessels = list(await self.session.scalars(statement))
        for vessel in vessels:
            stats["vessels_seen"] += 1
            # NOTE: the old "unknown_ownership" rule was removed. OCEANS-X
            # currently exposes registered-owner relationships only for
            # Singapore-flagged vessels, so absence of ownership data on
            # other flags is uninformative and shouldn't penalize a vessel.
            severity = flag_country_severity(vessel.flag_country_code)
            if severity:
                stats["flags_inserted"] += int(
                    await self._ensure_flag(vessel.id, None, "high_risk_flag_country", severity, f"Flag country {vessel.flag_country_code} is configured as high risk.", None)
                )
            conflicts = await self._identity_conflicts(vessel)
            if conflicts:
                stats["flags_inserted"] += int(
                    await self._ensure_flag(vessel.id, None, "conflicting_identity", "low", _identity_conflict_summary(conflicts), None)
                )
            else:
                stats["flags_retired"] += await self._resolve_active_flag(vessel.id, None, "conflicting_identity")
        await self.session.commit()
        return stats

    async def _has_conflicting_identity(self, vessel: Vessel) -> bool:
        return bool(await self._identity_conflicts(vessel))

    async def _identity_conflicts(self, vessel: Vessel) -> list[dict[str, Any]]:
        return (await self._identity_conflicts_for_vessels([vessel])).get(vessel.id, [])

    async def _identity_conflicts_for_vessels(self, vessels: list[Vessel]) -> dict[int, list[dict[str, Any]]]:
        vessel_by_imo: dict[str, Vessel] = {}
        for vessel in vessels:
            if not vessel.imo:
                continue
            vessel_imo = _clean_identity_value(vessel.imo, numeric=True)
            if vessel_imo:
                vessel_by_imo[vessel_imo] = vessel
        if not vessel_by_imo:
            return {}

        statement = text(
            """
            SELECT
              split_part(source_record_id, '|', 1) AS imo_token,
              COALESCE(raw_payload->'vesselParticulars'->>'vesselName', raw_payload->>'vesselName', raw_payload->>'vessel_name', raw_payload->>'name') AS name,
              COALESCE(raw_payload->'vesselParticulars'->>'imoNumber', raw_payload->>'imoNumber', raw_payload->>'imo_number', raw_payload->>'imo') AS imo,
              COALESCE(raw_payload->'vesselParticulars'->>'mmsiNumber', raw_payload->>'mmsiNumber', raw_payload->>'mmsi_number', raw_payload->>'mmsi') AS mmsi,
              COALESCE(raw_payload->'vesselParticulars'->>'flag', raw_payload->>'flag', raw_payload->>'flagCountryCode', raw_payload->>'flag_country_code') AS flag,
              COALESCE(raw_payload->'vesselParticulars'->>'callSign', raw_payload->>'callSign', raw_payload->>'call_sign', raw_payload->>'callsign') AS call_sign,
              COALESCE(raw_payload->'vesselParticulars'->>'registeredOwner', raw_payload->'vesselParticulars'->>'registeredOwnership', raw_payload->>'registeredOwner', raw_payload->>'registered_owner', raw_payload->>'owner') AS owner,
              COALESCE(raw_payload->'vesselParticulars'->>'operator', raw_payload->>'operator', raw_payload->>'shipOperator', raw_payload->>'ship_operator') AS operator,
              COALESCE(raw_payload->'vesselParticulars'->>'vesselType', raw_payload->'vesselParticulars'->>'vesselTypeCode', raw_payload->>'vesselType', raw_payload->>'vessel_type', raw_payload->>'vesselTypeCode', raw_payload->>'vessel_type_code') AS vessel_type,
              COALESCE(raw_payload->'vesselParticulars'->>'vesselLength', raw_payload->>'vesselLength', raw_payload->>'length', raw_payload->>'loa', raw_payload->>'dimA') AS length,
              COALESCE(raw_payload->'vesselParticulars'->>'vesselBreadth', raw_payload->>'vesselBreadth', raw_payload->>'breadth', raw_payload->>'beam', raw_payload->>'dimB') AS breadth,
              COALESCE(raw_payload->'vesselParticulars'->>'vesselDepth', raw_payload->>'vesselDepth', raw_payload->>'depth') AS depth
            FROM source_observations
            WHERE split_part(source_record_id, '|', 1) IN :imos
            """
        ).bindparams(bindparam("imos", expanding=True))
        rows = (await self.session.execute(statement, {"imos": list(vessel_by_imo)})).mappings()
        fields_by_vessel: dict[int, dict[str, dict[str, Any]]] = {
            vessel.id: {} for vessel in vessel_by_imo.values()
        }
        for row in rows:
            payload_imo = _clean_identity_value(row["imo"] or row["imo_token"], numeric=True)
            if payload_imo not in vessel_by_imo:
                continue
            vessel = vessel_by_imo[payload_imo]
            fields = fields_by_vessel[vessel.id]
            for key, label in IDENTITY_CONFLICT_FIELDS:
                value = _row_identity_value(row, key)
                if value:
                    fields.setdefault(key, {"label": label, "values": {}})["values"][value.casefold()] = value

        conflicts_by_vessel: dict[int, list[dict[str, Any]]] = {}
        for vessel_id, fields in fields_by_vessel.items():
            conflicts: list[dict[str, Any]] = []
            for key, item in fields.items():
                values = list(item["values"].values())
                if len(values) > 1:
                    conflicts.append({"field": key, "label": item["label"], "values": values[:6]})
            if conflicts:
                conflicts_by_vessel[vessel_id] = conflicts
        return conflicts_by_vessel

    async def _ensure_flag(self, vessel_id: int | None, entity_id: int | None, flag_type: str, severity: str, summary: str, evidence_id: int | None) -> bool:
        """Insert-or-update a unique active risk flag per (subject, flag_type).

        Uniqueness no longer keys on `evidence_id` — that was the bug
        behind hundreds of duplicate sanctions/news flags. If a flag of
        the same kind already exists for this subject, we refresh its
        `summary`, `severity`, and `evidence_id` to the latest values
        and return False (no new row inserted).
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
            # Keep the row but pull forward the latest evidence + severity
            # so the UI reflects the most recent observation.
            if evidence_id is not None and existing.evidence_id != evidence_id:
                existing.evidence_id = evidence_id
            if existing.severity != severity:
                existing.severity = severity
            if existing.summary != summary:
                existing.summary = summary
            await self.session.flush()
            return False
        self.session.add(
            RiskFlag(
                vessel_id=vessel_id,
                entity_id=entity_id,
                flag_type=flag_type,
                severity=severity,
                summary=summary,
                evidence_id=evidence_id,
                status="active",
            )
        )
        await self.session.flush()
        return True

    async def _dedup_active_flags(self, vessel_id: int | None) -> int:
        """One-shot cleanup that collapses duplicate active risk flags down
        to the most-recent row per (vessel_id, entity_id, flag_type).
        Older rows are marked `resolved` (never deleted) so the dedup is
        reversible.
        """
        statement = select(RiskFlag).where(RiskFlag.status == "active").order_by(desc(RiskFlag.created_at))
        if vessel_id is not None:
            statement = statement.where(RiskFlag.vessel_id == vessel_id)
        rows = list(await self.session.scalars(statement))
        seen: set[tuple[int | None, int | None, str]] = set()
        retired = 0
        now = datetime.now(UTC)
        for flag in rows:
            key = (flag.vessel_id, flag.entity_id, flag.flag_type)
            if key in seen:
                flag.status = "resolved"
                flag.resolved_at = now
                retired += 1
            else:
                seen.add(key)
        if retired:
            await self.session.flush()
        return retired

    async def _resolve_active_flag(self, vessel_id: int | None, entity_id: int | None, flag_type: str) -> int:
        result = await self.session.execute(
            update(RiskFlag)
            .where(
                RiskFlag.vessel_id == vessel_id,
                RiskFlag.entity_id == entity_id,
                RiskFlag.flag_type == flag_type,
                RiskFlag.status == "active",
            )
            .values(status="resolved", resolved_at=datetime.now(UTC))
        )
        return result.rowcount or 0


def _payload_identity_value(payload: dict[str, Any], key: str) -> str | None:
    if not isinstance(payload, dict):
        return None
    particulars = payload.get("vesselParticulars") or payload.get("vessel_particulars") or payload.get("particulars") or {}
    if not isinstance(particulars, dict):
        particulars = {}

    def first(*names: str, numeric: bool = False) -> str | None:
        for name in names:
            value = particulars.get(name)
            if value is None:
                value = payload.get(name)
            cleaned = _clean_identity_value(value, numeric=numeric)
            if cleaned:
                return cleaned
        return None

    if key == "name":
        return first("vesselName", "vessel_name", "name")
    if key == "imo":
        return first("imoNumber", "imo_number", "imo", numeric=True)
    if key == "mmsi":
        return first("mmsiNumber", "mmsi_number", "mmsi", numeric=True)
    if key == "flag":
        return first("flag", "flagCountryCode", "flag_country_code", "flagState", "flag_state")
    if key == "call_sign":
        return first("callSign", "call_sign", "callsign")
    if key == "owner":
        return first("registeredOwner", "registeredOwnership", "registered_owner", "owner")
    if key == "operator":
        return first("operator", "shipOperator", "ship_operator")
    if key == "vessel_type":
        return first("vesselType", "vessel_type", "vesselTypeCode", "vessel_type_code", "shipType", "ship_type")
    if key == "dimensions":
        length = first("vesselLength", "length", "loa", "dimA", numeric=True)
        breadth = first("vesselBreadth", "breadth", "beam", "dimB", numeric=True)
        depth = first("vesselDepth", "depth", numeric=True)
        dimensions = [value for value in (length, breadth, depth) if value]
        return " x ".join(dimensions) if len(dimensions) >= 2 else None
    return None


def _row_identity_value(row: Any, key: str) -> str | None:
    if key in {"imo", "mmsi"}:
        return _clean_identity_value(row[key], numeric=True)
    if key == "dimensions":
        length = _clean_identity_value(row["length"], numeric=True)
        breadth = _clean_identity_value(row["breadth"], numeric=True)
        depth = _clean_identity_value(row["depth"], numeric=True)
        dimensions = [value for value in (length, breadth, depth) if value]
        return " x ".join(dimensions) if len(dimensions) >= 2 else None
    return _clean_identity_value(row[key])


def _clean_identity_value(value: Any, *, numeric: bool = False) -> str | None:
    if value is None:
        return None
    if isinstance(value, list | tuple | set):
        for item in value:
            cleaned = _clean_identity_value(item, numeric=numeric)
            if cleaned:
                return cleaned
        return None
    text = str(value).strip()
    if not text:
        return None
    upper = text.upper().strip()
    if upper in {"0", "00", "0000000", "000000000", "UNKNOWN", "UNK", "N/A", "NA", "NULL", "NONE", "-"}:
        return None
    if numeric:
        upper = upper.removeprefix("IMO").strip()
        if upper.endswith(".0"):
            upper = upper[:-2]
        digits = "".join(ch for ch in upper if ch.isdigit())
        return digits or None
    return " ".join(text.split())


def _identity_conflict_summary(conflicts: list[dict[str, Any]]) -> str:
    labels = [str(conflict.get("label")) for conflict in conflicts[:3] if conflict.get("label")]
    if not labels:
        return "Stored source observations contain conflicting vessel identity values."
    return f"Conflicting identity fields: {', '.join(labels)}."


def _has_structured_identity_summary(summary: str | None) -> bool:
    return bool(summary and summary.startswith("Conflicting identity fields:"))
