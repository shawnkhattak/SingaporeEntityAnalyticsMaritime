from unittest import TestCase

from app.services.enrichment import (
    _confidence_from_opensanctions_result,
    _normalize_sanctions_csv_row,
    _risk_flag_type,
    _severity_for_risk,
    conservative_name_match,
)


class SanctionsEnrichmentHelperTests(TestCase):
    def test_opensanctions_score_maps_to_conservative_confidence(self) -> None:
        row = {"caption": "EVERGREEN MARINE CORP", "properties": {"name": ["EVERGREEN MARINE CORP"]}, "score": 0.96}

        self.assertEqual(_confidence_from_opensanctions_result(row, "EVERGREEN MARINE CORP"), "exact")
        self.assertEqual(_confidence_from_opensanctions_result({**row, "score": 0.75}, "EVERGREEN MARINE"), "strong")
        self.assertEqual(_confidence_from_opensanctions_result({**row, "score": 0.73, "caption": "OTHER"}, "NO MATCH"), "possible")

    def test_csv_rows_normalize_common_opensanctions_columns(self) -> None:
        row = _normalize_sanctions_csv_row(
            {
                "id": "NK-123",
                "caption": "VESSEL OWNER LTD",
                "imo": "IMO1234567",
                "datasets": "maritime; sanctions",
                "risk": "sanction;mare.shadow",
            }
        )

        self.assertEqual(row["id"], "NK-123")
        self.assertEqual(row["imo"], "1234567")
        self.assertIn("VESSEL OWNER LTD", row["properties"]["name"])
        self.assertEqual(row["datasets"], ["maritime", "sanctions"])
        self.assertEqual(row["topics"], ["sanction", "mare.shadow"])

    def test_maritime_risk_topics_map_to_flag_type_and_severity(self) -> None:
        sanctioned = _normalize_sanctions_csv_row({"caption": "A", "risk": "sanction"})
        shadow = _normalize_sanctions_csv_row({"caption": "B", "risk": "mare.shadow"})
        detained = _normalize_sanctions_csv_row({"caption": "C", "risk": "mare.detained;reg.warn"})

        self.assertEqual(_risk_flag_type(sanctioned), "sanctions_match")
        self.assertEqual(_severity_for_risk(sanctioned), "critical")
        self.assertEqual(_risk_flag_type(shadow), "maritime_watchlist")
        self.assertEqual(_severity_for_risk(shadow), "high")
        self.assertEqual(_severity_for_risk(detained), "medium")

    def test_csv_name_fallback_rejects_short_substring_matches(self) -> None:
        self.assertEqual(conservative_name_match("SL", "VESSEL OWNER LTD"), "weak")
        self.assertEqual(conservative_name_match("VESSEL OWNER", "VESSEL OWNER LTD"), "strong")
