from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.oceansx import OceansXClient, OceansXError
from app.core.config import Settings
from app.models.evidence import SourceObservation
from app.services.ingestion import OCEANSX_SOURCE, stable_payload_hash

ALLOWED_GEO_LAYERS = {
    "ports_p": "/api/v1/gssdataset/mpa/portsandservicesp-zip",
    "ports_l": "/api/v1/gssdataset/mpa/portsandservicesl-zip",
    "ports_a": "/api/v1/gssdataset/mpa/portsandservicesa-zip",
    "dangers_p": "/api/v1/gssdataset/mpa/dangersp-zip",
    "dangers_l": "/api/v1/gssdataset/mpa/dangersl-zip",
    "dangers_a": "/api/v1/gssdataset/mpa/dangersa-zip",
    "aton_p": "/api/v1/gssdataset/mpa/aidstonavigationp-zip",
    "coastline_l": "/api/v1/gssdataset/mpa/coastlinel-zip",
    "coastline_a": "/api/v1/gssdataset/mpa/coastlinea-zip",
    "offshore_l": "/api/v1/gssdataset/mpa/offshoreinstallationsl-zip",
    "offshore_a": "/api/v1/gssdataset/mpa/offshoreinstallationsa-zip",
    "depths_l": "/api/v1/gssdataset/mpa/depthsl-zip",
    "depths_a": "/api/v1/gssdataset/mpa/depthsa-zip",
    "cultural_p": "/api/v1/gssdataset/mpa/culturalfeaturesp-zip",
    "cultural_l": "/api/v1/gssdataset/mpa/culturalfeaturesl-zip",
    "cultural_a": "/api/v1/gssdataset/mpa/culturalfeaturesa-zip",
    "natural_p": "/api/v1/gssdataset/mpa/naturalfeaturesp-zip",
    "natural_l": "/api/v1/gssdataset/mpa/naturalfeaturesl-zip",
    "natural_a": "/api/v1/gssdataset/mpa/naturalfeaturesa-zip",
    "military_a": "/api/v1/gssdataset/mpa/militaryfeaturesa-zip",
}


class GeoService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_layers(self) -> list[dict[str, Any]]:
        return [{"name": name, "endpoint": endpoint} for name, endpoint in ALLOWED_GEO_LAYERS.items()]

    async def get_layer(self, layer_name: str, settings: Settings | None = None) -> dict[str, Any] | None:
        if layer_name not in ALLOWED_GEO_LAYERS:
            return None
        observation = await self.session.scalar(
            select(SourceObservation)
            .where(
                SourceObservation.source == OCEANSX_SOURCE,
                SourceObservation.observation_type == "geo_layer",
                SourceObservation.source_record_id == layer_name,
            )
            .order_by(desc(SourceObservation.fetched_at))
            .limit(1)
        )
        if observation is not None:
            return _clean_layer_payload(layer_name, observation.raw_payload)
        if settings is not None:
            await self.ingest_live(settings, [layer_name])
            observation = await self.session.scalar(
                select(SourceObservation)
                .where(
                    SourceObservation.source == OCEANSX_SOURCE,
                    SourceObservation.observation_type == "geo_layer",
                    SourceObservation.source_record_id == layer_name,
                )
                .order_by(desc(SourceObservation.fetched_at))
                .limit(1)
            )
            if observation is not None:
                return _clean_layer_payload(layer_name, observation.raw_payload)
        return None

    async def ingest_live(self, settings: Settings, layer_names: list[str] | None = None) -> dict[str, Any]:
        selected = layer_names or list(ALLOWED_GEO_LAYERS)
        stats: dict[str, Any] = {"layers_seen": 0, "layers_failed": 0, "observations_inserted": 0, "observations_deduped": 0, "errors": {}}
        now = datetime.now(UTC)
        client = OceansXClient(
            api_key=settings.oceansx_api_key,
            base_url=settings.oceansx_base_url,
            timeout_seconds=settings.oceansx_request_timeout_seconds,
        )
        for name in selected:
            endpoint = ALLOWED_GEO_LAYERS.get(name)
            if endpoint is None:
                continue
            stats["layers_seen"] += 1
            await self.session.execute(
                delete(SourceObservation).where(
                    SourceObservation.source == OCEANSX_SOURCE,
                    SourceObservation.observation_type == "geo_layer",
                    SourceObservation.source_record_id == name,
                )
            )
            try:
                payload = await client.fetch_geo_layer(endpoint, name)
            except OceansXError as exc:
                stats["layers_failed"] += 1
                stats["errors"][name] = str(exc)
                continue
            payload_hash = stable_payload_hash(payload)
            existing = await self.session.scalar(
                select(SourceObservation).where(
                    SourceObservation.source == OCEANSX_SOURCE,
                    SourceObservation.observation_type == "geo_layer",
                    SourceObservation.source_record_id == name,
                    SourceObservation.payload_hash == payload_hash,
                )
            )
            if existing is not None:
                stats["observations_deduped"] += 1
                continue
            self.session.add(
                SourceObservation(
                    source=OCEANSX_SOURCE,
                    observation_type="geo_layer",
                    source_record_id=name,
                    observed_at=now,
                    fetched_at=now,
                    payload_hash=payload_hash,
                    raw_payload=payload,
                )
            )
            stats["observations_inserted"] += 1
        await self.session.commit()
        return stats


def _clean_layer_payload(layer_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    if layer_name != "ports_p" or payload.get("type") != "FeatureCollection":
        return payload
    return {
        **payload,
        "features": [
            feature
            for feature in payload.get("features", [])
            if _has_useful_port_name(feature.get("properties") or {})
        ],
    }


def _has_useful_port_name(props: dict[str, Any]) -> bool:
    for key in ("OBJNAM", "NAME", "NOBJNM"):
        value = props.get(key)
        if value is not None and len(str(value).strip()) > 1:
            return True
    return False
