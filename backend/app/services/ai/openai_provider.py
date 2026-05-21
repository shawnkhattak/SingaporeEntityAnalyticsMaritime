from __future__ import annotations

import importlib

from app.core.config import Settings
from app.services.ai.mock_provider import MockNewsProvider


class OpenAiNewsProvider(MockNewsProvider):
    """Placeholder hook for a future real OpenAI provider."""

    name = "openai"

    def __init__(self, settings: Settings) -> None:
        importlib.import_module("openai")
        super().__init__(settings)
        self.model_name = settings.ai_model or "openai-news-overview"
