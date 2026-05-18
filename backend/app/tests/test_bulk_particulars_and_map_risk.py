import asyncio
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.api.routes import dev as dev_routes
from app.core.config import Settings
from app.models.ingestion import IngestionJob
from app.models.maritime import Vessel
from app.services import ingestion as ingestion_module
from app.services.ingestion import IngestionService
from app.services.map import MapService


def run(coro):
    return asyncio.run(coro)


def test_map_particulars_route_starts_background_job(monkeypatch):
    calls = {}

    class FakeBackgroundTasks:
        def add_task(self, fn, *args):
            calls["task"] = fn
            calls["args"] = args

    class FakeIngestionService:
        def __init__(self, session):
            calls["session"] = session

        async def start_bulk_map_particulars(self, delay_seconds):
            calls["delay_seconds"] = delay_seconds
            return SimpleNamespace(
                id=42,
                job_type="oceansx.vessel_particulars_bulk",
                status="queued",
                requested_by="dev",
                parameters={"total": 7, "completed": 0, "delay_seconds": delay_seconds},
                started_at=datetime(2026, 5, 16, tzinfo=UTC),
                finished_at=None,
                created_at=datetime(2026, 5, 16, tzinfo=UTC),
            )

        async def cancel_bulk_map_particulars(self):
            calls["cancel"] = True
            return SimpleNamespace(
                id=42,
                job_type="oceansx.vessel_particulars_bulk",
                status="cancelling",
                requested_by="dev",
                parameters={"cancel_requested": True},
                started_at=datetime(2026, 5, 16, tzinfo=UTC),
                finished_at=None,
                created_at=datetime(2026, 5, 16, tzinfo=UTC),
            )

    monkeypatch.setattr(dev_routes, "IngestionService", FakeIngestionService)
    settings = Settings(oceansx_api_key="test-key")
    session = object()

    job = run(
        dev_routes.run_map_vessel_particulars_ingestion(
            background_tasks=FakeBackgroundTasks(),
            session=session,
            settings=settings,
            delay_seconds=1.25,
        )
    )

    assert job.id == 42
    assert job.job_type == "oceansx.vessel_particulars_bulk"
    assert calls["session"] is session
    assert calls["delay_seconds"] == 1.25
    assert calls["task"] is dev_routes._run_bulk_map_particulars_background
    assert calls["args"] == (42, 1.25, settings)

    cancelled = run(dev_routes.cancel_map_vessel_particulars_ingestion(session=session))

    assert cancelled.status == "cancelling"
    assert cancelled.parameters["cancel_requested"] is True
    assert calls["cancel"] is True


class FakeBulkSession:
    def __init__(self, job, vessels, cancel_after_completed: int | None = None):
        self.job = job
        self.vessels = vessels
        self.cancel_after_completed = cancel_after_completed
        self.added = []
        self.commits = []

    async def get(self, model, row_id):
        if model is IngestionJob:
            return self.job if row_id == self.job.id else None
        if model is Vessel:
            return self.vessels.get(row_id)
        raise AssertionError(f"Unexpected model lookup: {model}")

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits.append(
            {
                "status": self.job.status,
                "parameters": dict(self.job.parameters),
                "finished_at": self.job.finished_at,
            }
        )
        if (
            self.cancel_after_completed is not None
            and self.job.status == "running"
            and self.job.parameters.get("completed", 0) >= self.cancel_after_completed
        ):
            self.job.status = "cancelling"
            self.job.parameters = {**self.job.parameters, "cancel_requested": True, "cancel_requested_at": "2026-05-16T00:00:00+00:00"}

    async def refresh(self, _value):
        return None


class BulkServiceForTest(IngestionService):
    def __init__(self, session, vessel_ids):
        super().__init__(session)
        self.vessel_ids = vessel_ids
        self.loaded_imos = []
        self.ingested_payloads = []
        self.health = SimpleNamespace(
            status=None,
            last_checked_at=None,
            last_success_at=None,
            last_error=None,
            metadata_={},
        )

    async def _get_or_create_source_health(self, source):
        self.health.source = source
        return self.health

    async def _current_map_vessel_ids(self, limit=5000):
        return self.vessel_ids

    async def _load_particulars_payload(self, settings, mode, imo):
        self.loaded_imos.append(imo)
        if imo == "9999999":
            raise ValueError("source rejected vessel")
        return {"imoNumber": imo, "vesselName": f"Vessel {imo}", "registeredOwner": f"Owner {imo}"}

    async def _ingest_particulars_payload(self, vessel, payload, fetched_at):
        self.ingested_payloads.append((vessel.id, payload))
        return {
            "observations_inserted": 1,
            "entities_inserted": 1,
            "relationships_inserted": 1,
        }


