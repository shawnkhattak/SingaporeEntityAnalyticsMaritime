from datetime import UTC, date, datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db import async_session_factory, get_session
from app.schemas.dev import DevVesselBrowseRow
from app.schemas.evidence import EvidenceRead
from app.schemas.ingestion import IngestionJobRead, IngestionLogRead, SourceHealthRead
from app.models.ingestion import IngestionJob, SourceHealth
from app.models.maritime import Vessel
from app.services.dev_console import DevConsoleService
from app.services.enrichment import EnrichmentService
from app.services.geo import GeoService
from app.services.ingestion import IngestionService
from app.services.risk import RiskService

router = APIRouter(prefix="/api/dev", tags=["dev"])


def require_dev_mutations(settings: Annotated[Settings, Depends(get_settings)]) -> Settings:
    if not settings.feature_mutations or settings.environment not in {"development", "local", "test"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return settings


async def _run_bulk_map_particulars_background(job_id: int, delay_seconds: float, settings: Settings) -> None:
    async with async_session_factory() as session:
        await IngestionService(session).run_bulk_map_particulars(
            settings=settings,
            job_id=job_id,
            delay_seconds=delay_seconds,
        )


@router.post(
    "/ingestion/test",
    response_model=IngestionJobRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def run_ingestion_test(session: Annotated[AsyncSession, Depends(get_session)]) -> IngestionJobRead:
    service = IngestionService(session)
    return await service.run_test_job()


@router.post(
    "/ingestion/positions-snapshot",
    response_model=IngestionJobRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def run_positions_snapshot_ingestion(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    mode: Annotated[Literal["live"] | None, Query()] = None,
) -> IngestionJobRead:
    service = IngestionService(session)
    return await service.run_positions_snapshot(settings=settings, mode=mode)


@router.post(
    "/ingestion/vessel-particulars/{vessel_id}",
    response_model=IngestionJobRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def run_vessel_particulars_ingestion(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    vessel_id: int,
    mode: Annotated[Literal["live"] | None, Query()] = None,
) -> IngestionJobRead:
    service = IngestionService(session)
    return await service.run_vessel_particulars(settings=settings, vessel_id=vessel_id, mode=mode)


@router.post(
    "/ingestion/vessel-particulars-map",
    response_model=IngestionJobRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def run_map_vessel_particulars_ingestion(
    background_tasks: BackgroundTasks,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    delay_seconds: Annotated[float, Query(ge=0.05, le=10.0)] = 0.1,
) -> IngestionJobRead:
    service = IngestionService(session)
    job = await service.start_bulk_map_particulars(delay_seconds=delay_seconds)
    background_tasks.add_task(_run_bulk_map_particulars_background, job.id, delay_seconds, settings)
    return job


@router.post(
    "/ingestion/vessel-particulars-map/cancel",
    response_model=IngestionJobRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def cancel_map_vessel_particulars_ingestion(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> IngestionJobRead:
    service = IngestionService(session)
    try:
        return await service.cancel_bulk_map_particulars()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/ingestion/vessel-movements/{vessel_id}",
    response_model=IngestionJobRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def run_vessel_movements_ingestion(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    vessel_id: int,
    mode: Annotated[Literal["live"] | None, Query()] = None,
) -> IngestionJobRead:
    service = IngestionService(session)
    return await service.run_vessel_movements(settings=settings, vessel_id=vessel_id, mode=mode)


@router.post(
    "/ingestion/port-activity",
    response_model=IngestionJobRead,
    dependencies=[Depends(require_dev_mutations)],
)
async def run_port_activity_ingestion(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    kind: Annotated[Literal["due-arrive", "due-depart"], Query()],
    mode: Annotated[Literal["live"] | None, Query()] = None,
    activity_date: Annotated[date | None, Query(alias="date")] = None,
) -> IngestionJobRead:
    service = IngestionService(session)
    return await service.run_port_activity(settings=settings, kind=kind, mode=mode, activity_date=activity_date)


@router.post("/ingestion/geo-layers", dependencies=[Depends(require_dev_mutations)])
async def ingest_geo_layers(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    layers: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    layer_names = [item.strip() for item in layers.split(",")] if layers else None
    stats = await GeoService(session).ingest_live(settings, layer_names)
    return {"mode": "live", **stats}


@router.post("/ingestion/sanctions", dependencies=[Depends(require_dev_mutations)])
async def ingest_sanctions(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    confirm_live: Annotated[bool, Query()] = False,
) -> dict[str, Any]:
    if not confirm_live:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="OpenSanctions API calls are quota-limited. Re-run with confirm_live=true or import a CSV via /api/dev/ingestion/sanctions-csv.",
        )
    try:
        stats = await EnrichmentService(session).ingest_sanctions_live(settings)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"mode": "live", **stats}


@router.post("/ingestion/sanctions-csv", dependencies=[Depends(require_dev_mutations)])
async def ingest_sanctions_csv(
    session: Annotated[AsyncSession, Depends(get_session)],
    csv_text: Annotated[str, Body(media_type="text/csv")],
) -> dict[str, Any]:
    stats = await EnrichmentService(session).ingest_sanctions_csv(csv_text)
    return {"mode": "csv", **stats}


@router.post("/ingestion/sanctions-csv-url", dependencies=[Depends(require_dev_mutations)])
async def ingest_sanctions_csv_url(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    try:
        stats = await EnrichmentService(session).ingest_sanctions_csv_url(settings)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"mode": "csv-url", **stats}


@router.post("/ingestion/news", dependencies=[Depends(require_dev_mutations)])
async def ingest_news(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    try:
        stats = await EnrichmentService(session).ingest_news_live(settings)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"mode": "live", **stats}


@router.post("/risk/recompute", dependencies=[Depends(require_dev_mutations)])
async def recompute_risk(
    session: Annotated[AsyncSession, Depends(get_session)],
    vessel_id: Annotated[int | None, Query()] = None,
) -> dict[str, int]:
    return await RiskService(session).recompute(vessel_id=vessel_id)


@router.post("/active-issues/clear", dependencies=[Depends(require_dev_mutations)])
async def clear_active_issues(session: Annotated[AsyncSession, Depends(get_session)]) -> dict[str, int]:
    now = datetime.now(UTC)
    failed_jobs = await session.execute(
        update(IngestionJob)
        .where(IngestionJob.status.in_(("failed", "failure", "error")))
        .values(status="acknowledged", finished_at=now)
    )
    unhealthy_sources = await session.execute(
        update(SourceHealth)
        .values(status="healthy", last_checked_at=now, last_success_at=now, last_error=None)
    )
    await session.commit()
    return {"jobs_acknowledged": failed_jobs.rowcount or 0, "sources_cleared": unhealthy_sources.rowcount or 0}


@router.post("/ingestion/refresh-live", dependencies=[Depends(require_dev_mutations)])
async def refresh_live(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict:
    ingestion = IngestionService(session)
    positions = await ingestion.run_positions_snapshot(settings=settings, mode="live")
    vessel_ids = list(
        await session.scalars(select(Vessel.id).where(Vessel.imo.is_not(None)).order_by(Vessel.source_updated_at.desc().nullslast(), Vessel.id).limit(3))
    )
    particulars = [await ingestion.run_vessel_particulars(settings=settings, vessel_id=vessel_id, mode="live") for vessel_id in vessel_ids]
    movements = [await ingestion.run_vessel_movements(settings=settings, vessel_id=vessel_id, mode="live") for vessel_id in vessel_ids[:1]]
    geo = await GeoService(session).ingest_live(settings)
    enrichment = EnrichmentService(session)
    sanctions = {"skipped": "OpenSanctions API is quota-limited; run /api/dev/ingestion/sanctions?confirm_live=true or import /api/dev/ingestion/sanctions-csv."}
    try:
        news = await enrichment.ingest_news_live(settings)
    except ValueError as exc:
        news = {"error": str(exc)}
    risk = await RiskService(session).recompute()
    counts = await DevConsoleService(session).table_counts()
    return {
        "positions_job_id": positions.id,
        "particulars_job_ids": [job.id for job in particulars],
        "movement_job_ids": [job.id for job in movements],
        "port_activity": {"skipped": "OCEANS-X port activity ingestion is paused."},
        "geo": geo,
        "sanctions": sanctions,
        "news": news,
        "risk": risk,
        "counts": counts,
    }


@router.get(
    "/ingestion/jobs",
    response_model=list[IngestionJobRead],
    dependencies=[Depends(require_dev_mutations)],
)
async def list_ingestion_jobs(
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> list[IngestionJobRead]:
    service = IngestionService(session)
    return await service.list_recent_jobs(limit=limit)


@router.get(
    "/ingestion/logs",
    response_model=list[IngestionLogRead],
    dependencies=[Depends(require_dev_mutations)],
)
async def list_ingestion_logs(
    session: Annotated[AsyncSession, Depends(get_session)],
    job_id: int | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[IngestionLogRead]:
    service = IngestionService(session)
    return await service.list_recent_logs(job_id=job_id, limit=limit)


@router.get(
    "/source-health",
    response_model=list[SourceHealthRead],
    dependencies=[Depends(require_dev_mutations)],
)
async def list_source_health(session: Annotated[AsyncSession, Depends(get_session)]) -> list[SourceHealthRead]:
    service = IngestionService(session)
    return await service.list_source_health()


@router.get("/table-counts", response_model=dict[str, int], dependencies=[Depends(require_dev_mutations)])
async def table_counts(session: Annotated[AsyncSession, Depends(get_session)]) -> dict[str, int]:
    return await DevConsoleService(session).table_counts()


@router.get("/observations", response_model=list[EvidenceRead], dependencies=[Depends(require_dev_mutations)])
async def recent_observations(
    session: Annotated[AsyncSession, Depends(get_session)],
    source: str | None = None,
    type: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> list[EvidenceRead]:
    return await DevConsoleService(session).observations(source=source, type_=type, limit=limit)


@router.get("/vessels", response_model=list[DevVesselBrowseRow], dependencies=[Depends(require_dev_mutations)])
async def browse_dev_vessels(
    session: Annotated[AsyncSession, Depends(get_session)],
    q: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=5000)] = 5000,
) -> list[DevVesselBrowseRow]:
    return await DevConsoleService(session).vessel_browser(q=q, limit=limit)


@router.get("/table/{table}", dependencies=[Depends(require_dev_mutations)])
async def browse_table(
    session: Annotated[AsyncSession, Depends(get_session)],
    table: str,
    q: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    try:
        return await DevConsoleService(session).browse_table(table=table, q=q, limit=limit, offset=offset)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown table: {exc.args[0]}") from exc
