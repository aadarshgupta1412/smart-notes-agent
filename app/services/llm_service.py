"""
LLM Service - Google Gemini API Integration (Legacy)
For backward compatibility with the existing agent_service.
New code should use app.llm and app.services.ai_service instead.
"""
import logging
import asyncio
from typing import Optional

try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    genai = None
    types = None
    HAS_GENAI = False

from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)


class LLMService:
    """Legacy service for Google Gemini. Use app.llm.LLMClient for new code."""

    def __init__(self):
        if not HAS_GENAI:
            raise ImportError("google-genai package not installed. Install with: pip install google-genai")
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")
        
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.model_name = "gemini-2.5-flash"
        logger.info(f"LLMService initialized with {self.model_name}")

    async def summarize_text(self, text: str, user_query: str = None, retries: int = 3) -> str:
        prompt = format_summarization_prompt(notes_text=text, user_query=user_query)
        
        for attempt in range(retries):
            try:
                response = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
                )
                if response.text:
                    return response.text.strip()
                if attempt < retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))
                    continue
                return "Unable to generate summary."
            except Exception as e:
                logger.warning(f"Gemini API error (attempt {attempt + 1}): {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise

        raise Exception(f"Failed after {retries} attempts")

    async def generate_response(self, prompt: str) -> str:
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
        )
        return response.text.strip() if response.text else ""
