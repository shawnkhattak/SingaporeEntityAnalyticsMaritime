import asyncio
from datetime import UTC, datetime, timedelta

from app.core.config import Settings
from app.services.ai.mock_provider import MockNewsProvider
from app.services.ai.news_fact_packet import score_news_article
from app.services.ai.news_overview import AiNewsOverviewService
from app.services.ai.schemas import AiNewsOverviewPayload


def run(coro):
    return asyncio.run(coro)


def test_ai_disabled_response_is_safe_without_database_session():
    service = AiNewsOverviewService(session=None, settings=Settings(feature_ai=False))  # type: ignore[arg-type]

    response = run(service.get_overview(window_hours=24))

    assert response.status == "disabled"
    assert response.disabled_reason
    assert response.overview.watch_items == []
    assert response.overview.themes == []
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


def test_mock_provider_returns_singapore_analyst_brief():
    """Mock provider should emit the new Singapore Analyst Brief shape.

    A Singapore-relevant article must surface as a watch item with the
    correct subject, severity (OFAC → critical), and a kind that calls
    for action.
    """
    provider = MockNewsProvider(Settings(feature_ai=True))
    payload = run(
        provider.generate_news_overview(
            {
                "source_count": 2,
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
    assert overview.bottom_line
    assert overview.watch_items, "Singapore article must produce a watch item"
    top = overview.watch_items[0]
    assert top.subject == "HERA"
    assert top.severity == "critical"
    assert top.kind == "action"
    assert top.article_ids == [1]
    assert top.evidence_ids == [5386]
    # Non-Singapore article must NOT appear as a watch item.
    assert all(item.article_ids != [2] for item in overview.watch_items)
    # Themes should at least cover screening / enforcement for an OFAC item.
    assert any("screening" in theme.title.lower() or "enforcement" in theme.title.lower() for theme in overview.themes)
