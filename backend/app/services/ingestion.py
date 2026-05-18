import asyncio
import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from zoneinfo import ZoneInfo

# OCEANS-X is operated by MPA Singapore; its date-bucketed endpoints
# (duetoarrive, duetodepart) expect Singapore-local calendar dates.
# Querying UTC dates returns the wrong bucket for half the day.
SINGAPORE_TZ = ZoneInfo("Asia/Singapore")

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.oceansx import (
    OceansXClient,
    OceansXError,
)
from app.core.config import Settings
from app.models.evidence import SourceObservation
from app.models.ingestion import IngestionJob, IngestionLog, SourceHealth
from app.models.maritime import Entity, PortEvent, Relationship, Vessel, VesselPositionLatest


INTERNAL_TEST_SOURCE = "internal-test"
OCEANSX_SOURCE = "OCEANS-X"
OCEANSX_POSITIONS_JOB_TYPE = "oceansx.positions_snapshot"
OCEANSX_PARTICULARS_JOB_TYPE = "oceansx.vessel_particulars"
OCEANSX_BULK_PARTICULARS_JOB_TYPE = "oceansx.vessel_particulars_bulk"
OCEANSX_MOVEMENTS_JOB_TYPE = "oceansx.vessel_movements"
OCEANSX_PORT_ACTIVITY_JOB_TYPE = "oceansx.port_activity"
OCEANSX_POSITION_OBSERVATION_TYPE = "vessel_position"
OCEANSX_PARTICULARS_OBSERVATION_TYPE = "vessel_particulars"
OCEANSX_MOVEMENT_OBSERVATION_TYPE = "vessel_movement"
OCEANSX_PORT_ACTIVITY_OBSERVATION_TYPE = "port_activity"

PARTICULARS_ENTITY_FIELDS = {
    "registeredOwner": ("owner", "company"),
    "registeredOwnership": ("owner", "company"),
    "shipManager": ("ship_manager", "company"),
    "operator": ("operator", "company"),
    "ismManager": ("ism_manager", "company"),
}


@dataclass(frozen=True)
class VesselPositionRow:
    raw_payload: dict[str, Any]
    payload_hash: str
    source_record_id: str
    observed_at: datetime
    imo: str | None
    mmsi: str | None
    call_sign: str | None
    vessel_name: str
    flag_country_code: str | None
    vessel_type_code: str | None
    latitude: Decimal
    longitude: Decimal
    speed_knots: Decimal | None
    course_degrees: Decimal | None
    heading_degrees: Decimal | None
    navigational_status: str | None


