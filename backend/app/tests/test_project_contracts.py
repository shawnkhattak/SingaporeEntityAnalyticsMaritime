import asyncio
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.api.routes import dev as dev_routes
from app.api.routes import health as health_routes
from app.clients.oceansx import (
    OceansXClient,
    OceansXInvalidJsonError,
    OceansXMissingApiKeyError,
)
from app.core.config import Settings
from app.services.dev_console import DevConsoleService
from app.services.enrichment import RSS_APP_BUNDLES, RSS_SOURCE_BADGES, _json_feed_articles, _rss_app_source_for
from app.services.geo import ALLOWED_GEO_LAYERS, GeoService
from app.services.ingestion import (
    _clean_identifier,
    extract_snapshot_rows,
    normalize_identity,
    stable_payload_hash,
)
from app.services.meta import MetaService
from app.services.reference import CURATED_REFERENCE
from app.services.risk import flag_country_severity
from app.services.vessels import VesselService


def run(coro):
    return asyncio.run(coro)


def test_health_route_exposes_environment_and_ai_guardrail(monkeypatch):
    monkeypatch.setattr(
        health_routes,
        "get_settings",
        lambda: Settings(environment="test", feature_ai=False),
    )

    payload = run(health_routes.health())

    assert payload == {"status": "ok", "environment": "test", "feature_ai": False}


@pytest.mark.parametrize("environment", ["development", "local", "test"])
def test_dev_mutation_guard_allows_only_development_like_environments(environment):
    settings = Settings(environment=environment, feature_mutations=True)

    assert dev_routes.require_dev_mutations(settings) is settings


@pytest.mark.parametrize(
    "settings",
    [
        Settings(environment="production", feature_mutations=True),
        Settings(environment="development", feature_mutations=False),
    ],
)
def test_dev_mutation_guard_rejects_production_or_disabled_mutations(settings):
    with pytest.raises(HTTPException) as exc:
        dev_routes.require_dev_mutations(settings)

    assert exc.value.status_code == 404


def test_oceansx_client_requires_api_key_for_all_live_endpoints():
    client = OceansXClient(api_key=None, base_url="https://example.test", timeout_seconds=5)

    calls = [
        client.fetch_positions_snapshot(),
        client.fetch_vessel_particulars("1234567"),
        client.fetch_vessel_movements("1234567"),
        client.fetch_due_to_arrive("20260516", 24),
        client.fetch_due_to_depart("20260516", 24),
        client.fetch_geo_layer("/api/v1/geo/ports/p", "ports_p"),
    ]

    for call in calls:
        with pytest.raises(OceansXMissingApiKeyError):
            run(call)


def test_oceansx_client_uses_expected_endpoint_paths():
    client = OceansXClient(api_key="key", base_url="https://example.test", timeout_seconds=5)

    with patch.object(client, "_fetch_json_sync", return_value={"ok": True}) as fetch_json:
        assert run(client.fetch_positions_snapshot()) == {"ok": True}
        fetch_json.assert_called_once_with("/api/v1/vessel/positions/snapshot", "snapshot")

    expected = [
        (client.fetch_vessel_particulars("1234567"), "/api/v1/vessel/particulars/imonumber/1234567", "particulars"),
        (client.fetch_vessel_movements("1234567"), "/api/v1/vessel/movements/imonumber/1234567", "movements"),
        (client.fetch_due_to_arrive("20260516", 24), "/api/v1/vessel/duetoarrive/date/20260516/hours/24", "due-to-arrive"),
        (client.fetch_due_to_depart("20260516", 24), "/api/v1/vessel/duetodepart/date/20260516/hours/24", "due-to-depart"),
        (client.fetch_geo_layer("/api/v1/geo/ports/p", "ports_p"), "/api/v1/geo/ports/p", "ports_p"),
    ]
    for call, path, label in expected:
        with patch.object(client, "_fetch_json_sync", return_value=[]) as fetch_json:
            assert run(call) == []
            fetch_json.assert_called_once_with(path, label)


def test_oceansx_client_rejects_invalid_json(monkeypatch):
    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def getcode(self):
            return 200

        def read(self):
            return b"{not json"

    monkeypatch.setattr("urllib.request.urlopen", lambda request, timeout: FakeResponse())
    client = OceansXClient(api_key="key", base_url="https://example.test", timeout_seconds=5)

    with pytest.raises(OceansXInvalidJsonError):
        client._fetch_json_sync("/test", "test")


