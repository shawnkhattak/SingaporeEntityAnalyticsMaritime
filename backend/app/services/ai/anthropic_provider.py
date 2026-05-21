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
                "You are the SEAM Singapore Analyst Brief — a morning intelligence note written for a maritime analyst whose desk covers the Singapore Strait, the Port of Singapore (MPA, PSA, Jurong, Tuas, Sembawang, Keppel, Pasir Panjang), Singapore-flagged shipping, and Singapore-registered owners, operators, managers and charterers. "
                "The brief lives at the top of the analyst's day. Within ten seconds they need to know: is anything actionable, what changed, and what to monitor. Write like a desk officer drafting that note — short, plain, decision-supporting. "
                "Scope is Singapore-only. Drop any source item that does not directly involve a Singapore actor, asset, geography, or registry. Do not stretch coverage to manufacture Singapore relevance. "
                "Stay evidence-grounded. Every claim must trace to an article in the fact packet via article_ids. You may interpret severity, escalation, and analyst implications — that is the job — but mark inference language ('sources indicate', 'analyst read', 'on current reporting'). Never fabricate facts, counterparties, or numbers. "
                "Voice: tight maritime intelligence (sanctions match, port-state detention, bunker disruption, MPA enforcement, OFAC designation). No headline hype, no hedging filler. "
                "Output ONLY through the provided tool."
            ),
            "tools": [self._overview_tool()],
            "tool_choice": {"type": "tool", "name": "create_singapore_brief"},
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "Produce the Singapore Analyst Brief from the fact packet below.\n\n"
                        "Sections (return through the tool):\n"
                        "1) headline — ONE sentence (≤ 22 words). The single most consequential Singapore maritime development of the window. Name the actor (port, terminal, regulator, operator, or vessel) and what changed.\n"
                        "2) bottom_line — One short analyst paragraph (≤ 60 words) answering: do I need to act today, what shifted, what to monitor next. Direct, second-person voice optional ('Expect tighter screening at PSA terminals through the week.').\n"
                        "3) watch_items — 3 to 6 prioritised items sorted by severity, then by recency. For each:\n"
                        "   • kind — 'action' (operational change recommended this shift), 'investigate' (open the evidence chain), or 'monitor' (watchlist only).\n"
                        "   • title — ≤ 14 words. Name the Singapore actor/asset and the change.\n"
                        "   • subject — the specific Singapore actor (e.g., 'MPA', 'PSA Tuas', 'Jurong Aromatics', vessel name). Leave null if not single-subject.\n"
                        "   • summary — ≤ 40 words. State what sources say, the analyst implication, and what to watch for next. Lead with the change, not the source name.\n"
                        "   • severity — critical / medium / low / none. SEAM has merged the old 'high' tier into 'critical'; use those four values only.\n"
                        "   • article_ids and evidence_ids must come from the fact packet. The runtime attaches citation URLs from these IDs — do NOT invent them.\n"
                        "4) themes — 3 to 5 thematic buckets of what the Singapore source set is covering. Each carries title (e.g., 'Port & Strait operations', 'Bunker market', 'Screening & enforcement', 'Owners & registry', 'Energy infrastructure'), an article_count from the packet, a one-line one-sentence description that names the dominant Singapore angle, and the article_ids that fall in the bucket.\n"
                        "5) coverage_gaps — ≤ 3 short lines on what the analyst should know is missing this window (e.g., 'No MPA bulletin published in this window', 'Bunker sales coverage limited to a single trade publication').\n\n"
                        "Do NOT populate platform_signals — the runtime fills that section from SEAM database state and overwrites whatever you return.\n\n"
                        "Style rules:\n"
                        "• Name actors. 'PSA Tuas' beats 'a Singapore port'. 'Singapore-flagged VLCC X' beats 'a tanker'.\n"
                        "• Lead with the verb when possible ('MPA detained …', 'PSA paused …', 'OFAC designated …').\n"
                        "• Use direct maritime intelligence vocabulary. Avoid passive 'it was reported that' phrasing.\n"
                        "• If two sources contradict, surface that — 'Trade press reports detention; MPA statement does not confirm'.\n"
                        "• If the source set is thin, say so in coverage_gaps rather than padding.\n\n"
                        "Comparison hint: previous_brief (when present in the packet) lists the last brief's headline and article IDs. Use it to identify what is new vs repeated — but reflect this in the watch_items wording ('previously reported …', 'follow-on to …'), not in a separate field.\n\n"
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
        watch_kinds = ["action", "investigate", "monitor"]
        return {
            "name": "create_singapore_brief",
            "description": "Create an evidence-backed Singapore Analyst Brief from stored news.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "headline": {"type": "string"},
                    "bottom_line": {"type": "string"},
                    "watch_items": {
                        "type": "array",
                        "maxItems": 6,
                        "items": {
                            "type": "object",
                            "properties": {
                                "kind": {"type": "string", "enum": watch_kinds},
                                "title": {"type": "string"},
                                "subject": {"type": ["string", "null"]},
                                "summary": {"type": "string"},
                                "severity": {"type": "string", "enum": severity_levels},
                                "article_ids": {"type": "array", "items": {"type": "integer"}},
                                "evidence_ids": {"type": "array", "items": {"type": "integer"}},
                            },
                            "required": [
                                "kind",
                                "title",
                                "subject",
                                "summary",
                                "severity",
                                "article_ids",
                                "evidence_ids",
                            ],
                            "additionalProperties": False,
                        },
                    },
                    "themes": {
                        "type": "array",
                        "maxItems": 6,
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "article_count": {"type": "integer", "minimum": 0},
                                "one_line": {"type": "string"},
                                "article_ids": {"type": "array", "items": {"type": "integer"}},
                            },
                            "required": ["title", "article_count", "one_line", "article_ids"],
                            "additionalProperties": False,
                        },
                    },
                    "coverage_gaps": {"type": "array", "items": {"type": "string"}, "maxItems": 4},
                },
                "required": [
                    "headline",
                    "bottom_line",
                    "watch_items",
                    "themes",
                    "coverage_gaps",
                ],
                "additionalProperties": False,
            },
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
