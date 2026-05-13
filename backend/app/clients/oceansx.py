from __future__ import annotations

import asyncio
import json
import socket
import urllib.error
import urllib.request
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

        return await asyncio.to_thread(self._fetch_json_sync, path, label)

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