def test_ingestion_identity_and_payload_helpers_are_stable():
    assert stable_payload_hash({"b": 2, "a": 1}) == stable_payload_hash({"a": 1, "b": 2})
    assert _clean_identifier("0") is None
    assert _clean_identifier("1234567.0") == "1234567"
    assert normalize_identity({"vesselParticulars": {"imoNumber": "1234567", "mmsiNumber": "555", "callSign": "ABCD"}}) == (
        "1234567",
        "555",
        "ABCD",
    )
    assert extract_snapshot_rows({"data": [{"imo": "1"}, "bad", {"imo": "2"}]}) == [{"imo": "1"}, {"imo": "2"}]
    assert extract_snapshot_rows({"imo": "single"}) == [{"imo": "single"}]
    assert extract_snapshot_rows("bad") == []


def test_schema_graph_contains_core_domains_and_foreign_key_edges():
    graph = MetaService().schema_graph()
    nodes = {node.id: node for node in graph.nodes}
    edge_pairs = {(edge.source, edge.target) for edge in graph.edges}

    for table in ("vessels", "vessel_positions_latest", "source_observations", "risk_flags", "ingestion_jobs"):
        assert table in nodes

    assert nodes["vessels"].domain == "vessel"
    assert nodes["source_observations"].domain == "evidence"
    assert nodes["risk_flags"].domain == "risk"
    assert ("vessel_positions_latest", "vessels") in edge_pairs
    assert ("risk_flags", "vessels") in edge_pairs


def test_curated_reference_contract_contains_labels_used_by_ui():
    assert CURATED_REFERENCE["flag_country"]["SG"] == "Singapore"
    assert CURATED_REFERENCE["flag_country"]["PA"] == "Panama"
    assert CURATED_REFERENCE["entity_role"] == {
        "owner": "Owner",
        "operator": "Operator",
        "ship_manager": "Ship manager",
        "ism_manager": "ISM manager",
    }
    assert CURATED_REFERENCE["vessel_type"]["CS"] == "Container Ship"


def test_default_news_feeds_are_the_three_rss_app_bundles():
    settings = Settings(_env_file=None)

    assert settings.news_rss_urls == [
        "https://rss.app/feeds/v1.1/_k2zRjP2j4B2XpYXV.json",
        "https://rss.app/feeds/v1.1/_dmwNOhqoTXjyWDMc.json",
        "https://rss.app/feeds/v1.1/_gw24IMIVRI5WBN1p.json",
    ]
    assert [RSS_APP_BUNDLES[url]["bundle_name"] for url in settings.news_rss_urls] == [
        "SEAM Singapore Social Media Intel",
        "SEAM Entity Watchlist",
        "SEAM Singapore Maritime Intel",
    ]


def test_rss_app_source_badge_contract_uses_exact_configured_names():
    assert RSS_SOURCE_BADGES == {
        "X/Twitter keyword search feed": "Twitter/X",
        "Lloyd’s List Twitter/X": "Lloyd’s List",
        '"Singapore bunker" vessel': "RSS.app Search Feed",
        '"Singapore-flagged" vessel': "RSS.app Search Feed",
        '"PSA Singapore" maritime': "RSS.app Search Feed",
        '"Singapore Strait" tanker': "RSS.app Search Feed",
        '"Port of Singapore" vessel': "RSS.app Search Feed",
        "TradeWinds Singapore": "TradeWinds",
        "MarineLink Singapore": "Maritime News",
        "Splash 24/7": "Splash 24/7",
        "MPA Singapore Media Releases": "Government Source",
        "gCaptain": "gCaptain",
        "The Maritime Executive": "The Maritime Executive",
    }


def test_rss_app_json_feed_parser_adds_bundle_and_badge_metadata():
    feed_url = "https://rss.app/feeds/v1.1/_gw24IMIVRI5WBN1p.json"
    body = b"""
    {
      "version": "https://jsonfeed.org/version/1.1",
      "title": "SEAM Singapore Maritime Intel",
      "items": [
        {
          "id": "1",
          "url": "https://www.maritime-executive.com/article/example",
          "title": "Singapore port update",
          "content_text": "The Maritime Executive report text",
          "date_published": "2026-05-16T12:00:00Z",
          "image": "https://example.test/image.jpg",
          "authors": [{"name": "The Maritime Executive"}]
        }
      ]
    }
    """

    articles = _json_feed_articles(body, feed_url)

    assert articles == [
        {
            "source": "The Maritime Executive",
            "source_badge": "The Maritime Executive",
            "bundle_name": "SEAM Singapore Maritime Intel",
            "bundle_purpose": "This bundle tracks formal maritime news, trade publications, and official Singapore maritime updates.",
            "feed_url": feed_url,
            "title": "Singapore port update",
            "url": "https://www.maritime-executive.com/article/example",
            "published_at": "2026-05-16T12:00:00Z",
            "summary": "The Maritime Executive report text",
            "image": "https://example.test/image.jpg",
            "authors": ["The Maritime Executive"],
            "rss_app_item_id": "1",
        }
    ]


