"""
Service layer — business logic between routes and the LLM client.
Routes call services. Services call LLMClient. LLMClient calls the provider.
"""
import logging
from typing import AsyncIterator
from app.llm import LLMClient, ChatMessage, ChatResponse, Tier

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a personal knowledge assistant. Your role is to help the user understand and explore their saved web content (highlights and bookmarks).

Rules:
- Use ONLY the provided source documents to answer questions. Do not make up information.
- Cite which source (title and URL) each part of your answer is based on.
- If the provided sources don't contain relevant information, say so honestly.
- Be concise but thorough. Use markdown formatting for readability.
- When listing sources, use bullet points with the source title and URL."""

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

    async def stream_answer(self, messages: list[ChatMessage], context: str = "", tier: Tier = Tier.FAST) -> AsyncIterator[str]:
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
