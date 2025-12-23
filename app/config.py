"""
Application Configuration and Logging Setup
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Application Settings
APP_NAME = os.getenv("APP_NAME", "Smart Notes Agent")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Validate required configuration
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in .env file")

# Logging Configuration
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
    ]
)

logger = logging.getLogger(__name__)
logger.info(f"Configuration loaded successfully for {APP_NAME}")

