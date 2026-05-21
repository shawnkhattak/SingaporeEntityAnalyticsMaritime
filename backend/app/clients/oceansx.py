from __future__ import annotations

import asyncio
import json
import socket
import struct
import urllib.error
import urllib.request
import zipfile
from io import BytesIO
from typing import Any


class OceansXError(Exception):
    """Base error for OCEANS-X access."""


class OceansXMissingApiKeyError(OceansXError):
    pass


class OceansXTimeoutError(OceansXError):
    pass


class OceansXResponseError(OceansXError):
    pass


class OceansXInvalidJsonError(OceansXError):
    pass


class OceansXClient:
    def __init__(self, api_key: str | None, base_url: str, timeout_seconds: int) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    async def fetch_positions_snapshot(self) -> Any:
        if not self.api_key:
            raise OceansXMissingApiKeyError("OCEANSX_API_KEY is required for live OCEANS-X snapshot ingestion.")

        return await asyncio.to_thread(self._fetch_positions_snapshot_sync)

    async def fetch_vessel_particulars(self, imo: str) -> Any:
        if not self.api_key:
            raise OceansXMissingApiKeyError("OCEANSX_API_KEY is required for live OCEANS-X particulars ingestion.")

        return await asyncio.to_thread(self._fetch_json_sync, f"/api/v1/vessel/particulars/imonumber/{imo}", "particulars")

    async def fetch_vessel_movements(self, imo: str) -> Any:
        if not self.api_key:
            raise OceansXMissingApiKeyError("OCEANSX_API_KEY is required for live OCEANS-X movements ingestion.")

        return await asyncio.to_thread(self._fetch_json_sync, f"/api/v1/vessel/movements/imonumber/{imo}", "movements")

    async def fetch_due_to_arrive(self, date: str, hours: int) -> Any:
        if not self.api_key:
            raise OceansXMissingApiKeyError("OCEANSX_API_KEY is required for live OCEANS-X port activity ingestion.")

        return await asyncio.to_thread(self._fetch_json_sync, f"/api/v1/vessel/duetoarrive/date/{date}/hours/{hours}", "due-to-arrive")

    async def fetch_due_to_depart(self, date: str, hours: int) -> Any:
        if not self.api_key:
            raise OceansXMissingApiKeyError("OCEANSX_API_KEY is required for live OCEANS-X port activity ingestion.")

        return await asyncio.to_thread(self._fetch_json_sync, f"/api/v1/vessel/duetodepart/date/{date}/hours/{hours}", "due-to-depart")

    async def fetch_geo_layer(self, path: str, label: str) -> Any:
        if not self.api_key:
            raise OceansXMissingApiKeyError("OCEANSX_API_KEY is required for live OCEANS-X geo layer ingestion.")

        return await asyncio.to_thread(self._fetch_geo_layer_sync, path, label)

    def _fetch_positions_snapshot_sync(self) -> Any:
        return self._fetch_json_sync("/api/v1/vessel/positions/snapshot", "snapshot")

    def _fetch_json_sync(self, path: str, label: str) -> Any:
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            headers={
                "Accept": "application/json",
                "apikey": self.api_key or "",
            },
            method="GET",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                status_code = response.getcode()
                body = response.read()
        except TimeoutError as exc:
            raise OceansXTimeoutError(f"Timed out while fetching OCEANS-X {label}.") from exc
        except socket.timeout as exc:
            raise OceansXTimeoutError(f"Timed out while fetching OCEANS-X {label}.") from exc
        except urllib.error.HTTPError as exc:
            err_body = ""
            try:
                err_body = (exc.read() or b"").decode("utf-8", errors="replace").strip()
            except Exception:
                err_body = ""
            snippet = f" body={err_body[:200]}" if err_body else ""
            raise OceansXResponseError(f"OCEANS-X {label} returned HTTP {exc.code}.{snippet}") from exc
        except urllib.error.URLError as exc:
            raise OceansXResponseError(f"OCEANS-X {label} request failed: {exc.reason}") from exc

        if status_code < 200 or status_code >= 300:
            raise OceansXResponseError(f"OCEANS-X {label} returned HTTP {status_code}.")

        try:
            return json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise OceansXInvalidJsonError(f"OCEANS-X {label} response was not valid JSON.") from exc

    def _fetch_geo_layer_sync(self, path: str, label: str) -> Any:
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            headers={
                "Accept": "application/zip, application/json, */*",
                "apikey": self.api_key or "",
            },
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                status_code = response.getcode()
                content_type = response.headers.get("content-type", "")
                body = response.read()
        except TimeoutError as exc:
            raise OceansXTimeoutError(f"Timed out while fetching OCEANS-X {label}.") from exc
        except socket.timeout as exc:
            raise OceansXTimeoutError(f"Timed out while fetching OCEANS-X {label}.") from exc
        except urllib.error.HTTPError as exc:
            err_body = ""
            try:
                err_body = (exc.read() or b"").decode("utf-8", errors="replace").strip()
            except Exception:
                err_body = ""
            snippet = f" body={err_body[:200]}" if err_body else ""
            raise OceansXResponseError(f"OCEANS-X {label} returned HTTP {exc.code}.{snippet}") from exc
        except urllib.error.URLError as exc:
            raise OceansXResponseError(f"OCEANS-X {label} request failed: {exc.reason}") from exc

        if status_code < 200 or status_code >= 300:
            raise OceansXResponseError(f"OCEANS-X {label} returned HTTP {status_code}.")

        if "zip" in content_type.lower() or body.startswith(b"PK"):
            return _shapefile_zip_to_geojson(body, label)

        try:
            return json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise OceansXInvalidJsonError(f"OCEANS-X {label} response was not valid JSON or ZIP shapefile data.") from exc


