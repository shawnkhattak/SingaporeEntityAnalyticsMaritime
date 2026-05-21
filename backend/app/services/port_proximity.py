from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.oceansx import OceansXClient, OceansXError
from app.core.config import Settings
from app.models.evidence import SourceObservation
from app.models.maritime import PortEvent, Vessel, VesselPositionLatest

OCEANSX_SOURCE = "OCEANS-X"
PORT_LAYER_ID = "ports_p"
PORT_LAYER_ENDPOINT = "/api/v1/gssdataset/mpa/portsandservicesp-zip"
PORT_PROXIMITY_EVENT = "port_proximity"
PORT_RADIUS_METERS = 850
MAX_PORT_SPEED_KNOTS = 3.0


@dataclass(frozen=True)
class PortPoint:
    code: str
    name: str
    latitude: float
    longitude: float


@dataclass(frozen=True)
class PortMatch:
    code: str
    name: str
    distance_meters: float


class PortProximityService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def sync_latest_positions(self, settings: Settings | None = None) -> dict[str, int]:
        ports = await self._load_ports(settings)
        stats = {"ports_loaded": len(ports), "vessels_checked": 0, "current_ports_set": 0, "current_ports_cleared": 0, "events_inserted": 0}
        if not ports:
            return stats

        rows = await self.session.execute(select(Vessel, VesselPositionLatest).join(VesselPositionLatest, VesselPositionLatest.vessel_id == Vessel.id))
        for vessel, position in rows:
            stats["vessels_checked"] += 1
            match = self._match_position(position, ports)
            previous_code = vessel.current_port_code
            if match is None:
                if vessel.current_port_code is not None:
                    vessel.current_port_code = None
                    vessel.current_port_name = None
                    vessel.current_port_distance_m = None
                    vessel.current_port_updated_at = position.position_timestamp
                    stats["current_ports_cleared"] += 1
                continue

            vessel.current_port_code = match.code
            vessel.current_port_name = match.name
            vessel.current_port_distance_m = Decimal(str(round(match.distance_meters, 1)))
            vessel.current_port_updated_at = position.position_timestamp
            stats["current_ports_set"] += 1
            if previous_code != match.code:
                self.session.add(
                    PortEvent(
                        vessel_id=vessel.id,
                        port_code=match.code,
                        port_name=match.name,
                        event_type=PORT_PROXIMITY_EVENT,
                        event_time=position.position_timestamp,
                        distance_meters=Decimal(str(round(match.distance_meters, 1))),
                        evidence_id=position.evidence_id,
                    )
                )
                stats["events_inserted"] += 1

        await self.session.flush()
        return stats

    async def _load_ports(self, settings: Settings | None) -> list[PortPoint]:
        observation = await self.session.scalar(
            select(SourceObservation)
            .where(
                SourceObservation.source == OCEANSX_SOURCE,
                SourceObservation.observation_type == "geo_layer",
                SourceObservation.source_record_id == PORT_LAYER_ID,
            )
            .order_by(desc(SourceObservation.fetched_at))
            .limit(1)
        )
        payload = observation.raw_payload if observation is not None else None
        if payload is None and settings is not None:
            payload = await self._fetch_and_store_ports(settings)
        return self._ports_from_geojson(payload or {})

    async def _fetch_and_store_ports(self, settings: Settings) -> dict[str, Any] | None:
        try:
            payload = await OceansXClient(
                api_key=settings.oceansx_api_key,
                base_url=settings.oceansx_base_url,
                timeout_seconds=settings.oceansx_request_timeout_seconds,
            ).fetch_geo_layer(PORT_LAYER_ENDPOINT, PORT_LAYER_ID)
        except OceansXError:
            return None
        now = datetime.now(UTC)
        payload_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()
        self.session.add(
            SourceObservation(
                source=OCEANSX_SOURCE,
                observation_type="geo_layer",
                source_record_id=PORT_LAYER_ID,
                observed_at=now,
                fetched_at=now,
                payload_hash=payload_hash,
                raw_payload=payload,
            )
        )
        await self.session.flush()
        return payload

    @staticmethod
    def _ports_from_geojson(payload: dict[str, Any]) -> list[PortPoint]:
        ports: list[PortPoint] = []
        for feature in payload.get("features") or []:
            geometry = feature.get("geometry") or {}
            if geometry.get("type") != "Point":
                continue
            coords = geometry.get("coordinates") or []
            if not isinstance(coords, list) or len(coords) < 2:
                continue
            props = feature.get("properties") or {}
            name = _first_text(props, "OBJNAM", "NAME", "NOBJNM")
            if not name or len(name.strip()) <= 1:
                continue
            code = _first_text(props, "NOID", "LNAM") or name
            try:
                lon = float(coords[0])
                lat = float(coords[1])
            except (TypeError, ValueError):
                continue
            ports.append(PortPoint(code=code, name=name, latitude=lat, longitude=lon))
        return ports

    @staticmethod
    def _match_position(position: VesselPositionLatest, ports: list[PortPoint]) -> PortMatch | None:
        if position.speed_knots is not None and float(position.speed_knots) > MAX_PORT_SPEED_KNOTS:
            return None
        lat = float(position.latitude)
        lon = float(position.longitude)
        best: PortMatch | None = None
        for port in ports:
            distance = _haversine_meters(lat, lon, port.latitude, port.longitude)
            if distance > PORT_RADIUS_METERS:
                continue
            if best is None or distance < best.distance_meters:
                best = PortMatch(code=port.code, name=port.name, distance_meters=distance)
        return best


def _first_text(props: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = props.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6_371_000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
