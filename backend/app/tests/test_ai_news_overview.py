import asyncio
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from app.api.routes import ai as ai_routes
from app.core.config import Settings
from app.models.risk import AiNewsOverview
from app.services.ai.mock_provider import MockNewsProvider
from app.services.ai.news_fact_packet import NewsFactPacketService
from app.services.ai.news_fact_packet import score_news_article
from app.services.ai.news_overview import PROMPT_VERSION, WEEKLY_SCOPE, AiNewsOverviewService
from app.services.ai.schemas import AiNewsFactPacket, AiNewsOverviewPayload


def run(coro):
    return asyncio.run(coro)


def test_ai_disabled_response_is_safe_without_database_session():
    service = AiNewsOverviewService(session=None, settings=Settings(feature_ai=False))  # type: ignore[arg-type]

    response = run(service.get_overview(window_hours=24))

    assert response.status == "disabled"
    assert response.disabled_reason
    assert response.overview.vessel_risk_changes == []
    assert response.overview.entity_linkage_changes == []
    assert response.overview.operational_context == []
    assert response.debug.reason == "feature_ai_disabled"


def test_fact_packet_scoring_prioritizes_linked_singapore_sanctions_items():
    score, reasons = score_news_article(
        {
            "title": "Singapore Strait tanker detained after OFAC sanctions notice",
            "summary": "MPA and port operators monitor bunker and insurance exposure.",
            "source": "The Maritime Executive",
            "source_badge": "The Maritime Executive",
            "bundle_name": "SEAM Singapore Maritime Intel",
            "published_at": datetime.now(UTC) - timedelta(hours=2),
            "linked_vessel_ids": [58],
            "linked_entity_ids": [12],
        }
    )

    assert score >= 20
    assert "exact vessel link" in reasons
    assert "Singapore maritime relevance" in reasons
    assert "risk/sanctions language" in reasons


def test_mock_provider_returns_weekly_brief_shape():
    """Mock provider should emit the AI Weekly Brief shape."""
    provider = MockNewsProvider(Settings(feature_ai=True))
    payload = run(
        provider.generate_news_overview(
            {
                "article_count": 1,
                "source_count": 2,
                "article_ids": [1],
                "global_metrics": {"new_risk_flags": 1, "new_port_events": 0, "active_positioned_vessels": 10},
                "previous_window": {"article_count": 0, "new_risk_flags": 0, "new_port_events": 0},
                "vessel_risk_changes": [
                    {
                        "vessel_id": 58,
                        "vessel_name": "HERA",
                        "change": "New sanctions exposure flag",
                        "severity": "critical",
                        "summary": "Stored risk flag references OFAC sanctions exposure.",
                        "support_ids": ["risk_flag:1"],
                        "article_ids": [],
                        "evidence_ids": [5386],
                    }
                ],
                "articles": [
                    {
                        "id": 1,
                        "title": "OFAC sanctions Singapore-flagged tanker",
                        "summary": "Vessel designated by OFAC for sanctions evasion; MPA reviewing port access.",
                        "source": "gCaptain",
                        "source_badge": "gCaptain",
                        "url": "https://example.com/ofac",
                        "relevance_score": 22,
                        "evidence_ids": [5386],
                        "linked_vessel_ids": [58],
                        "linked_entity_ids": [],
                        "linked_vessels": [
                            {"id": 58, "name": "HERA", "imo": "1075375", "type": "Tanker", "flag_country_code": "SG"}
                        ],
                        "linked_entities": [],
                    },
                    {
                        "id": 2,
                        "title": "Reuters: OPEC quotas tighten",
                        "summary": "OPEC announces tighter quotas; producers adjust outlook.",
                        "source": "Reuters",
                        "url": "https://example.com/opec",
                        "relevance_score": 4,
                        "linked_vessels": [],
                        "linked_entities": [],
                    },
                ],
            }
        )
    )

    overview = AiNewsOverviewPayload.model_validate(payload)

    assert overview.headline
    assert overview.executive_summary
    assert overview.metric_cards
    assert overview.news_rows, "Singapore article must produce a source row"
    assert overview.vessel_risk_changes, "deterministic risk changes must pass through"
    top = overview.vessel_risk_changes[0]
    assert top.vessel_name == "HERA"
    assert top.severity == "critical"
    assert top.evidence_ids == [5386]
    # Non-Singapore article can be present in the raw packet but should
    # not receive stronger claims without deterministic support.
    assert all("recommend" not in row.summary.lower() for row in overview.news_rows)


