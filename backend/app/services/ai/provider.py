from __future__ import annotations

from typing import Any, Protocol

from app.core.config import Settings


class AiProvider(Protocol):
    name: str
    model_name: str

    async def generate_news_overview(self, fact_packet: dict[str, Any]) -> dict[str, Any]:
        ...


async def get_ai_provider(settings: Settings) -> tuple[AiProvider, list[str]]:
    warnings: list[str] = []
    provider = settings.ai_provider.lower().strip()
    if provider == "anthropic":
        if not settings.anthropic_api_key:
            warnings.append("AI_PROVIDER=anthropic configured without ANTHROPIC_API_KEY; falling back to mock provider.")
        else:
            try:
                from app.services.ai.anthropic_provider import AnthropicNewsProvider

                return AnthropicNewsProvider(settings), warnings
            except Exception as exc:  # pragma: no cover - optional dependency path
                warnings.append(f"Anthropic provider unavailable; falling back to mock provider: {exc}")
    elif provider == "openai":
        if not settings.openai_api_key:
            warnings.append("AI_PROVIDER=openai configured without OPENAI_API_KEY; falling back to mock provider.")
        else:
            try:
                from app.services.ai.openai_provider import OpenAiNewsProvider

                return OpenAiNewsProvider(settings), warnings
            except Exception as exc:  # pragma: no cover - optional dependency path
                warnings.append(f"OpenAI provider unavailable; falling back to mock provider: {exc}")
    elif provider != "mock":
        warnings.append(f"Unknown AI_PROVIDER={settings.ai_provider!r}; falling back to mock provider.")

    from app.services.ai.mock_provider import MockNewsProvider

    return MockNewsProvider(settings), warnings
