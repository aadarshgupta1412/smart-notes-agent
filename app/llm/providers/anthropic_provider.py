from typing import AsyncIterator
from anthropic import AsyncAnthropic
from app.llm.types import ChatMessage, ChatResponse


def _client(api_key: str) -> AsyncAnthropic:
    return AsyncAnthropic(api_key=api_key)


def _split_system(messages: list[ChatMessage]) -> tuple[str | None, list[dict]]:
    """Anthropic takes system as a top-level param, not in messages."""
    system = None
    msgs = []
    for m in messages:
        if m.role == "system":
            system = m.content
        else:
            msgs.append({"role": m.role, "content": m.content})
    return system, msgs


async def chat(
    api_key: str, model: str, messages: list[ChatMessage], **kwargs
) -> ChatResponse:
    system, msgs = _split_system(messages)
    kwargs.setdefault("max_tokens", 4096)
    resp = await _client(api_key).messages.create(
        model=model,
        system=system or "",
        messages=msgs,
        **kwargs,
    )
    return ChatResponse(
        content=resp.content[0].text if resp.content else "",
        model=resp.model,
        usage={
            "prompt_tokens": resp.usage.input_tokens,
            "completion_tokens": resp.usage.output_tokens,
        },
    )


async def stream_chat(
    api_key: str, model: str, messages: list[ChatMessage], **kwargs
) -> AsyncIterator[str]:
    system, msgs = _split_system(messages)
    kwargs.setdefault("max_tokens", 4096)
    async with _client(api_key).messages.stream(
        model=model,
        system=system or "",
        messages=msgs,
        **kwargs,
    ) as stream:
        async for text in stream.text_stream:
            yield text
