from __future__ import annotations

import asyncio
import json
import urllib.error
import urllib.request
from typing import Any

from app.core.config import Settings


ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"


class AnthropicNewsProvider:
    name = "anthropic"

    def __init__(self, settings: Settings) -> None:
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required for the Anthropic provider.")
        self.api_key = settings.anthropic_api_key
        self.model_name = settings.ai_model or "claude-opus-4-7"
        self.last_usage: dict[str, int | float] = {}

    async def generate_news_overview(self, fact_packet: dict[str, Any]) -> dict[str, Any]:
        return await asyncio.to_thread(self._generate_sync, fact_packet)

    def _generate_sync(self, fact_packet: dict[str, Any]) -> dict[str, Any]:
        body = {
            "model": self.model_name,
            "max_tokens": 2500,
            "system": (
                "You write the SEAM AI Weekly Brief from a deterministic fact pack. "
                "SEAM services already computed counts, rankings, risk changes, relationship changes, operational signals, method gaps, support IDs, article IDs, and evidence IDs. "
                "Your job is only to phrase that data into concise human-readable JSON. "
                "Do not add outside knowledge, predictions, recommendations, legal conclusions, compliance conclusions, or unsupported risk judgments. "
                "Do not use action-oriented language such as 'take action', 'recommended', 'likely', 'must', 'should', or 'critical impact'. "
                "Every substantive item must keep support_ids and any article_ids/evidence_ids from the fact pack. "
                "Output ONLY through the provided tool."
            ),
            "tools": [self._overview_tool()],
            "tool_choice": {"type": "tool", "name": "create_singapore_brief"},
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "Produce the SEAM AI Weekly Brief from the fact packet below. Return headline, executive_summary, metric_cards, vessel_risk_changes, entity_linkage_changes, operational_context, news_rows, method_note, and coverage_gaps. "
                        "Keep every section concise. Preserve supplied support_ids, article_ids, and evidence_ids. Omit items that lack support. Do not populate platform_signals.\n\n"
                        f"FACT_PACKET:\n{json.dumps(fact_packet, ensure_ascii=True, default=str)}"
                    ),
                }
            ],
        }
        request = urllib.request.Request(
            ANTHROPIC_MESSAGES_URL,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "content-type": "application/json",
                "anthropic-version": ANTHROPIC_VERSION,
                "x-api-key": self.api_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Anthropic API returned {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Anthropic API request failed: {exc.reason}") from exc

        self.last_usage = self._usage(payload)
        tool_payload = self._extract_tool_input(payload)
        if tool_payload is not None:
            return tool_payload
        text = self._extract_text(payload)
        return self._parse_json(text)

    def _usage(self, payload: dict[str, Any]) -> dict[str, int | float]:
        usage = payload.get("usage")
        if not isinstance(usage, dict):
            return {}
        input_tokens = int(usage.get("input_tokens") or 0)
        output_tokens = int(usage.get("output_tokens") or 0)
        cache_creation = int(usage.get("cache_creation_input_tokens") or 0)
        cache_read = int(usage.get("cache_read_input_tokens") or 0)
        total_input = input_tokens + cache_creation + cache_read
        input_rate, output_rate = self._pricing_per_mtok(total_input)
        cost = ((input_tokens + cache_creation) / 1_000_000 * input_rate) + (cache_read / 1_000_000 * (input_rate * 0.1)) + (output_tokens / 1_000_000 * output_rate)
        return {
            "input_tokens": total_input,
            "output_tokens": output_tokens,
            "estimated_cost_usd": round(cost, 6),
        }

    def _pricing_per_mtok(self, input_tokens: int) -> tuple[float, float]:
        model = self.model_name.lower()
        if "haiku" in model:
            return 0.80, 4.00
        if "opus" in model:
            return 15.00, 75.00
        if "sonnet" in model and input_tokens > 200_000:
            return 6.00, 22.50
        return 3.00, 15.00

    def _overview_tool(self) -> dict[str, Any]:
        severity_levels = ["critical", "medium", "low", "none"]
        return {
            "name": "create_singapore_brief",
            "description": "Create an evidence-backed SEAM AI Weekly Brief from stored fact-pack data.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "headline": {"type": "string"},
                    "executive_summary": {"type": "string"},
                    "metric_cards": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "value": {"type": "string"},
                                "delta": {"type": ["string", "null"]},
                                "tone": {"type": "string", "enum": ["neutral", "up", "down", "warning"]},
                                "support_ids": {"type": "array", "items": {"type": "string"}},
                                "article_ids": {"type": "array", "items": {"type": "integer"}},
                                "evidence_ids": {"type": "array", "items": {"type": "integer"}},
                            },
                            "required": ["label", "value", "support_ids", "article_ids", "evidence_ids"],
                            "additionalProperties": False,
                        },
                    },
                    "vessel_risk_changes": {"type": "array", "items": self._supported_item_schema({"vessel_id": {"type": ["integer", "null"]}, "vessel_name": {"type": "string"}, "change": {"type": "string"}, "severity": {"type": "string", "enum": severity_levels}, "summary": {"type": "string"}}, ["vessel_name", "change", "severity", "summary"])},
                    "entity_linkage_changes": {"type": "array", "items": self._supported_item_schema({"entity_id": {"type": ["integer", "null"]}, "entity_name": {"type": "string"}, "change": {"type": "string"}, "relationship_type": {"type": ["string", "null"]}, "summary": {"type": "string"}}, ["entity_name", "change", "summary"])},
                    "operational_context": {"type": "array", "items": self._supported_item_schema({"title": {"type": "string"}, "summary": {"type": "string"}, "signal_type": {"type": "string"}, "severity": {"type": "string", "enum": severity_levels}}, ["title", "summary", "signal_type", "severity"])},
                    "news_rows": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "source": {"type": ["string", "null"]},
                                "summary": {"type": "string"},
                                "source_quality": {"type": ["string", "null"]},
                                "support_ids": {"type": "array", "items": {"type": "string"}},
                                "article_ids": {"type": "array", "items": {"type": "integer"}},
                                "evidence_ids": {"type": "array", "items": {"type": "integer"}},
                            },
                            "required": ["title", "summary", "support_ids", "article_ids", "evidence_ids"],
                            "additionalProperties": False,
                        },
                    },
                    "method_note": {"type": "string"},
                    "coverage_gaps": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
                },
                "required": [
                    "headline",
                    "executive_summary",
                    "metric_cards",
                    "vessel_risk_changes",
                    "entity_linkage_changes",
                    "operational_context",
                    "news_rows",
                    "method_note",
                    "coverage_gaps",
                ],
                "additionalProperties": False,
            },
        }

    def _supported_item_schema(self, properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
        merged = {
            **properties,
            "support_ids": {"type": "array", "items": {"type": "string"}},
            "article_ids": {"type": "array", "items": {"type": "integer"}},
            "evidence_ids": {"type": "array", "items": {"type": "integer"}},
        }
        return {
            "type": "object",
            "properties": merged,
            "required": [*required, "support_ids", "article_ids", "evidence_ids"],
            "additionalProperties": False,
        }

    def _extract_tool_input(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        for block in payload.get("content", []):
            if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("name") == "create_singapore_brief":
                value = block.get("input")
                if isinstance(value, dict):
                    return value
        return None

    def _extract_text(self, payload: dict[str, Any]) -> str:
        chunks: list[str] = []
        for block in payload.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text" and isinstance(block.get("text"), str):
                chunks.append(block["text"])
        if not chunks:
            raise RuntimeError("Anthropic response did not include text content.")
        return "\n".join(chunks).strip()

    def _parse_json(self, text: str) -> dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```json").removeprefix("```").strip()
            cleaned = cleaned.removesuffix("```").strip()
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start == -1 or end == -1 or end <= start:
                raise
            parsed = json.loads(cleaned[start : end + 1])
        if not isinstance(parsed, dict):
            raise RuntimeError("Anthropic response JSON was not an object.")
        return parsed
