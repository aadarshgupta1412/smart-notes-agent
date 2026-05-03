import logging
from typing import AsyncIterator
from app.llm.types import Provider, Tier, LLMConfig, ChatMessage, ChatResponse
from app.llm.providers import (
    openai_provider,
    anthropic_provider,
    google_provider,
    azure_provider,
    mistral_provider,
)

logger = logging.getLogger(__name__)

# Provider → module mapping
_PROVIDERS = {
    Provider.OPENAI: openai_provider,
    Provider.ANTHROPIC: anthropic_provider,
    Provider.GOOGLE: google_provider,
    Provider.AZURE_OPENAI: azure_provider,
    Provider.MISTRAL: mistral_provider,
}


class LLMClient:
    """Dispatches LLM calls to the configured provider."""

    def __init__(self, config: LLMConfig):
        self.config = config
        self._provider = _PROVIDERS.get(config.provider)
        if not self._provider:
            raise ValueError(f"Unknown provider: {config.provider}")
        logger.info(
            f"LLMClient initialized: provider={config.provider.value}, fast={config.fast_model}, strong={config.strong_model}"
        )

    def _model_id(self, tier: Tier) -> str:
        return self.config.fast_model if tier == Tier.FAST else self.config.strong_model

    def _extra_kwargs(self) -> dict:
        if self.config.provider == Provider.AZURE_OPENAI:
            return {
                "endpoint": self.config.azure_endpoint or "",
                "api_version": self.config.azure_api_version,
            }
        return {}

    async def chat(
        self, messages: list[ChatMessage], tier: Tier = Tier.FAST, **kwargs
    ) -> ChatResponse:
        model = self._model_id(tier)
        logger.info(f"chat: provider={self.config.provider.value} model={model}")
        return await self._provider.chat(
            api_key=self.config.api_key,
            model=model,
            messages=messages,
            **self._extra_kwargs(),
            **kwargs,
        )

    async def stream_chat(
        self, messages: list[ChatMessage], tier: Tier = Tier.FAST, **kwargs
    ) -> AsyncIterator[str]:
        model = self._model_id(tier)
        logger.info(f"stream_chat: provider={self.config.provider.value} model={model}")
        gen = self._provider.stream_chat(
            api_key=self.config.api_key,
            model=model,
            messages=messages,
            **self._extra_kwargs(),
            **kwargs,
        )
        async for chunk in gen:
            yield chunk

    async def embed(self, text: str) -> list[float]:
        """Generate embeddings using the configured provider or fallback."""
        import os

        model = self.config.embedding_model

        # If using Azure OpenAI for chat but no embedding model deployed,
        # fall back to Google embeddings if GOOGLE_API_KEY is available
        if self.config.provider == Provider.AZURE_OPENAI:
            google_key = os.getenv("GOOGLE_API_KEY")
            if google_key:
                return await google_provider.embed(
                    api_key=google_key,
                    model="gemini-embedding-001",
                    text=text,
                )
            # Try Azure embedding (may fail if no embedding model deployed)
            return await azure_provider.embed(
                self.config.api_key,
                model=model,
                text=text,
                endpoint=self.config.azure_endpoint or "",
                api_version=self.config.azure_api_version,
            )

        # If using OpenAI, use OpenAI embeddings
        if self.config.provider == Provider.OPENAI:
            return await openai_provider.embed(
                api_key=self.config.api_key,
                model=model,
                text=text,
            )

        # If using Google, use Google embeddings
        if self.config.provider == Provider.GOOGLE:
            return await google_provider.embed(
                api_key=self.config.api_key,
                model="gemini-embedding-001",
                text=text,
            )

        # For other providers, try OpenAI fallback
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            return await openai_provider.embed(
                api_key=openai_key, model=model, text=text
            )

        raise ValueError(
            f"No embedding support for provider {self.config.provider.value}. Set OPENAI_API_KEY or GOOGLE_API_KEY for fallback."
        )
