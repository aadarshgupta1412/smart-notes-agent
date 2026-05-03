"""
Application Configuration and Logging Setup
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "Smart Notes Agent")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Legacy — only needed if the old Gemini-based agent_service is used
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

logger = logging.getLogger(__name__)
logger.info(f"Configuration loaded for {APP_NAME}")
