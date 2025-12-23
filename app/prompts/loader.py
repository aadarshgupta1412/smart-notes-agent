"""
Prompt loader utility for managing AI prompts
"""
import os
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent


def load_prompt(prompt_name: str) -> str:
    """
    Load a prompt template from the prompts directory
    
    Args:
        prompt_name: Name of the prompt file (without .txt extension)
        
    Returns:
        Prompt template as string
        
    Raises:
        FileNotFoundError: If prompt file doesn't exist
    """
    prompt_path = PROMPTS_DIR / f"{prompt_name}.txt"
    
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
    
    with open(prompt_path, 'r', encoding='utf-8') as f:
        return f.read()


def format_summarization_prompt(notes_text: str, user_query: str = None) -> str:
    """
    Format the summarization prompt with context
    
    Args:
        notes_text: Formatted notes text to summarize
        user_query: Optional user query for context-aware summarization
        
    Returns:
        Formatted prompt ready for LLM
    """
    if user_query:
        template = load_prompt("summarization_with_context")
        return template.format(
            user_query=user_query,
            notes_text=notes_text
        )
    else:
        template = load_prompt("summarization")
        return template.format(
            context_section="",
            notes_text=notes_text,
            context_instruction=""
        )