def test_weekly_fact_packet_schema_excludes_raw_and_admin_prompt_fields():
    packet = AiNewsFactPacket(
        scope=WEEKLY_SCOPE,
        window_hours=168,
        window_start=datetime(2026, 5, 14, tzinfo=UTC),
        window_end=datetime(2026, 5, 21, tzinfo=UTC),
        article_count=0,
        source_count=0,
        global_metrics={"new_risk_flags": 0, "support_ids": ["metric:risk_flags"]},
        method_gaps=["Voyage irregularity is limited to stored port events and latest positions."],
    )

    dumped = packet.model_dump(mode="json")
    flattened_keys = set(_walk_keys(dumped))

    forbidden = {
        "raw_payload",
        "payload_hash",
        "ingestion_logs",
        "table_counts",
        "geo_layers",
        "map_filters",
        "selected_vessels",
        "ui_state",
    }
    assert flattened_keys.isdisjoint(forbidden)
    assert "global_metrics" in dumped
    assert "method_gaps" in dumped


def test_mock_provider_does_not_invent_advanced_signals_without_computed_context():
    provider = MockNewsProvider(Settings(feature_ai=True))

    payload = run(
        provider.generate_news_overview(
            {
                "article_count": 0,
                "source_count": 0,
                "global_metrics": {"new_risk_flags": 0, "new_port_events": 0, "active_positioned_vessels": 0},
                "previous_window": {"article_count": 0, "new_risk_flags": 0, "new_port_events": 0},
                "operational_context": [],
                "method_gaps": [
                    "Flag-change detection found no comparable vessel identity snapshots in this window.",
                    "Voyage irregularity is limited to stored port events and latest positions.",
                ],
            }
        )
    )
    overview = AiNewsOverviewPayload.model_validate(payload)

    assert overview.operational_context == []
    rendered = " ".join(
        [
            overview.headline,
            overview.executive_summary,
            " ".join(row.summary for row in overview.news_rows),
            " ".join(overview.coverage_gaps),
        ]
    ).lower()
    assert "detected ais gaps" not in rendered
    assert "sts transfer" not in rendered
    assert "flag changed" not in rendered
    assert overview.coverage_gaps


def test_validator_removes_unsupported_items_and_action_oriented_language():
    service = AiNewsOverviewService(session=None, settings=Settings(feature_ai=True))  # type: ignore[arg-type]
    payload = AiNewsOverviewPayload.model_validate(
        {
            "headline": "Likely critical impact requires action",
            "executive_summary": "Take action because this is recommended.",
            "metric_cards": [
                {
                    "label": "Risk flags",
                    "value": "1",
                    "support_ids": ["metric:risk_flags"],
                    "article_ids": [],
                    "evidence_ids": [],
                },
                {
                    "label": "Unsupported",
                    "value": "bad",
                    "support_ids": [],
                    "article_ids": [999],
                    "evidence_ids": [],
                },
            ],
            "vessel_risk_changes": [
                {
                    "vessel_name": "HERA",
                    "change": "New flag",
                    "summary": "Recommended follow-up.",
                    "severity": "medium",
                    "support_ids": ["risk_flag:1"],
                    "article_ids": [],
                    "evidence_ids": [42],
                }
            ],
            "entity_linkage_changes": [],
            "operational_context": [],
            "news_rows": [],
            "method_note": "No legal conclusions.",
            "coverage_gaps": ["The analyst should know source data was limited."],
        }
    )

    cleaned, warnings = service._validate_payload(payload, {"article_ids": [], "evidence_ids": [], "vessel_risk_changes": [{"evidence_ids": [42]}]})

    assert len(cleaned.metric_cards) == 1
    assert cleaned.metric_cards[0].label == "Risk flags"
    assert "likely" not in cleaned.headline.lower()
    assert "take action" not in cleaned.executive_summary.lower()
    assert "recommended" not in cleaned.vessel_risk_changes[0].summary.lower()
    assert "should" not in cleaned.coverage_gaps[0].lower()
    assert any("Dropped unsupported" in warning for warning in warnings)
    assert any("Removed action-oriented phrase" in warning for warning in warnings)