def stable_payload_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def extract_snapshot_rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("data", "items", "results", "vessels", "positions"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return [payload]


def normalize_identity(row: dict[str, Any]) -> tuple[str | None, str | None, str | None]:
    particulars = _particulars(row)
    imo = _clean_identifier(_first_value(row, particulars, "imoNumber", "imo", "imo_number"))
    mmsi = _clean_identifier(_first_value(row, particulars, "mmsiNumber", "mmsi", "mmsi_number"))
    call_sign = _clean_text(_first_value(row, particulars, "callSign", "call_sign", "callsign"))
    return imo, mmsi, call_sign


def _particulars(row: dict[str, Any]) -> dict[str, Any]:
    value = row.get("vesselParticulars") or row.get("vessel_particulars") or row.get("particulars")
    return value if isinstance(value, dict) else {}


def _first_value(row: dict[str, Any], nested: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if row.get(key) not in (None, ""):
            return row[key]
        if nested.get(key) not in (None, ""):
            return nested[key]
    return None


_INVALID_IDENTIFIERS = {"", "0", "00", "000", "0000", "none", "null", "n/a", "na", "unknown"}


def _clean_identifier(value: Any) -> str | None:
    """Normalize a source-provided identifier (IMO/MMSI/call sign).

    Treats placeholder values like "0" as missing — OCEANS-X commonly
    reports IMO=0 for vessels without a registered IMO number, and
    storing the literal "0" causes hundreds of distinct AIS contacts to
    dedupe into a single "vessel".
    """
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.endswith(".0"):
        text = text[:-2]
    if text.lower() in _INVALID_IDENTIFIERS:
        return None
    return text


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _decimal_value(value: Any) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _int_value(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        # Tolerate floats and numeric strings like "489" or "489.0".
        return int(Decimal(str(value)))
    except (InvalidOperation, ValueError):
        return None


def _datetime_value(value: Any, fallback: datetime) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    if isinstance(value, str) and value.strip():
        text = value.strip()
        if text.endswith("Z"):
            text = f"{text[:-1]}+00:00"
        for candidate in (text, text.replace(" ", "T")):
            try:
                parsed = datetime.fromisoformat(candidate)
                return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)
            except ValueError:
                continue
    return fallback


def normalize_position_row(row: dict[str, Any], fetched_at: datetime) -> tuple[VesselPositionRow | None, str | None]:
    particulars = _particulars(row)
    imo, mmsi, call_sign = normalize_identity(row)
    if not (imo or mmsi or call_sign):
        return None, "missing_identity"

    latitude = _decimal_value(_first_value(row, particulars, "latitudeDegrees", "latitude_degrees", "lat", "latitude"))
    longitude = _decimal_value(_first_value(row, particulars, "longitudeDegrees", "longitude_degrees", "lon", "lng", "longitude"))
    if latitude is None or longitude is None:
        return None, "missing_coordinates"
    if latitude < Decimal("-90") or latitude > Decimal("90") or longitude < Decimal("-180") or longitude > Decimal("180"):
        return None, "invalid_coordinates"

    observed_at = _datetime_value(
        _first_value(row, particulars, "timeStamp", "timestamp", "positionTimestamp", "position_timestamp", "observed_at"),
        fetched_at,
    )
    vessel_name = _clean_text(_first_value(row, particulars, "vesselName", "name", "vessel_name")) or "Unknown vessel"
    source_record_id = "|".join(filter(None, [imo, mmsi, call_sign, observed_at.isoformat()]))

    return (
        VesselPositionRow(
            raw_payload=row,
            payload_hash=stable_payload_hash(row),
            source_record_id=source_record_id,
            observed_at=observed_at,
            imo=imo,
            mmsi=mmsi,
            call_sign=call_sign,
            vessel_name=vessel_name,
            flag_country_code=_clean_text(_first_value(row, particulars, "flag", "flagCountryCode", "flag_country_code")),
            vessel_type_code=_clean_text(_first_value(row, particulars, "vesselType", "vessel_type", "vesselTypeCode", "vessel_type_code")),
            latitude=latitude,
            longitude=longitude,
            speed_knots=_decimal_value(_first_value(row, particulars, "speed", "speedKnots", "speed_knots")),
            course_degrees=_decimal_value(_first_value(row, particulars, "course", "courseDegrees", "course_degrees")),
            heading_degrees=_decimal_value(_first_value(row, particulars, "heading", "headingDegrees", "heading_degrees")),
            navigational_status=_clean_text(
                _first_value(row, particulars, "navigationStatus", "navigationalStatus", "navigational_status")
            ),
        ),
        None,
    )


class IngestionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def run_test_job(self, requested_by: str = "dev") -> IngestionJob:
        now = datetime.now(UTC)
        job = IngestionJob(
            job_type="internal.test",
            status="running",
            requested_by=requested_by,
            parameters={"source": INTERNAL_TEST_SOURCE},
            started_at=now,
        )
        self.session.add(job)
        await self.session.flush()

        self.session.add(
            IngestionLog(
                job_id=job.id,
                level="info",
                message="Started internal ingestion framework test.",
                context={"source": INTERNAL_TEST_SOURCE},
            )
        )

        health = await self._get_or_create_source_health(INTERNAL_TEST_SOURCE)
        health.status = "healthy"
        health.last_checked_at = now
        health.last_success_at = now
        health.last_error = None
        health.metadata_ = {
            "last_job_id": job.id,
            "last_job_type": job.job_type,
            "last_tested_at": now.isoformat(),
        }

        job.status = "succeeded"
        job.finished_at = datetime.now(UTC)
        self.session.add(
            IngestionLog(
                job_id=job.id,
                level="info",
                message="Completed internal ingestion framework test.",
                context={"source_health": health.status},
            )
        )

        await self.session.commit()
        await self.session.refresh(job)
        return job

    async def run_positions_snapshot(
        self,
        settings: Settings,
        mode: str | None = None,
        requested_by: str = "dev",
    ) -> IngestionJob:
        selected_mode = self._live_mode(mode)
        now = datetime.now(UTC)
        job = IngestionJob(
            job_type=OCEANSX_POSITIONS_JOB_TYPE,
            status="running",
            requested_by=requested_by,
            parameters={"mode": selected_mode, "source": OCEANSX_SOURCE},
            started_at=now,
        )
        self.session.add(job)
        await self.session.flush()

        self.session.add(
            IngestionLog(
                job_id=job.id,
                level="info",
                message=f"Started OCEANS-X positions snapshot ingestion in {selected_mode} mode.",
                context={"mode": selected_mode},
            )
        )

        health = await self._get_or_create_source_health(OCEANSX_SOURCE)
        health.last_checked_at = now

        try:
            payload = await self._load_positions_payload(settings, selected_mode)
            stats = await self._ingest_positions_payload(
                payload,
                fetched_at=now,
                max_rows=settings.max_requests_per_run,
                snapshot_job_id=job.id,
            )
        except (OceansXError, ValueError, OSError) as exc:
            job.status = "failed"
            job.finished_at = datetime.now(UTC)
            health.status = "unhealthy"
            health.last_error = str(exc)
            health.metadata_ = {"last_job_id": job.id, "mode": selected_mode}
            self.session.add(
                IngestionLog(
                    job_id=job.id,
                    level="error",
                    message="OCEANS-X positions snapshot ingestion failed.",
                    context={"error": str(exc), "mode": selected_mode},
                )
            )
            await self.session.commit()
            await self.session.refresh(job)
            return job

        job.status = "succeeded"
        job.finished_at = datetime.now(UTC)
        job.parameters = {**job.parameters, **stats}
        health.status = "healthy"
        health.last_success_at = job.finished_at
        health.last_error = None
        health.metadata_ = {"last_job_id": job.id, "mode": selected_mode, **stats}
        self.session.add(
            IngestionLog(
                job_id=job.id,
                level="info",
                message="Completed OCEANS-X positions snapshot ingestion.",
                context=stats,
            )
        )

        await self.session.commit()
        await self.session.refresh(job)
        return job

    async def run_vessel_particulars(
        self,
        settings: Settings,
        vessel_id: int,
        mode: str | None = None,
        requested_by: str = "dev",
    ) -> IngestionJob:
        selected_mode = self._live_mode(mode)
        now = datetime.now(UTC)
        job = IngestionJob(
            job_type=OCEANSX_PARTICULARS_JOB_TYPE,
            status="running",
            requested_by=requested_by,
            parameters={"mode": selected_mode, "source": OCEANSX_SOURCE, "vessel_id": vessel_id},
            started_at=now,
        )
        self.session.add(job)
        await self.session.flush()

        vessel = await self.session.get(Vessel, vessel_id)
        health = await self._get_or_create_source_health(OCEANSX_SOURCE)
        health.last_checked_at = now

        try:
            if vessel is None:
                raise ValueError("Vessel not found")
            if not vessel.imo:
                raise ValueError("Vessel must have an IMO number for OCEANS-X particulars lookup")
            payload = await self._load_particulars_payload(settings, selected_mode, vessel.imo)
            stats = await self._ingest_particulars_payload(vessel, payload, fetched_at=now)
        except (OceansXError, ValueError, OSError) as exc:
            job.status = "failed"
            job.finished_at = datetime.now(UTC)
            job.parameters = {**job.parameters, "error": str(exc)}
            health.status = "unhealthy"
            health.last_error = str(exc)
            health.metadata_ = {"last_job_id": job.id, "mode": selected_mode}
            self.session.add(
                IngestionLog(
                    job_id=job.id,
                    level="error",
                    message="OCEANS-X vessel particulars ingestion failed.",
                    context={"error": str(exc), "mode": selected_mode, "vessel_id": vessel_id},
                )
            )
            await self.session.commit()
            await self.session.refresh(job)
            return job

        job.status = "succeeded"
        job.finished_at = datetime.now(UTC)
        job.parameters = {**job.parameters, **stats}
        health.status = "healthy"
        health.last_success_at = job.finished_at
        health.last_error = None
        health.metadata_ = {"last_job_id": job.id, "mode": selected_mode, **stats}
        self.session.add(
            IngestionLog(
                job_id=job.id,
                level="info",
                message="Completed OCEANS-X vessel particulars ingestion.",
                context=stats,
            )
        )
        await self.session.commit()
        await self.session.refresh(job)
        return job

    async def start_bulk_map_particulars(
        self,
        *,
        delay_seconds: float,
        requested_by: str = "dev",
    ) -> IngestionJob:
        now = datetime.now(UTC)
        stale_jobs = await self.session.scalars(
            select(IngestionJob).where(
                IngestionJob.job_type == OCEANSX_BULK_PARTICULARS_JOB_TYPE,
                IngestionJob.status.in_(("queued", "running")),
            )
        )
        for stale_job in stale_jobs:
            stale_job.status = "failed"
            stale_job.finished_at = now
            stale_job.parameters = {
                **(stale_job.parameters or {}),
                "superseded": True,
                "last_error": "Superseded by a newer bulk vessel particulars job.",
            }
            self.session.add(
                IngestionLog(
                    job_id=stale_job.id,
                    level="warning",
                    message="Marked stale bulk vessel particulars job as superseded.",
                    context={"superseded_by": "new bulk particulars request"},
                )
            )

        vessel_ids = await self._current_map_vessel_ids()
        job = IngestionJob(
            job_type=OCEANSX_BULK_PARTICULARS_JOB_TYPE,
            status="queued",
            requested_by=requested_by,
            parameters={
                "mode": "live",
                "source": OCEANSX_SOURCE,
                "selection": "all_map_vessels",
                "delay_seconds": delay_seconds,
                "target_rate_per_second": round(1 / delay_seconds, 2) if delay_seconds > 0 else None,
                "total": len(vessel_ids),
                "completed": 0,
                "succeeded": 0,
                "failed": 0,
                "skipped": 0,
                "current_vessel_id": None,
                "started_background": False,
            },
            started_at=now,
        )
        self.session.add(job)
        await self.session.commit()
        await self.session.refresh(job)
        return job

    async def cancel_bulk_map_particulars(self) -> IngestionJob:
        job = await self.session.scalar(
            select(IngestionJob)
            .where(
                IngestionJob.job_type == OCEANSX_BULK_PARTICULARS_JOB_TYPE,
                IngestionJob.status.in_(("queued", "running", "cancelling")),
            )
            .order_by(desc(IngestionJob.started_at), desc(IngestionJob.created_at))
            .limit(1)
        )
        if job is None:
            raise ValueError("No active bulk vessel particulars job to cancel.")
        now = datetime.now(UTC)
        job.status = "cancelling"
        job.parameters = {
            **(job.parameters or {}),
            "cancel_requested": True,
            "cancel_requested_at": now.isoformat(),
        }
        self.session.add(
            IngestionLog(
                job_id=job.id,
                level="warning",
                message="Bulk OCEANS-X vessel particulars ingestion cancellation requested.",
                context={"job_id": job.id},
            )
        )
        await self.session.commit()
        await self.session.refresh(job)
        return job

    async def run_bulk_map_particulars(
        self,
        *,
        settings: Settings,
        job_id: int,
        delay_seconds: float,
    ) -> None:
        job = await self.session.get(IngestionJob, job_id)
        if job is None:
            return
        existing_parameters = job.parameters or {}
        if job.status == "cancelling" or existing_parameters.get("cancel_requested"):
            now = datetime.now(UTC)
            job.status = "cancelled"
            job.finished_at = now
            job.parameters = {
                **existing_parameters,
                "cancel_requested": True,
                "cancelled_at": now.isoformat(),
                "current_vessel_id": None,
            }
            self.session.add(
                IngestionLog(
                    job_id=job.id,
                    level="warning",
                    message="Cancelled bulk OCEANS-X vessel particulars ingestion before it started.",
                    context={"job_id": job.id},
                )
            )
            await self.session.commit()
            return

        health = await self._get_or_create_source_health(OCEANSX_SOURCE)
        health.last_checked_at = datetime.now(UTC)
        vessel_ids = await self._current_map_vessel_ids()
        stats: dict[str, Any] = {
            "mode": "live",
            "source": OCEANSX_SOURCE,
            "selection": "all_map_vessels",
            "delay_seconds": delay_seconds,
            "target_rate_per_second": round(1 / delay_seconds, 2) if delay_seconds > 0 else None,
            "total": len(vessel_ids),
            "completed": 0,
            "succeeded": 0,
            "failed": 0,
            "skipped": 0,
            "current_vessel_id": None,
            "last_error": None,
            "started_background": True,
        }
        job.status = "running"
        job.parameters = stats.copy()
        self.session.add(
            IngestionLog(
                job_id=job.id,
                level="info",
                message="Started bulk OCEANS-X vessel particulars ingestion.",
                context={
                    "total": len(vessel_ids),
                    "delay_seconds": delay_seconds,
                    "selection": "all_map_vessels",
                },
            )
        )
        await self.session.commit()

        for index, vessel_id in enumerate(vessel_ids):
            await self.session.refresh(job)
            if job.status == "cancelling" or (job.parameters or {}).get("cancel_requested"):
                stats["cancel_requested"] = True
                stats["cancel_requested_at"] = (job.parameters or {}).get("cancel_requested_at")
                break
            stats["current_vessel_id"] = vessel_id
            try:
                vessel = await self.session.get(Vessel, vessel_id)
                if vessel is None or not vessel.imo:
                    stats["skipped"] += 1
                    self.session.add(
                        IngestionLog(
                            job_id=job.id,
                            level="warning",
                            message="Skipped vessel particulars lookup.",
                            context={"vessel_id": vessel_id, "reason": "missing vessel or IMO"},
                        )
                    )
                else:
                    payload = await self._load_particulars_payload(settings, "live", vessel.imo)
                    vessel_stats = await self._ingest_particulars_payload(vessel, payload, fetched_at=datetime.now(UTC))
                    stats["succeeded"] += 1
                    self.session.add(
                        IngestionLog(
                            job_id=job.id,
                            level="info",
                            message="Fetched OCEANS-X vessel particulars.",
                            context={"vessel_id": vessel_id, "imo": vessel.imo, **vessel_stats},
                        )
                    )
            except (OceansXError, ValueError, OSError) as exc:
                stats["failed"] += 1
                stats["last_error"] = str(exc)
                self.session.add(
                    IngestionLog(
                        job_id=job.id,
                        level="error",
                        message="OCEANS-X vessel particulars lookup failed.",
                        context={"vessel_id": vessel_id, "error": str(exc)},
                    )
                )
            finally:
                stats["completed"] = index + 1
                job.parameters = stats.copy()
                health.last_checked_at = datetime.now(UTC)
                await self.session.commit()

            if index + 1 < len(vessel_ids) and delay_seconds > 0:
                await self.session.refresh(job)
                if job.status == "cancelling" or (job.parameters or {}).get("cancel_requested"):
                    stats["cancel_requested"] = True
                    stats["cancel_requested_at"] = (job.parameters or {}).get("cancel_requested_at")
                    break
                await asyncio.sleep(delay_seconds)

        cancelled = bool(stats.get("cancel_requested"))
        job.status = "cancelled" if cancelled else "succeeded" if stats["total"] == 0 or stats["failed"] < stats["total"] else "failed"
        job.finished_at = datetime.now(UTC)
        stats["current_vessel_id"] = None
        if cancelled:
            stats["cancelled_at"] = job.finished_at.isoformat()
        job.parameters = stats.copy()
        if job.status == "succeeded":
            health.status = "healthy"
            health.last_success_at = job.finished_at
            health.last_error = None
        elif job.status == "failed":
            health.status = "unhealthy"
            health.last_error = str(stats["last_error"] or "All particulars lookups failed")
        health.metadata_ = {"last_job_id": job.id, **stats}
        self.session.add(
            IngestionLog(
                job_id=job.id,
                level="warning" if cancelled else "info" if job.status == "succeeded" else "error",
                message="Cancelled bulk OCEANS-X vessel particulars ingestion." if cancelled else "Completed bulk OCEANS-X vessel particulars ingestion.",
                context=stats.copy(),
            )
        )
        await self.session.commit()

    async def _current_map_vessel_ids(self, limit: int = 5000) -> list[int]:
        statement = (
            select(Vessel.id)
            .join(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id)
            .where(or_(Vessel.imo.is_(None), Vessel.imo.notin_(("0", "00", "000", "0000"))))
            .order_by(desc(VesselPositionLatest.position_timestamp))
            .limit(limit)
        )
        latest_job = await self.session.scalar(
            select(IngestionJob)
            .where(
                IngestionJob.job_type == OCEANSX_POSITIONS_JOB_TYPE,
                IngestionJob.status == "succeeded",
                IngestionJob.started_at.is_not(None),
                IngestionJob.finished_at.is_not(None),
            )
            .order_by(desc(IngestionJob.finished_at))
            .limit(1)
        )
        if latest_job is not None:
            statement = statement.where(VesselPositionLatest.snapshot_job_id == latest_job.id)
        return list(await self.session.scalars(statement))

    async def run_vessel_movements(
        self,
        settings: Settings,
        vessel_id: int,
        mode: str | None = None,
        requested_by: str = "dev",
    ) -> IngestionJob:
        selected_mode = self._live_mode(mode)
        now = datetime.now(UTC)
        job = IngestionJob(
            job_type=OCEANSX_MOVEMENTS_JOB_TYPE,
            status="running",
            requested_by=requested_by,
            parameters={"mode": selected_mode, "source": OCEANSX_SOURCE, "vessel_id": vessel_id},
            started_at=now,
        )
        self.session.add(job)
        await self.session.flush()

        health = await self._get_or_create_source_health(OCEANSX_SOURCE)
        health.last_checked_at = now
        try:
            vessel = await self.session.get(Vessel, vessel_id)
            if vessel is None:
                raise ValueError("Vessel not found")
            if not vessel.imo:
                raise ValueError("Vessel must have an IMO number for OCEANS-X movements lookup")
            payload = await self._load_movements_payload(settings, selected_mode, vessel.imo)
            stats = await self._ingest_event_payload(
                payload=payload,
                fetched_at=now,
                observation_type=OCEANSX_MOVEMENT_OBSERVATION_TYPE,
                default_event_type="movement",
                vessel=vessel,
            )
        except (OceansXError, ValueError, OSError) as exc:
            return await self._fail_job(job, health, "OCEANS-X vessel movements ingestion failed.", exc, selected_mode)

        return await self._succeed_job(job, health, "Completed OCEANS-X vessel movements ingestion.", selected_mode, stats)

    async def run_port_activity(
        self,
        settings: Settings,
        kind: str,
        mode: str | None = None,
        activity_date: date | None = None,
        requested_by: str = "dev",
    ) -> IngestionJob:
        selected_mode = self._live_mode(mode)
        now = datetime.now(UTC)
        # OCEANS-X port-activity endpoints expect Singapore-local dates;
        # use SGT for the default so the bucket matches the analyst's
        # mental model of "today" in the source's timezone.
        selected_date = activity_date or datetime.now(SINGAPORE_TZ).date()
        job = IngestionJob(
            job_type=OCEANSX_PORT_ACTIVITY_JOB_TYPE,
            status="running",
            requested_by=requested_by,
            parameters={"mode": selected_mode, "source": OCEANSX_SOURCE, "kind": kind, "date": selected_date.isoformat()},
            started_at=now,
        )
        self.session.add(job)
        await self.session.flush()

        health = await self._get_or_create_source_health(OCEANSX_SOURCE)
        health.last_checked_at = now
        try:
            if kind not in {"due-arrive", "due-depart"}:
                raise ValueError("kind must be due-arrive or due-depart")
            payload = await self._load_port_activity_payload(settings, selected_mode, kind, selected_date)
            stats = await self._ingest_event_payload(
                payload=payload,
                fetched_at=now,
                observation_type=OCEANSX_PORT_ACTIVITY_OBSERVATION_TYPE,
                default_event_type=kind,
                vessel=None,
            )
        except (OceansXError, ValueError, OSError) as exc:
            return await self._fail_job(job, health, "OCEANS-X port activity ingestion failed.", exc, selected_mode)

        return await self._succeed_job(job, health, "Completed OCEANS-X port activity ingestion.", selected_mode, stats)

    async def list_recent_jobs(self, limit: int = 25) -> list[IngestionJob]:
        result = await self.session.scalars(
            select(IngestionJob).order_by(desc(IngestionJob.created_at)).limit(limit)
        )
        return list(result)

    async def list_recent_logs(self, job_id: int | None = None, limit: int = 50) -> list[IngestionLog]:
        statement = select(IngestionLog).order_by(desc(IngestionLog.created_at)).limit(limit)
        if job_id is not None:
            statement = (
                select(IngestionLog)
                .where(IngestionLog.job_id == job_id)
                .order_by(desc(IngestionLog.created_at))
                .limit(limit)
            )
        result = await self.session.scalars(statement)
        return list(result)

    async def list_source_health(self) -> list[SourceHealth]:
        result = await self.session.scalars(select(SourceHealth).order_by(SourceHealth.source))
        return list(result)

    async def _get_or_create_source_health(self, source: str) -> SourceHealth:
        health = await self.session.scalar(select(SourceHealth).where(SourceHealth.source == source))
        if health is not None:
            return health

        health = SourceHealth(
            source=source,
            status="unknown",
            metadata_={},
        )
        self.session.add(health)
        await self.session.flush()
        return health

    async def _load_positions_payload(self, settings: Settings, mode: str) -> Any:
        if mode == "live":
            client = OceansXClient(
                api_key=settings.oceansx_api_key,
                base_url=settings.oceansx_base_url,
                timeout_seconds=settings.oceansx_request_timeout_seconds,
            )
            return await client.fetch_positions_snapshot()
        raise ValueError("mode must be live")

    async def _load_particulars_payload(self, settings: Settings, mode: str, imo: str) -> dict[str, Any]:
        if mode == "live":
            client = OceansXClient(
                api_key=settings.oceansx_api_key,
                base_url=settings.oceansx_base_url,
                timeout_seconds=settings.oceansx_request_timeout_seconds,
            )
            payload = await client.fetch_vessel_particulars(imo)
            rows = extract_snapshot_rows(payload)
            return rows[0] if rows else payload
        raise ValueError("mode must be live")

    async def _load_movements_payload(self, settings: Settings, mode: str, imo: str) -> list[dict[str, Any]]:
        if mode == "live":
            client = OceansXClient(
                api_key=settings.oceansx_api_key,
                base_url=settings.oceansx_base_url,
                timeout_seconds=settings.oceansx_request_timeout_seconds,
            )
            return extract_snapshot_rows(await client.fetch_vessel_movements(imo))
        raise ValueError("mode must be live")

    async def _load_port_activity_payload(self, settings: Settings, mode: str, kind: str, activity_date: date) -> list[dict[str, Any]]:
        if mode == "live":
            client = OceansXClient(
                api_key=settings.oceansx_api_key,
                base_url=settings.oceansx_base_url,
                timeout_seconds=settings.oceansx_request_timeout_seconds,
            )
            date_path_param = activity_date.strftime("%Y%m%d")
            if kind == "due-arrive":
                return extract_snapshot_rows(await client.fetch_due_to_arrive(date_path_param, 24))
            if kind == "due-depart":
                return extract_snapshot_rows(await client.fetch_due_to_depart(date_path_param, 24))
        raise ValueError("mode must be live")

    @staticmethod
    def _live_mode(mode: str | None) -> str:
        if mode in (None, "live"):
            return "live"
        raise ValueError("Fixture mode has been removed. Live OCEANS-X ingestion is required.")

    async def _ingest_positions_payload(self, payload: Any, fetched_at: datetime, max_rows: int, snapshot_job_id: int | None = None) -> dict[str, Any]:
        rows = extract_snapshot_rows(payload)
        limited_rows = rows[:max_rows]
        stats: dict[str, Any] = {
            "rows_seen": len(rows),
            "rows_limited": len(limited_rows),
            "observations_inserted": 0,
            "observations_deduped": 0,
            "vessels_inserted": 0,
            "vessels_updated": 0,
            "positions_inserted": 0,
            "positions_updated": 0,
            "skipped": 0,
            "skip_reasons": {},
        }

        for raw_row in limited_rows:
            normalized, skip_reason = normalize_position_row(raw_row, fetched_at=fetched_at)
            if normalized is None:
                self._count_skip(stats, skip_reason or "invalid_row")
                continue

            observation, inserted_observation = await self._get_or_create_observation(normalized, fetched_at)
            stats["observations_inserted" if inserted_observation else "observations_deduped"] += 1

            vessel, inserted_vessel = await self._get_or_create_vessel(normalized)
            if inserted_vessel:
                stats["vessels_inserted"] += 1
            else:
                stats["vessels_updated"] += 1

            inserted_position = await self._upsert_latest_position(normalized, vessel.id, observation.id, fetched_at, snapshot_job_id)
            stats["positions_inserted" if inserted_position else "positions_updated"] += 1

        return stats

    @staticmethod
    def _count_skip(stats: dict[str, Any], reason: str) -> None:
        stats["skipped"] += 1
        skip_reasons = stats["skip_reasons"]
        skip_reasons[reason] = skip_reasons.get(reason, 0) + 1

    async def _get_or_create_observation(
        self, row: VesselPositionRow, fetched_at: datetime
    ) -> tuple[SourceObservation, bool]:
        observation = await self.session.scalar(
            select(SourceObservation).where(
                SourceObservation.source == OCEANSX_SOURCE,
                SourceObservation.observation_type == OCEANSX_POSITION_OBSERVATION_TYPE,
                SourceObservation.payload_hash == row.payload_hash,
            )
        )
        if observation is not None:
            return observation, False

        observation = SourceObservation(
            source=OCEANSX_SOURCE,
            observation_type=OCEANSX_POSITION_OBSERVATION_TYPE,
            source_record_id=row.source_record_id,
            observed_at=row.observed_at,
            fetched_at=fetched_at,
            payload_hash=row.payload_hash,
            raw_payload=row.raw_payload,
        )
        self.session.add(observation)
        await self.session.flush()
        return observation, True

    async def _get_or_create_vessel(self, row: VesselPositionRow) -> tuple[Vessel, bool]:
        vessel = await self._find_vessel(row)
        if vessel is None:
            vessel = Vessel(
                imo=row.imo,
                mmsi=row.mmsi,
                call_sign=row.call_sign,
                name=row.vessel_name,
                flag_country_code=row.flag_country_code,
                vessel_type_code=row.vessel_type_code,
                source_updated_at=row.observed_at,
            )
            self.session.add(vessel)
            await self.session.flush()
            return vessel, True

        if row.imo and not vessel.imo:
            vessel.imo = row.imo
        if row.mmsi and not vessel.mmsi:
            vessel.mmsi = row.mmsi
        if row.call_sign and not vessel.call_sign:
            vessel.call_sign = row.call_sign
        vessel.name = row.vessel_name
        vessel.flag_country_code = row.flag_country_code or vessel.flag_country_code
        vessel.vessel_type_code = row.vessel_type_code or vessel.vessel_type_code
        vessel.source_updated_at = row.observed_at
        await self.session.flush()
        return vessel, False

    async def _find_vessel(self, row: VesselPositionRow) -> Vessel | None:
        if row.imo:
            vessel = await self.session.scalar(select(Vessel).where(Vessel.imo == row.imo))
            if vessel is not None:
                return vessel
        if row.mmsi:
            vessel = await self.session.scalar(select(Vessel).where(Vessel.mmsi == row.mmsi).limit(1))
            if vessel is not None:
                return vessel
        if row.call_sign:
            return await self.session.scalar(select(Vessel).where(Vessel.call_sign == row.call_sign).limit(1))
        return None

    async def _upsert_latest_position(
        self,
        row: VesselPositionRow,
        vessel_id: int,
        evidence_id: int,
        fetched_at: datetime,
        snapshot_job_id: int | None,
    ) -> bool:
        latest = await self.session.get(VesselPositionLatest, vessel_id)
        if latest is None:
            latest = VesselPositionLatest(
                vessel_id=vessel_id,
                latitude=row.latitude,
                longitude=row.longitude,
                speed_knots=row.speed_knots,
                course_degrees=row.course_degrees,
                heading_degrees=row.heading_degrees,
                navigational_status=row.navigational_status,
                position_timestamp=row.observed_at,
                evidence_id=evidence_id,
                snapshot_job_id=snapshot_job_id,
                updated_at=fetched_at,
            )
            self.session.add(latest)
            await self.session.flush()
            return True

        latest.latitude = row.latitude
        latest.longitude = row.longitude
        latest.speed_knots = row.speed_knots
        latest.course_degrees = row.course_degrees
        latest.heading_degrees = row.heading_degrees
        latest.navigational_status = row.navigational_status
        latest.position_timestamp = row.observed_at
        latest.evidence_id = evidence_id
        latest.snapshot_job_id = snapshot_job_id
        latest.updated_at = fetched_at
        await self.session.flush()
        return False

    async def _ingest_particulars_payload(self, vessel: Vessel, payload: dict[str, Any], fetched_at: datetime) -> dict[str, Any]:
        stats: dict[str, Any] = {
            "observations_inserted": 0,
            "observations_deduped": 0,
            "entities_inserted": 0,
            "entities_reused": 0,
            "relationships_inserted": 0,
            "relationships_reused": 0,
        }

        payload_hash = stable_payload_hash(payload)
        observation = await self.session.scalar(
            select(SourceObservation).where(
                SourceObservation.source == OCEANSX_SOURCE,
                SourceObservation.observation_type == OCEANSX_PARTICULARS_OBSERVATION_TYPE,
                SourceObservation.payload_hash == payload_hash,
            )
        )
        if observation is None:
            observation = SourceObservation(
                source=OCEANSX_SOURCE,
                observation_type=OCEANSX_PARTICULARS_OBSERVATION_TYPE,
                source_record_id=vessel.imo,
                observed_at=fetched_at,
                fetched_at=fetched_at,
                payload_hash=payload_hash,
                raw_payload=payload,
            )
            self.session.add(observation)
            await self.session.flush()
            stats["observations_inserted"] += 1
        else:
            stats["observations_deduped"] += 1

        particulars = _particulars(payload)
        merged = {**particulars, **payload}
        imo = _clean_identifier(_first_value(payload, particulars, "imoNumber", "imo", "imo_number"))
        mmsi = _clean_identifier(_first_value(payload, particulars, "mmsiNumber", "mmsi", "mmsi_number"))
        call_sign = _clean_text(_first_value(payload, particulars, "callSign", "call_sign", "callsign"))
        if imo and not vessel.imo:
            vessel.imo = imo
        if mmsi and not vessel.mmsi:
            vessel.mmsi = mmsi
        if call_sign and not vessel.call_sign:
            vessel.call_sign = call_sign
        vessel.name = _clean_text(_first_value(payload, particulars, "vesselName", "name", "vessel_name")) or vessel.name
        vessel.flag_country_code = _clean_text(merged.get("flag")) or vessel.flag_country_code
        vessel.vessel_type_code = _clean_text(merged.get("vesselType")) or vessel.vessel_type_code

        year_built = _int_value(_first_value(payload, particulars, "yearBuilt", "year_built", "buildYear"))
        if year_built is not None:
            vessel.year_built = year_built
        deadweight = _int_value(_first_value(payload, particulars, "deadweight", "deadWeight", "dwt"))
        if deadweight is not None:
            vessel.deadweight = deadweight
        gross_tonnage = _int_value(_first_value(payload, particulars, "grossTonnage", "gross_tonnage", "gt"))
        if gross_tonnage is not None:
            vessel.gross_tonnage = gross_tonnage
        net_tonnage = _int_value(_first_value(payload, particulars, "netTonnage", "net_tonnage", "nt"))
        if net_tonnage is not None:
            vessel.net_tonnage = net_tonnage
        length_m = _decimal_value(_first_value(payload, particulars, "vesselLength", "lengthMeters", "length_m"))
        if length_m is not None:
            vessel.length_meters = length_m
        breadth_m = _decimal_value(_first_value(payload, particulars, "vesselBreadth", "breadthMeters", "breadth_m"))
        if breadth_m is not None:
            vessel.breadth_meters = breadth_m
        depth_m = _decimal_value(_first_value(payload, particulars, "vesselDepth", "depthMeters", "depth_m"))
        if depth_m is not None:
            vessel.depth_meters = depth_m

        vessel.source_updated_at = fetched_at

        for field_name, (relationship_type, entity_type) in PARTICULARS_ENTITY_FIELDS.items():
            value = _clean_text(merged.get(field_name))
            if not value:
                continue
            entity, inserted = await self._get_or_create_entity(entity_type=entity_type, name=value)
            stats["entities_inserted" if inserted else "entities_reused"] += 1
            relationship_inserted = await self._get_or_create_relationship(
                vessel_id=vessel.id,
                entity_id=entity.id,
                relationship_type=relationship_type,
                evidence_id=observation.id,
                evidence_summary=f"OCEANS-X particulars field {field_name}: {value}",
            )
            stats["relationships_inserted" if relationship_inserted else "relationships_reused"] += 1

        await self.session.flush()
        return stats

    async def _get_or_create_entity(self, entity_type: str, name: str) -> tuple[Entity, bool]:
        entity = await self.session.scalar(
            select(Entity).where(
                Entity.entity_type == entity_type,
                func.lower(Entity.name) == name.lower(),
                Entity.country_code.is_(None),
            )
        )
        if entity is not None:
            return entity, False

        entity = Entity(entity_type=entity_type, name=name, country_code=None)
        self.session.add(entity)
        await self.session.flush()
        return entity, True

    async def _get_or_create_relationship(
        self,
        vessel_id: int,
        entity_id: int,
        relationship_type: str,
        evidence_id: int,
        evidence_summary: str,
    ) -> bool:
        existing = await self.session.scalar(
            select(Relationship).where(
                Relationship.vessel_id == vessel_id,
                Relationship.to_entity_id == entity_id,
                Relationship.relationship_type == relationship_type,
                Relationship.evidence_id == evidence_id,
            )
        )
        if existing is not None:
            return False

        self.session.add(
            Relationship(
                vessel_id=vessel_id,
                to_entity_id=entity_id,
                relationship_type=relationship_type,
                evidence_id=evidence_id,
                evidence_summary=evidence_summary,
                confidence="observed",
            )
        )
        await self.session.flush()
        return True

    async def _ingest_event_payload(
        self,
        payload: list[dict[str, Any]],
        fetched_at: datetime,
        observation_type: str,
        default_event_type: str,
        vessel: Vessel | None,
    ) -> dict[str, Any]:
        stats: dict[str, Any] = {
            "rows_seen": len(payload),
            "observations_inserted": 0,
            "observations_deduped": 0,
            "events_inserted": 0,
            "events_reused": 0,
            "skipped": 0,
            "skip_reasons": {},
        }
        for row in payload:
            target_vessel = vessel or await self._get_or_create_vessel_for_event(row, fetched_at)
            event_time = _datetime_value(
                _first_value(
                    row,
                    _particulars(row),
                    "eventTime",
                    "event_time",
                    "duetoArriveTime",
                    "dueToDepart",
                    "eta",
                    "etd",
                    "arrivalTime",
                    "departureTime",
                    "timestamp",
                    "timeStamp",
                ),
                fetched_at,
            )
            event_type = _clean_text(row.get("eventType") or row.get("event_type") or row.get("kind")) or default_event_type
            port_code = _clean_text(
                row.get("portCode")
                or row.get("port_code")
                or row.get("toPortCode")
                or row.get("fromPortCode")
                or row.get("locationTo")
                or row.get("locationFrom")
            )
            port_name = _clean_text(row.get("portName") or row.get("port_name") or row.get("toPortName") or row.get("fromPortName"))
            if target_vessel is None and observation_type == OCEANSX_MOVEMENT_OBSERVATION_TYPE:
                self._count_skip(stats, "unknown_vessel")
                continue

            payload_hash = stable_payload_hash(row)
            observation = await self.session.scalar(
                select(SourceObservation).where(
                    SourceObservation.source == OCEANSX_SOURCE,
                    SourceObservation.observation_type == observation_type,
                    SourceObservation.payload_hash == payload_hash,
                )
            )
            inserted_observation = False
            if observation is None:
                observation = SourceObservation(
                    source=OCEANSX_SOURCE,
                    observation_type=observation_type,
                    source_record_id="|".join(
                        filter(
                            None,
                            [
                                _clean_identifier(_first_value(row, _particulars(row), "imoNumber", "imo", "imo_number")),
                                event_type,
                                event_time.isoformat(),
                            ],
                        )
                    ),
                    observed_at=event_time,
                    fetched_at=fetched_at,
                    payload_hash=payload_hash,
                    raw_payload=row,
                )
                self.session.add(observation)
                await self.session.flush()
                inserted_observation = True
            stats["observations_inserted" if inserted_observation else "observations_deduped"] += 1

            existing_event = await self.session.scalar(
                select(PortEvent).where(
                    PortEvent.evidence_id == observation.id,
                    PortEvent.event_type == event_type,
                )
            )
            if existing_event is not None:
                stats["events_reused"] += 1
                continue

            self.session.add(
                PortEvent(
                    vessel_id=target_vessel.id if target_vessel is not None else None,
                    port_code=port_code,
                    port_name=port_name,
                    event_type=event_type,
                    event_time=event_time,
                    evidence_id=observation.id,
                )
            )
            await self.session.flush()
            stats["events_inserted"] += 1
        return stats

    async def _get_or_create_vessel_for_event(self, row: dict[str, Any], fetched_at: datetime) -> Vessel | None:
        particulars = _particulars(row)
        imo = _clean_identifier(_first_value(row, particulars, "imoNumber", "imo", "imo_number"))
        mmsi = _clean_identifier(_first_value(row, particulars, "mmsiNumber", "mmsi", "mmsi_number"))
        call_sign = _clean_text(_first_value(row, particulars, "callSign", "call_sign", "callsign"))
        if not (imo or mmsi or call_sign):
            return None
        lookup = VesselPositionRow(
            raw_payload=row,
            payload_hash=stable_payload_hash(row),
            source_record_id="",
            observed_at=fetched_at,
            imo=imo,
            mmsi=mmsi,
            call_sign=call_sign,
            vessel_name=_clean_text(_first_value(row, particulars, "vesselName", "name", "vessel_name")) or "Unknown vessel",
            flag_country_code=_clean_text(_first_value(row, particulars, "flag", "flagCountryCode", "flag_country_code")),
            vessel_type_code=None,
            latitude=Decimal("0"),
            longitude=Decimal("0"),
            speed_knots=None,
            course_degrees=None,
            heading_degrees=None,
            navigational_status=None,
        )
        vessel, _ = await self._get_or_create_vessel(lookup)
        return vessel

    async def _fail_job(
        self,
        job: IngestionJob,
        health: SourceHealth,
        message: str,
        exc: Exception,
        mode: str,
    ) -> IngestionJob:
        job.status = "failed"
        job.finished_at = datetime.now(UTC)
        job.parameters = {**job.parameters, "error": str(exc)}
        health.status = "unhealthy"
        health.last_error = str(exc)
        health.metadata_ = {"last_job_id": job.id, "mode": mode}
        self.session.add(IngestionLog(job_id=job.id, level="error", message=message, context={"error": str(exc), "mode": mode}))
        await self.session.commit()
        await self.session.refresh(job)
        return job

    async def _succeed_job(
        self,
        job: IngestionJob,
        health: SourceHealth,
        message: str,
        mode: str,
        stats: dict[str, Any],
    ) -> IngestionJob:
        job.status = "succeeded"
        job.finished_at = datetime.now(UTC)
        job.parameters = {**job.parameters, **stats}
        health.status = "healthy"
        health.last_success_at = job.finished_at
        health.last_error = None
        health.metadata_ = {"last_job_id": job.id, "mode": mode, **stats}
        self.session.add(IngestionLog(job_id=job.id, level="info", message=message, context=stats))
        await self.session.commit()
        await self.session.refresh(job)
        return job
