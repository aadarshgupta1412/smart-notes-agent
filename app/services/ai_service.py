"""
Service layer — business logic between routes and the LLM client.
Routes call services. Services call LLMClient. LLMClient calls the provider.
"""

import logging
from typing import AsyncIterator
from app.llm import LLMClient, ChatMessage, ChatResponse, Tier

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a personal knowledge assistant. You help users explore their saved web content (highlights, bookmarks) AND discover new information.

Rules:
- When relevant saved content is provided, prioritize it and cite sources (title + URL).
- When no saved content matches the query, answer from your general knowledge. Be helpful and informative.
- Clearly distinguish between information from saved sources vs general knowledge.
- Be concise but thorough. Use markdown formatting for readability.
- For saved content: use bullet points with source title and URL.
- For general knowledge: provide accurate, educational answers that help the user learn."""

SUMMARY_INSTRUCTION = "Summarize the following web content in 2-3 sentences, capturing the key points."


class ChatService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    async def answer(self, messages: list[ChatMessage], context: str = "", tier: Tier = Tier.FAST) -> ChatResponse:
        system = SYSTEM_PROMPT
        if context:
            system += f"\n\n## User's saved content (use as context):\n\n{context}"
        full = [ChatMessage(role="system", content=system)] + messages
        return await self.llm.chat(full, tier=tier)

    async def stream_answer(
        self, messages: list[ChatMessage], context: str = "", tier: Tier = Tier.FAST
    ) -> AsyncIterator[str]:
        system = SYSTEM_PROMPT
        if context:
            system += f"\n\n## User's saved content (use as context):\n\n{context}"
        full = [ChatMessage(role="system", content=system)] + messages
        async for chunk in self.llm.stream_chat(full, tier=tier):
            yield chunk


class EmbeddingService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    async def embed(self, text: str) -> list[float]:
        return await self.llm.embed(text)


class SummaryService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    async def summarize(self, content: str, max_tokens: int = 200) -> str:
        messages = [
            ChatMessage(role="system", content=SUMMARY_INSTRUCTION),
            ChatMessage(role="user", content=content[:6000]),
        ]
        resp = await self.llm.chat(messages, tier=Tier.FAST, max_tokens=max_tokens)
        return resp.content or "Summary unavailable."
