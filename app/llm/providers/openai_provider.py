from typing import AsyncIterator
from openai import AsyncOpenAI
from app.llm.types import ChatMessage, ChatResponse


def _client(api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key)


async def chat(api_key: str, model: str, messages: list[ChatMessage], **kwargs) -> ChatResponse:
    resp = await _client(api_key).chat.completions.create(
        model=model,
        messages=[{"role": m.role, "content": m.content} for m in messages],
        **kwargs,
    )
    choice = resp.choices[0]
    return ChatResponse(
        content=choice.message.content or "",
        model=resp.model,
        usage={
            "prompt_tokens": resp.usage.prompt_tokens,
            "completion_tokens": resp.usage.completion_tokens,
        }
        if resp.usage
        else {},
    )


async def stream_chat(api_key: str, model: str, messages: list[ChatMessage], **kwargs) -> AsyncIterator[str]:
    stream = await _client(api_key).chat.completions.create(
        model=model,
        messages=[{"role": m.role, "content": m.content} for m in messages],
        stream=True,
        **kwargs,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            yield delta.content


async def embed(api_key: str, model: str, text: str) -> list[float]:
    resp = await _client(api_key).embeddings.create(model=model, input=text[:8000])
    return resp.data[0].embedding
