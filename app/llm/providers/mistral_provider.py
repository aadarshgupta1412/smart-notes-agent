from typing import AsyncIterator
from mistralai.client import Mistral
from app.llm.types import ChatMessage, ChatResponse


def _client(api_key: str) -> Mistral:
    return Mistral(api_key=api_key)


async def chat(
    api_key: str, model: str, messages: list[ChatMessage], **kwargs
) -> ChatResponse:
    resp = await _client(api_key).chat.complete_async(
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
    api_key: str, model: str, messages: list[ChatMessage], **kwargs
) -> AsyncIterator[str]:
    resp = await _client(api_key).chat.stream_async(
        model=model,
        messages=[{"role": m.role, "content": m.content} for m in messages],
        **kwargs,
    )
    async for event in resp:
        delta = event.data.choices[0].delta if event.data.choices else None
        if delta and delta.content:
            yield delta.content
