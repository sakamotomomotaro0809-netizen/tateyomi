"""LLM client interface (dummy implementation)."""

from typing import Dict, Any, Optional

from ..config import get_config
from ..utils import get_logger

logger = get_logger(__name__)


class LLMClient:
    """LLM client interface."""

    def __init__(self):
        """Initialize LLM client."""
        self.config = get_config()
        self.mode = self.config.llm.mode

        if self.mode == "enabled":
            logger.warning("LLM mode is enabled but no backend is configured")
            logger.warning("Falling back to dummy implementation")

    def generate(self, prompt: str, system: Optional[str] = None) -> str:
        """Generate text from prompt.

        Args:
            prompt: User prompt
            system: System prompt

        Returns:
            Generated text
        """
        if self.mode == "disabled_by_default":
            raise RuntimeError("LLM is disabled. Set llm.mode='enabled' in spec/agent_os.yaml")

        # Dummy implementation
        logger.warning("Using dummy LLM implementation")
        return f"[DUMMY LLM OUTPUT] Prompt: {prompt[:50]}..."

    def is_enabled(self) -> bool:
        """Check if LLM is enabled.

        Returns:
            True if enabled
        """
        return self.mode == "enabled"
