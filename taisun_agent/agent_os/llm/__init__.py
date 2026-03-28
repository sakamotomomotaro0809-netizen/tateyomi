"""LLM interface (optional, disabled by default)."""

from .client import LLMClient
from .structured import generate_structured_output

__all__ = [
    "LLMClient",
    "generate_structured_output",
]
