from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Provider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    AZURE_OPENAI = "azure_openai"
    MISTRAL = "mistral"


class Tier(str, Enum):
    FAST = "fast"       # cheap, quick tasks — summaries, classification
    STRONG = "strong"   # complex reasoning, long context
    THINKING = "thinking"  # deep reasoning with extended thinking (Gemini)


@dataclass
class ModelInfo:
    id: str
    provider: Provider
    tier: Tier
    context_window: int
    supports_streaming: bool = True
    supports_embeddings: bool = False


# Curated set — only the best 1-2 per provider per tier
MODEL_REGISTRY: dict[str, ModelInfo] = {
    # OpenAI
    "gpt-4o-mini": ModelInfo("gpt-4o-mini", Provider.OPENAI, Tier.FAST, 128_000),
    "gpt-4o": ModelInfo("gpt-4o", Provider.OPENAI, Tier.STRONG, 128_000),
    "text-embedding-3-small": ModelInfo("text-embedding-3-small", Provider.OPENAI, Tier.FAST, 8_191, supports_streaming=False, supports_embeddings=True),
    "text-embedding-3-large": ModelInfo("text-embedding-3-large", Provider.OPENAI, Tier.STRONG, 8_191, supports_streaming=False, supports_embeddings=True),
    # Anthropic
    "claude-sonnet-4-20250514": ModelInfo("claude-sonnet-4-20250514", Provider.ANTHROPIC, Tier.FAST, 200_000),
    "claude-opus-4-20250514": ModelInfo("claude-opus-4-20250514", Provider.ANTHROPIC, Tier.STRONG, 200_000),
    # Google Gemini 3.x (latest)
    "gemini-3.1-flash-lite-preview": ModelInfo("gemini-3.1-flash-lite-preview", Provider.GOOGLE, Tier.FAST, 1_000_000),
    "gemini-3-flash-preview": ModelInfo("gemini-3-flash-preview", Provider.GOOGLE, Tier.STRONG, 1_000_000),
    "gemini-3-flash-thinking-preview": ModelInfo("gemini-3-flash-thinking-preview", Provider.GOOGLE, Tier.THINKING, 1_000_000),
    # Google Gemini 2.5 (stable)
    "gemini-2.5-flash": ModelInfo("gemini-2.5-flash", Provider.GOOGLE, Tier.FAST, 1_000_000),
    "gemini-2.5-pro": ModelInfo("gemini-2.5-pro", Provider.GOOGLE, Tier.STRONG, 1_000_000),
    "gemini-2.5-flash-thinking": ModelInfo("gemini-2.5-flash-thinking", Provider.GOOGLE, Tier.THINKING, 1_000_000),
    # Google Embeddings
    "text-embedding-004": ModelInfo("text-embedding-004", Provider.GOOGLE, Tier.FAST, 2_048, supports_streaming=False, supports_embeddings=True),
    # Azure OpenAI (same models, different provider path)
    "azure/gpt-4o-mini": ModelInfo("gpt-4o-mini", Provider.AZURE_OPENAI, Tier.FAST, 128_000),
    "azure/gpt-4o": ModelInfo("gpt-4o", Provider.AZURE_OPENAI, Tier.STRONG, 128_000),
    # Mistral
    "mistral-small-latest": ModelInfo("mistral-small-latest", Provider.MISTRAL, Tier.FAST, 128_000),
    "mistral-large-latest": ModelInfo("mistral-large-latest", Provider.MISTRAL, Tier.STRONG, 128_000),
    "mistral-embed": ModelInfo("mistral-embed", Provider.MISTRAL, Tier.FAST, 8_000, supports_streaming=False, supports_embeddings=True),
}


@dataclass
class LLMConfig:
    provider: Provider
    api_key: str
    fast_model: str          # model id for Tier.FAST tasks
    strong_model: str        # model id for Tier.STRONG tasks
    embedding_model: str = "text-embedding-3-small"
    # Azure-specific
    azure_endpoint: Optional[str] = None
    azure_api_version: str = "2024-10-21"


@dataclass
class ChatMessage:
    role: str   # "system" | "user" | "assistant"
    content: str


@dataclass
class ChatResponse:
    content: str
    model: str
    usage: dict = field(default_factory=dict)  # prompt_tokens, completion_tokens