def test_bulk_map_particulars_records_progress_success_skip_and_failure(monkeypatch):
    sleep_calls = []

    async def fake_sleep(seconds):
        sleep_calls.append(seconds)

    monkeypatch.setattr(ingestion_module.asyncio, "sleep", fake_sleep)
    job = SimpleNamespace(
        id=100,
        status="queued",
        parameters={},
        finished_at=None,
    )
    session = FakeBulkSession(
        job=job,
        vessels={
            1: SimpleNamespace(id=1, imo="1111111"),
            2: SimpleNamespace(id=2, imo=None),
            3: SimpleNamespace(id=3, imo="9999999"),
        },
    )
    service = BulkServiceForTest(session, vessel_ids=[1, 2, 3])

    run(service.run_bulk_map_particulars(settings=Settings(oceansx_api_key="test-key"), job_id=100, delay_seconds=0.25))

    assert service.loaded_imos == ["1111111", "9999999"]
    assert service.ingested_payloads == [(1, {"imoNumber": "1111111", "vesselName": "Vessel 1111111", "registeredOwner": "Owner 1111111"})]
    assert sleep_calls == [0.25, 0.25]
    assert job.status == "succeeded"
    assert job.finished_at is not None
    assert job.parameters["total"] == 3
    assert job.parameters["completed"] == 3
    assert job.parameters["succeeded"] == 1
    assert job.parameters["skipped"] == 1
    assert job.parameters["failed"] == 1
    assert job.parameters["current_vessel_id"] is None
    assert job.parameters["selection"] == "all_map_vessels"
    assert "flag_country_code" not in job.parameters
    assert job.parameters["target_rate_per_second"] == 4.0
    assert service.health.status == "healthy"
    assert service.health.metadata_["last_job_id"] == 100
    progress_snapshots = [commit["parameters"].get("completed") for commit in session.commits if "completed" in commit["parameters"]]
    assert progress_snapshots[:4] == [0, 1, 2, 3]


def test_bulk_map_particulars_stops_after_cancel_request(monkeypatch):
    sleep_calls = []

    async def fake_sleep(seconds):
        sleep_calls.append(seconds)

    monkeypatch.setattr(ingestion_module.asyncio, "sleep", fake_sleep)
    job = SimpleNamespace(
        id=102,
        status="queued",
        parameters={},
        finished_at=None,
    )
    session = FakeBulkSession(
        job=job,
        vessels={
            1: SimpleNamespace(id=1, imo="1111111"),
            2: SimpleNamespace(id=2, imo="2222222"),
            3: SimpleNamespace(id=3, imo="3333333"),
        },
        cancel_after_completed=1,
    )
    service = BulkServiceForTest(session, vessel_ids=[1, 2, 3])

    run(service.run_bulk_map_particulars(settings=Settings(oceansx_api_key="test-key"), job_id=102, delay_seconds=0.25))

    assert service.loaded_imos == ["1111111"]
    assert sleep_calls == []
    assert job.status == "cancelled"
    assert job.finished_at is not None
    assert job.parameters["selection"] == "all_map_vessels"
    assert job.parameters["cancel_requested"] is True
    assert job.parameters["completed"] == 1


def test_bulk_map_particulars_marks_job_failed_when_every_lookup_fails():
    job = SimpleNamespace(id=101, status="queued", parameters={}, finished_at=None)
    session = FakeBulkSession(
        job=job,
        vessels={
            1: SimpleNamespace(id=1, imo="9999999"),
            2: SimpleNamespace(id=2, imo="9999999"),
        },
    )
    service = BulkServiceForTest(session, vessel_ids=[1, 2])

    run(service.run_bulk_map_particulars(settings=Settings(oceansx_api_key="test-key"), job_id=101, delay_seconds=0))

    assert job.status == "failed"
    assert job.parameters["total"] == 2
    assert job.parameters["completed"] == 2
    assert job.parameters["failed"] == 2
    assert service.health.status == "unhealthy"
    assert service.health.last_error == "source rejected vessel"


class FakeMapRows:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeMapSession:
    def __init__(self, rows, flags, latest_job=None):
        self.rows = rows
        self.flags = flags
        self.latest_job = latest_job

    async def scalar(self, statement):
        return self.latest_job

    async def execute(self, statement):
        return FakeMapRows(self.rows)

    async def scalars(self, statement):
        return self.flags


def risk_flag(row_id, vessel_id, flag_type, severity, status="active"):
    return SimpleNamespace(
        id=row_id,
        vessel_id=vessel_id,
        entity_id=None,
        flag_type=flag_type,
        severity=severity,
        summary=f"{severity} test flag",
        evidence_id=None,
        status=status,
        created_at=datetime(2026, 5, 16, tzinfo=UTC),
        resolved_at=None,
    )


def test_map_vessel_payload_includes_active_risk_for_immediate_coloring():
    vessel = SimpleNamespace(
        id=10,
        name="HIGH RISK TEST",
        imo="1234567",
        mmsi="111222333",
        call_sign="TEST",
        flag_country_code="IR",
        vessel_type_code="T",
        year_built=None,
        deadweight=None,
        gross_tonnage=None,
        net_tonnage=None,
        length_meters=None,
        breadth_meters=None,
        depth_meters=None,
    )
    position = SimpleNamespace(
        latitude=Decimal("1.234567"),
        longitude=Decimal("103.987654"),
        speed_knots=Decimal("12.3"),
        course_degrees=Decimal("45"),
        heading_degrees=Decimal("47"),
        navigational_status="under way",
        position_timestamp=datetime(2026, 5, 16, tzinfo=UTC),
        evidence_id=55,
    )
    session = FakeMapSession(
        rows=[(vessel, position)],
        flags=[
            risk_flag(1, 10, "low_test", "low"),
            risk_flag(2, 10, "high_risk_flag_country", "high"),
        ],
    )

    features = run(MapService(session).list_vessel_positions(limit=5000, scope="latest-snapshot"))

    assert len(features) == 1
    feature = features[0]
    assert feature.vessel_id == 10
    assert feature.highest_risk_severity == "high"
    assert [flag.flag_type for flag in feature.risk_flags] == ["low_test", "high_risk_flag_country"]
    assert [flag.severity for flag in feature.risk_flags] == ["low", "high"]
