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
            "max_tokens": 1400,
            "system": (
                "You are writing a weekly source-linked maritime brief for SEAM. Use only facts in the provided fact pack. "
                "Do not add facts, infer intent, speculate, or provide legal, compliance, trading, risk, or operational recommendations. "
                "Avoid 'suggests', 'signals', 'raises concerns', and 'indicates' unless the source directly says it. "
                "Use neutral verbs such as recorded, reported, matched, linked, observed, and stored. "
                "Write clearly for maritime, energy, and business readers. "
                "Output ONLY through the provided tool."
            ),
            "tools": [self._overview_tool()],
            "tool_choice": {"type": "tool", "name": "create_singapore_brief"},
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "Produce a simple most-important-news brief from this deterministic fact pack. Use external news items for news and key developments. "
                        "Do not mention internal system records, platform context, database counts, risk records, relationship records, port events, evidence counts, or vessel counts. "
                        "When selected_news or key_developments include matched_to.type='vessel', include that exact vessel name in the key development label unless the label already names it. "
                        "Do not use the word grouped. Do not create new facts.\n"
                        "Limits: headline <= 140 characters, executive_summary <= 120 words, up to 3 key_developments, each key development label <= 24 words. "
                        "method_note must be: Source-linked facts only. No legal, compliance, trading, or operational recommendations.\n\n"
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
        return {
            "name": "create_singapore_brief",
            "description": "Phrase the concise narrative fields for an evidence-backed SEAM AI Weekly Brief.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "headline": {"type": "string"},
                    "executive_summary": {"type": "string"},
                    "key_developments": {"type": "array", "items": self._key_development_schema(), "maxItems": 3},
                    "method_note": {"type": "string"},
                    "coverage_gaps": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
                },
                "required": [
                    "headline",
                    "executive_summary",
                    "key_developments",
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

    def _key_development_schema(self) -> dict[str, Any]:
        return self._supported_item_schema(
            {
                "id": {"type": "string"},
                "label": {"type": "string"},
                "facts": {"type": "array", "items": {"type": "string"}},
                "source_type": {"type": "string", "enum": ["official", "trade", "database", "social_unverified", "mixed"]},
                "confidence": {"type": "string", "enum": ["source_linked", "system_recorded"]},
                "why_shown": {"type": "string"},
            },
            ["id", "label", "facts", "source_type", "confidence", "why_shown"],
        )

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