@pytest.mark.parametrize(
    ("bundle", "title", "summary", "url", "authors", "expected"),
    [
        (
            "SEAM Singapore Social Media Intel",
            "Singapore shipping update",
            "",
            "https://x.com/LloydsList/status/123",
            ["@LloydsList"],
            ("Lloyd’s List Twitter/X", "Lloyd’s List"),
        ),
        (
            "SEAM Entity Watchlist",
            "Singapore bunker market update",
            "",
            "https://shipandbunker.com/news/example",
            ["Ship & Bunker"],
            ('"Singapore bunker" vessel', "RSS.app Search Feed"),
        ),
        (
            "SEAM Singapore Maritime Intel",
            "MPA Singapore media release",
            "Maritime and Port Authority of Singapore",
            "https://www.mpa.gov.sg/media-centre/details/example",
            ["MPA Singapore"],
            ("MPA Singapore Media Releases", "Government Source"),
        ),
    ],
)
def test_rss_app_source_classifier_maps_items_to_exact_source_and_badge(bundle, title, summary, url, authors, expected):
    assert _rss_app_source_for(bundle, title, summary, url, authors) == expected


def test_geo_layer_contract_is_backend_owned_and_known():
    layers = run(GeoService(session=object()).list_layers())
    by_name = {layer["name"]: layer["endpoint"] for layer in layers}

    assert by_name == ALLOWED_GEO_LAYERS
    assert by_name["ports_p"] == "/api/v1/geo/ports/p"
    assert "unknown" not in by_name


def test_vessel_summary_position_and_match_helpers():
    vessel = SimpleNamespace(
        id=7,
        imo="1234567",
        mmsi="555000111",
        name="SEAM TEST",
        call_sign="9ABC",
        flag_country_code="SG",
        vessel_type_code="CS",
        source_updated_at=datetime(2026, 5, 16, tzinfo=UTC),
    )
    position = SimpleNamespace(
        latitude=Decimal("1.234567"),
        longitude=Decimal("103.987654"),
        speed_knots=Decimal("12.5"),
        course_degrees=Decimal("45.0"),
        heading_degrees=Decimal("44.0"),
        navigational_status="under way",
        position_timestamp=datetime(2026, 5, 16, tzinfo=UTC),
        evidence_id=99,
    )

    summary = VesselService._summary(vessel)
    latest = VesselService._position(position)

    assert summary.id == 7
    assert summary.name == "SEAM TEST"
    assert latest.latitude == 1.234567
    assert latest.longitude == 103.987654
    assert latest.speed_knots == 12.5
    assert VesselService._match_fields(vessel, "123") == ["imo"]
    assert VesselService._match_fields(vessel, "SEAM") == ["name"]


def test_dev_console_vessel_browser_row_uses_highest_active_risk():
    vessel = SimpleNamespace(
        id=12,
        name="RISKY",
        imo="7654321",
        mmsi=None,
        call_sign=None,
        flag_country_code="IR",
        vessel_type_code="TA",
        source_updated_at=datetime(2026, 5, 16, tzinfo=UTC),
    )
    latest = SimpleNamespace(
        latitude=Decimal("1.1"),
        longitude=Decimal("103.1"),
        speed_knots=None,
        course_degrees=None,
        heading_degrees=None,
        navigational_status=None,
        position_timestamp=datetime(2026, 5, 16, tzinfo=UTC),
        evidence_id=5,
    )
    flags = [
        SimpleNamespace(severity="low", flag_type="low_test"),
        SimpleNamespace(severity="critical", flag_type="sanctions_match"),
        SimpleNamespace(severity="high", flag_type="high_risk_flag_country"),
    ]

    row = DevConsoleService._vessel_browser_row(vessel, latest, flags)

    assert row["highest_risk_severity"] == "critical"
    assert row["risk_flags_count"] == 3
    assert row["risk_flag_types"] == ["high_risk_flag_country", "low_test", "sanctions_match"]
    assert row["latest_position"]["latitude"] == 1.1


@pytest.mark.parametrize(
    ("flag_country_code", "expected"),
    [
        ("IR", "high"),
        ("ir", "high"),
        ("KP", "high"),
        ("SG", None),
        (None, None),
    ],
)
def test_risk_high_risk_flag_country_rule(flag_country_code, expected):
    assert flag_country_severity(flag_country_code) == expected
