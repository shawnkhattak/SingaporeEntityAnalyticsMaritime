from typing import Annotated, Any, Literal

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db import get_session
from app.schemas.dev import DevVesselBrowseRow
from app.schemas.evidence import EvidenceRead
from app.schemas.ingestion import IngestionJobRead, IngestionLogRead, SourceHealthRead
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
) -> IngestionJobRead:
    service = IngestionService(session)
    return await service.run_port_activity(settings=settings, kind=kind, mode=mode)


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
    port_activity = [
        await ingestion.run_port_activity(settings=settings, kind="due-arrive", mode="live"),
        await ingestion.run_port_activity(settings=settings, kind="due-depart", mode="live"),
    ]
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
        "port_activity_job_ids": [job.id for job in port_activity],
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
