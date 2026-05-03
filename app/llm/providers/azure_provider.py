from typing import AsyncIterator
from openai import AsyncAzureOpenAI
from app.llm.types import ChatMessage, ChatResponse


def _client(api_key: str, endpoint: str, api_version: str) -> AsyncAzureOpenAI:
    return AsyncAzureOpenAI(
        api_key=api_key, azure_endpoint=endpoint, api_version=api_version
    )


async def chat(
    api_key: str,
    model: str,
    messages: list[ChatMessage],
    endpoint: str = "",
    api_version: str = "2024-10-21",
    **kwargs,
) -> ChatResponse:
    resp = await _client(api_key, endpoint, api_version).chat.completions.create(
        model=model,
        messages=[{"role": m.role, "content": m.content} for m in messages],
        **kwargs,
    )
    choice = resp.choices[0]
    return ChatResponse(
        content=choice.message.content or "",
        model=resp.model or model,
        usage={
            "prompt_tokens": resp.usage.prompt_tokens,
            "completion_tokens": resp.usage.completion_tokens,
        }
        if resp.usage
        else {},
    )


async def stream_chat(
    api_key: str,
    model: str,
    messages: list[ChatMessage],
    endpoint: str = "",
    api_version: str = "2024-10-21",
    **kwargs,
) -> AsyncIterator[str]:
    stream = await _client(api_key, endpoint, api_version).chat.completions.create(
        model=model,
        messages=[{"role": m.role, "content": m.content} for m in messages],
        stream=True,
        **kwargs,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            yield delta.content


async def embed(
    api_key: str,
    model: str,
    text: str,
    endpoint: str = "",
    api_version: str = "2024-10-21",
) -> list[float]:
    resp = await _client(api_key, endpoint, api_version).embeddings.create(
        model=model, input=text[:8000]
    )
    return resp.data[0].embedding