def test_missing_model_sections_are_filled_from_deterministic_fallback():
    service = AiNewsOverviewService(session=None, settings=Settings(feature_ai=True))  # type: ignore[arg-type]
    payload = AiNewsOverviewPayload.model_validate(
        {
            "headline": "Weekly brief",
            "executive_summary": "Model returned a sparse but valid response.",
            "metric_cards": [],
            "vessel_risk_changes": [],
            "entity_linkage_changes": [],
            "operational_context": [],
            "news_rows": [],
            "method_note": "Generated from deterministic SEAM fact-pack fields only.",
            "coverage_gaps": [],
        }
    )
    packet = {
        "article_count": 1,
        "source_count": 1,
        "article_ids": [1],
        "evidence_ids": [42],
        "global_metrics": {"new_risk_flags": 0, "new_port_events": 0, "active_positioned_vessels": 0},
        "previous_window": {"article_count": 0, "new_risk_flags": 0, "new_port_events": 0},
        "articles": [
            {
                "id": 1,
                "title": "Singapore bunker market update",
                "summary": "Stored RSS source reports Singapore bunker pricing context.",
                "source": "Ship & Bunker",
                "url": "https://example.test/story",
                "relevance_score": 10,
                "evidence_ids": [42],
            }
        ],
    }

    filled, warnings = run(service._fill_missing_from_fallback(payload, packet))

    assert filled.metric_cards
    assert filled.news_rows
    assert filled.news_rows[0].article_ids == [1]
    assert any("Filled news rows" in warning for warning in warnings)


def test_public_get_without_saved_brief_does_not_mutate_session():
    session = FakeSession()
    service = AiNewsOverviewService(session=session, settings=Settings(feature_ai=True, ai_provider="mock"))

    response = run(service.get_overview(window_hours=168, generate_if_missing=False))

    assert response.status == "ready"
    assert response.debug.reason == "no_saved_brief"
    assert session.added == []
    assert session.commits == 0


def test_force_recompute_persists_weekly_scope_and_bypasses_cache(monkeypatch):
    session = FakeSession()
    packet = _minimal_packet()
    service = AiNewsOverviewService(session=session, settings=Settings(feature_ai=True, ai_provider="mock", ai_news_cache_minutes=60))

    async def fake_build(self, window_hours=24, bundle_name=None, max_articles=40):
        return packet

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("force recompute should bypass cache lookup")

    monkeypatch.setattr(NewsFactPacketService, "build", fake_build)
    monkeypatch.setattr(service, "_cached", fail_if_called)

    response = run(service.get_overview(window_hours=168, force=True))

    assert response.debug.reason == "forced_regeneration"
    assert session.commits == 1
    assert len(session.added) == 1
    row = session.added[0]
    assert isinstance(row, AiNewsOverview)
    assert row.scope == WEEKLY_SCOPE
    assert row.prompt_version == PROMPT_VERSION
    assert row.overview_json["headline"].startswith("Weekly brief:")


def test_weekly_and_legacy_ai_routes_share_contract(monkeypatch):
    calls: list[dict[str, object]] = []

    class FakeService:
        def __init__(self, session, settings):
            self.session = session
            self.settings = settings

        async def get_overview(self, **kwargs):
            calls.append(kwargs)
            return "ok"

    monkeypatch.setattr(ai_routes, "AiNewsOverviewService", FakeService)

    settings = Settings(feature_ai=True)
    assert run(ai_routes.get_ai_weekly_brief(session=object(), settings=settings)) == "ok"
    assert run(ai_routes.get_ai_news_overview(session=object(), settings=settings)) == "ok"
    assert run(ai_routes.recompute_ai_weekly_brief(session=object(), settings=settings)) == "ok"
    assert run(ai_routes.recompute_ai_news_overview(session=object(), settings=settings)) == "ok"

    assert calls == [
        {"window_hours": 168, "bundle_name": None, "generate_if_missing": False},
        {"window_hours": 168, "bundle_name": None, "generate_if_missing": False},
        {"window_hours": 168, "bundle_name": None, "force": True},
        {"window_hours": 168, "bundle_name": None, "force": True},
    ]


def _walk_keys(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            yield key
            yield from _walk_keys(nested)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_keys(item)


def _minimal_packet() -> AiNewsFactPacket:
    return AiNewsFactPacket(
        scope=WEEKLY_SCOPE,
        window_hours=168,
        window_start=datetime(2026, 5, 14, tzinfo=UTC),
        window_end=datetime(2026, 5, 21, tzinfo=UTC),
        article_count=0,
        source_count=0,
        global_metrics={"new_risk_flags": 0, "new_port_events": 0, "active_positioned_vessels": 0},
        previous_window={"article_count": 0, "new_risk_flags": 0, "new_port_events": 0},
        method_gaps=["No scoped source coverage in the selected weekly window."],
    )


class FakeSession:
    def __init__(self) -> None:
        self.added = []
        self.commits = 0

    async def scalar(self, statement):
        return None

    def add(self, row):
        self.added.append(row)

    async def commit(self):
        self.commits += 1

    async def refresh(self, row):
        row.id = 1

    async def scalars(self, statement):
        return []

    async def execute(self, statement):
        return SimpleNamespace(all=lambda: [])
