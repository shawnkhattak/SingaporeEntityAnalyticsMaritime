import asyncio
from datetime import UTC, datetime
from unittest import TestCase
from unittest.mock import patch

from app.clients.oceansx import OceansXClient
from app.services.ingestion import (
    PARTICULARS_ENTITY_FIELDS,
    _datetime_value,
    normalize_identity,
    normalize_position_row,
    stable_payload_hash,
)


class PositionsIngestionHelperTests(TestCase):
    def test_payload_hash_is_stable_for_key_order(self) -> None:
        self.assertEqual(stable_payload_hash({"b": 2, "a": 1}), stable_payload_hash({"a": 1, "b": 2}))

    def test_identity_normalization_reads_imo_mmsi_and_call_sign(self) -> None:
        row = {
            "mmsiNumber": "111000111",
            "vesselParticulars": {
                "imoNumber": "9462045",
                "callSign": "3ETD7",
            },
        }

        self.assertEqual(normalize_identity(row), ("9462045", "111000111", "3ETD7"))

    def test_rows_without_identity_or_coordinates_are_skipped(self) -> None:
        fetched_at = datetime(2026, 4, 26, 12, 0, tzinfo=UTC)

        missing_identity, identity_reason = normalize_position_row(
            {"latitudeDegrees": 1.2, "longitudeDegrees": 103.8},
            fetched_at=fetched_at,
        )
        missing_coordinates, coordinates_reason = normalize_position_row(
            {"vesselParticulars": {"imoNumber": "9462045"}},
            fetched_at=fetched_at,
        )

        self.assertIsNone(missing_identity)
        self.assertEqual(identity_reason, "missing_identity")
        self.assertIsNone(missing_coordinates)
        self.assertEqual(coordinates_reason, "missing_coordinates")

    def test_timestamp_parser_accepts_zulu_iso_values(self) -> None:
        normalized, reason = normalize_position_row(
            {
                "imoNumber": "9462045",
                "latitudeDegrees": "1.2612",
                "longitudeDegrees": "103.8338",
                "timeStamp": "2026-04-26T12:00:00Z",
            },
            fetched_at=datetime(2026, 4, 26, 12, 5, tzinfo=UTC),
        )

        self.assertIsNone(reason)
        self.assertIsNotNone(normalized)
        self.assertEqual(normalized.observed_at.tzinfo, UTC)

    def test_particulars_role_mapping_is_evidence_backed(self) -> None:
        self.assertEqual(PARTICULARS_ENTITY_FIELDS["registeredOwner"], ("owner", "company"))
        self.assertEqual(PARTICULARS_ENTITY_FIELDS["registeredOwnership"], ("owner", "company"))
        self.assertEqual(PARTICULARS_ENTITY_FIELDS["shipManager"], ("ship_manager", "company"))
        self.assertEqual(PARTICULARS_ENTITY_FIELDS["operator"], ("operator", "company"))
        self.assertEqual(PARTICULARS_ENTITY_FIELDS["ismManager"], ("ism_manager", "company"))
        self.assertNotIn("classificationSociety", PARTICULARS_ENTITY_FIELDS)
        self.assertNotIn("flag", PARTICULARS_ENTITY_FIELDS)
        self.assertNotIn("vesselType", PARTICULARS_ENTITY_FIELDS)

    def test_event_timestamp_parser_accepts_space_and_iso_formats(self) -> None:
        fallback = datetime(2026, 4, 26, 12, 0, tzinfo=UTC)

        self.assertEqual(_datetime_value("2026-04-26 08:30:00", fallback).hour, 8)
        self.assertEqual(_datetime_value("2026-04-26T08:30:00Z", fallback).tzinfo, UTC)

    def test_oceansx_port_activity_uses_date_and_hours_paths(self) -> None:
        client = OceansXClient(api_key="test-key", base_url="https://example.test", timeout_seconds=5)

        with patch.object(client, "_fetch_json_sync", return_value=[]) as fetch_json:
            asyncio.run(client.fetch_due_to_arrive("20250830", 24))
            fetch_json.assert_called_once_with("/api/v1/vessel/duetoarrive/date/20250830/hours/24", "due-to-arrive")

        with patch.object(client, "_fetch_json_sync", return_value=[]) as fetch_json:
            asyncio.run(client.fetch_due_to_depart("20211216", 24))
            fetch_json.assert_called_once_with("/api/v1/vessel/duetodepart/date/20211216/hours/24", "due-to-depart")
