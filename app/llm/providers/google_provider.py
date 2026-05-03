from typing import AsyncIterator
from google import genai
from google.genai import types
from app.llm.types import ChatMessage, ChatResponse


def _client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def _to_contents(messages: list[ChatMessage]) -> tuple[str | None, list[types.Content]]:
    """Split system instruction from conversation."""
    system = None
    contents = []
    for m in messages:
        if m.role == "system":
            system = m.content
        else:
            role = "model" if m.role == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=m.content)]))
    return system, contents


async def chat(api_key: str, model: str, messages: list[ChatMessage], **kwargs) -> ChatResponse:
    client = _client(api_key)
    system, contents = _to_contents(messages)

    config = types.GenerateContentConfig(system_instruction=system) if system else None
    response = await client.aio.models.generate_content(
        model=model,
        contents=contents,
        config=config,
    )
    return ChatResponse(
        content=response.text or "",
        model=model,
        usage={},
    )


async def stream_chat(api_key: str, model: str, messages: list[ChatMessage], **kwargs) -> AsyncIterator[str]:
    client = _client(api_key)
    system, contents = _to_contents(messages)

    config = types.GenerateContentConfig(system_instruction=system) if system else None
    stream = await client.aio.models.generate_content_stream(
        model=model,
        contents=contents,
        config=config,
    )
    async for chunk in stream:
        if chunk.text:
            yield chunk.text


async def embed(api_key: str, model: str, text: str, **kwargs) -> list[float]:
    """Generate embeddings using Google's embedding model."""
    client = _client(api_key)
    response = await client.aio.models.embed_content(
        model=model,
        contents=text[:8000],
    )
    return list(response.embeddings[0].values)
