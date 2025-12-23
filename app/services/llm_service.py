"""
LLM Service - Google Gemini API Integration
Includes comprehensive error handling for API failures
"""
import logging
import time
from typing import Optional, Callable, Any
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from app.prompts.loader import format_summarization_prompt
from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)


class LLMService:
    """
    Service for interacting with Google Gemini API
    Handles AI-powered text generation and summarization
    """

    def __init__(self):
        """
        Initialize Gemini API with comprehensive error handling
        
        Handles:
        - Invalid API key
        - Missing API key
        - Model availability issues
        - Network connectivity problems
        
        Raises:
            ValueError: If API key is invalid or missing
            ConnectionError: If unable to connect to Google API
            Exception: For other initialization failures
        """
        # Validate API key exists
        if not GEMINI_API_KEY:
            error_msg = "GEMINI_API_KEY not found in environment variables. Please check your .env file."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        if len(GEMINI_API_KEY) < 20:  # Basic validation
            error_msg = "GEMINI_API_KEY appears to be invalid (too short). Please check your API key."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            logger.info("Gemini API key configured")
            
            # Try different model names (Google updates these frequently)
            # See: https://ai.google.dev/models/gemini
            # Using only models confirmed to work with v1beta API
            self.model_names = [
                'gemini-2.5-flash',              # ✅ User requested - try first
                'gemini-1.5-flash-8b-latest',    # ✅ Lightweight, fast, latest
                'gemini-1.5-flash-latest',       # ✅ Standard flash, latest
                'gemini-1.5-pro-latest',         # ✅ Pro model, latest
                'models/gemini-1.5-flash',       # ✅ Try with models/ prefix
                'models/gemini-1.5-pro',         # ✅ Pro with models/ prefix
                'gemini-pro',                    # ✅ Legacy stable fallback
            ]
            
            last_error = None
            for model_name in self.model_names:
                try:
                    self.model = genai.GenerativeModel(model_name)
                    logger.info(f"LLMService initialized successfully with Gemini API ({model_name})")
                    self.model_name = model_name
                    break
                except Exception as e:
                    last_error = e
                    logger.warning(f"Model {model_name} not available: {e}")
                    continue
            
            if not hasattr(self, 'model') or self.model is None:
                error_msg = f"No compatible Gemini model found. Last error: {last_error}"
                logger.error(error_msg)
                logger.error("Tried models: " + ", ".join(self.model_names))
                logger.error("Suggestion: Check https://ai.google.dev/gemini-api/docs/models/gemini for valid model names")
                raise ConnectionError(error_msg)
                
        except ValueError:
            # Re-raise validation errors as-is
            raise
        except ConnectionError:
            # Re-raise connection errors as-is
            raise
        except Exception as e:
            error_msg = f"Failed to initialize Gemini API: {e}"
            logger.error(error_msg)
            raise ConnectionError(error_msg)

    async def summarize_text(self, text: str, user_query: str = None, retries: int = 3) -> str:
        """
        Generate a clear, concise summary with comprehensive error handling
        
        Args:
            text: Text content to summarize
            user_query: Original user query for context (e.g., "summarize my first 3 notes")
            retries: Number of retry attempts for transient failures (default: 3)
            
        Returns:
            AI-generated summary
            
        Raises:
            Exception: If API call fails after all retries
        """
        # Load and format prompt from template
        prompt = format_summarization_prompt(notes_text=text, user_query=user_query)
        
        last_error = None
        
        for attempt in range(retries):
            try:
                logger.info(f"Sending summarization request to Gemini API using model '{self.model_name}' (attempt {attempt + 1}/{retries})")
                # Note: safety_settings parameter can be used to adjust content filtering
                # For notes summarization, we use default settings (no explicit safety_settings)
                response = self.model.generate_content(prompt)
                
                # Handle empty responses
                if not response or not response.text:
                    logger.warning("Empty response from Gemini API")
                    if attempt < retries - 1:
                        time.sleep(1 * (attempt + 1))  # Exponential backoff
                        continue
                    return "Unable to generate summary - received empty response from AI service"
                
                summary = response.text.strip()
                logger.info("Successfully received summary from Gemini API")
                return summary

            except google_exceptions.InvalidArgument as e:
                # Invalid API key or request parameters
                error_msg = f"Invalid request to Gemini API: {e}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            except google_exceptions.PermissionDenied as e:
                # API key doesn't have permission or is invalid
                error_msg = f"Permission denied by Gemini API. Please check your API key: {e}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            except google_exceptions.ResourceExhausted as e:
                # Rate limit exceeded - try fallback models
                error_msg = f"Rate limit exceeded on model '{self.model_name}': {e}"
                logger.warning(error_msg)
                
                # Try switching to a different model
                current_index = self.model_names.index(self.model_name)
                if current_index < len(self.model_names) - 1:
                    next_model = self.model_names[current_index + 1]
                    logger.info(f"Switching to fallback model: {next_model}")
                    try:
                        self.model = genai.GenerativeModel(next_model)
                        self.model_name = next_model
                        logger.info(f"Successfully switched to {next_model}")
                        continue  # Retry with new model
                    except Exception as model_error:
                        logger.warning(f"Failed to switch to {next_model}: {model_error}")
                
                # If no more fallback models or switch failed, retry with backoff
                if attempt < retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                    logger.info(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                raise Exception("Rate limit exceeded on all available models. Please try again later.")
            
            except google_exceptions.ServiceUnavailable as e:
                # Google API is down
                error_msg = f"Gemini API is temporarily unavailable: {e}"
                logger.warning(error_msg)
                if attempt < retries - 1:
                    wait_time = 2 ** attempt
                    logger.info(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                raise ConnectionError("Google Gemini API is currently unavailable. Please try again later.")
            
            except google_exceptions.DeadlineExceeded as e:
                # Request timeout
                error_msg = f"Request to Gemini API timed out: {e}"
                logger.warning(error_msg)
                if attempt < retries - 1:
                    logger.info("Retrying with longer timeout...")
                    time.sleep(1)
                    continue
                raise TimeoutError("Request to Gemini API timed out. Please try again.")
            
            except ConnectionError as e:
                # Network connectivity issues
                error_msg = f"Network error connecting to Gemini API: {e}"
                logger.warning(error_msg)
                if attempt < retries - 1:
                    wait_time = 2 ** attempt
                    logger.info(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                raise ConnectionError("Unable to connect to Google Gemini API. Please check your internet connection.")
            
            except Exception as e:
                # Catch-all for unexpected errors (including 404 model not found)
                last_error = e
                error_msg = f"Unexpected error calling Gemini API: {e}"
                logger.error(error_msg)
                
                # If it's a 404 (model not found), try switching to next model
                if "404" in str(e) or "not found" in str(e).lower():
                    current_index = self.model_names.index(self.model_name)
                    if current_index < len(self.model_names) - 1:
                        next_model = self.model_names[current_index + 1]
                        logger.info(f"Model not found. Switching to: {next_model}")
                        try:
                            self.model = genai.GenerativeModel(next_model)
                            self.model_name = next_model
                            logger.info(f"Successfully switched to {next_model}")
                            continue  # Retry with new model immediately
                        except Exception as model_error:
                            logger.warning(f"Failed to switch to {next_model}: {model_error}")
                
                # Otherwise, retry with backoff
                if attempt < retries - 1:
                    logger.info("Retrying...")
                    time.sleep(1)
                    continue
                break
        
        # If we exhausted all retries with unknown error
        raise Exception(f"Failed to generate summary after {retries} attempts. Last error: {last_error}")

    async def generate_response(self, prompt: str) -> str:
        """
        General-purpose text generation (for future extensions)
        
        Args:
            prompt: Input prompt for the AI
            
        Returns:
            AI-generated response
        """
        try:
            logger.info("Sending general prompt to Gemini API")
            response = self.model.generate_content(prompt)
            return response.text.strip() if response and response.text else ""
        except Exception as e:
            logger.error(f"Error in generate_response: {e}")
            raise