def _shapefile_zip_to_geojson(body: bytes, label: str) -> dict[str, Any]:
    try:
        with zipfile.ZipFile(BytesIO(body)) as archive:
            shp_name = next(name for name in archive.namelist() if name.lower().endswith(".shp"))
            dbf_name = next((name for name in archive.namelist() if name.lower().endswith(".dbf")), None)
            shp = archive.read(shp_name)
            properties = _parse_dbf(archive.read(dbf_name)) if dbf_name else []
    except (KeyError, StopIteration, zipfile.BadZipFile) as exc:
        raise OceansXInvalidJsonError(f"OCEANS-X {label} ZIP did not contain a readable shapefile.") from exc

    features = []
    for idx, geometry in enumerate(_parse_shp_geometries(shp)):
        if geometry is None:
            continue
        feature_props = properties[idx] if idx < len(properties) else {}
        feature_props = {k: v for k, v in feature_props.items() if v not in ("", None)}
        if label == "ports_p" and not _has_useful_port_name(feature_props):
            continue
        features.append({"type": "Feature", "geometry": geometry, "properties": feature_props})

    return {"type": "FeatureCollection", "features": features}


def _has_useful_port_name(props: dict[str, Any]) -> bool:
    for key in ("OBJNAM", "NAME", "NOBJNM"):
        value = props.get(key)
        if value is not None and len(str(value).strip()) > 1:
            return True
    return False


def _parse_dbf(data: bytes) -> list[dict[str, Any]]:
    if len(data) < 32:
        return []
    record_count = struct.unpack("<I", data[4:8])[0]
    header_len = struct.unpack("<H", data[8:10])[0]
    record_len = struct.unpack("<H", data[10:12])[0]
    fields: list[tuple[str, str, int, int]] = []
    offset = 32
    while offset + 32 <= len(data) and data[offset] != 0x0D:
        raw = data[offset : offset + 32]
        name = raw[:11].split(b"\0", 1)[0].decode("ascii", errors="ignore")
        fields.append((name, chr(raw[11]), raw[16], raw[17]))
        offset += 32

    records: list[dict[str, Any]] = []
    for i in range(record_count):
        start = header_len + i * record_len
        record = data[start : start + record_len]
        if len(record) < record_len or record[:1] == b"*":
            continue
        pos = 1
        values: dict[str, Any] = {}
        for name, field_type, length, decimals in fields:
            raw_value = record[pos : pos + length].decode("latin1", errors="replace").strip()
            pos += length
            values[name] = _coerce_dbf_value(raw_value, field_type, decimals)
        records.append(values)
    return records


def _coerce_dbf_value(value: str, field_type: str, decimals: int) -> Any:
    if value == "":
        return None
    if field_type in {"N", "F"}:
        try:
            return float(value) if decimals else int(value)
        except ValueError:
            return value
    if field_type == "L":
        return value.upper() in {"Y", "T"}
    if field_type == "D" and len(value) == 8:
        return f"{value[:4]}-{value[4:6]}-{value[6:8]}"
    return value


def _parse_shp_geometries(data: bytes) -> list[dict[str, Any] | None]:
    geometries: list[dict[str, Any] | None] = []
    offset = 100
    while offset + 8 <= len(data):
        _, content_words = struct.unpack(">2i", data[offset : offset + 8])
        offset += 8
        content_len = content_words * 2
        content = data[offset : offset + content_len]
        offset += content_len
        if len(content) < 4:
            continue
        shape_type = struct.unpack("<i", content[:4])[0]
        geometries.append(_parse_shape(content, shape_type))
    return geometries


def _parse_shape(content: bytes, shape_type: int) -> dict[str, Any] | None:
    if shape_type == 0:
        return None
    if shape_type == 1 and len(content) >= 20:
        x, y = struct.unpack("<2d", content[4:20])
        return {"type": "Point", "coordinates": [x, y]}
    if shape_type in {3, 5} and len(content) >= 44:
        num_parts, num_points = struct.unpack("<2i", content[36:44])
        parts_start = 44
        points_start = parts_start + 4 * num_parts
        if len(content) < points_start + 16 * num_points:
            return None
        parts = list(struct.unpack(f"<{num_parts}i", content[parts_start:points_start])) if num_parts else [0]
        points = [
            list(struct.unpack("<2d", content[points_start + i * 16 : points_start + (i + 1) * 16]))
            for i in range(num_points)
        ]
        rings = [points[start : parts[idx + 1] if idx + 1 < len(parts) else len(points)] for idx, start in enumerate(parts)]
        if shape_type == 3:
            return {"type": "LineString", "coordinates": rings[0]} if len(rings) == 1 else {"type": "MultiLineString", "coordinates": rings}
        return {"type": "Polygon", "coordinates": rings} if len(rings) == 1 else {"type": "MultiPolygon", "coordinates": [[ring] for ring in rings]}
    return None
