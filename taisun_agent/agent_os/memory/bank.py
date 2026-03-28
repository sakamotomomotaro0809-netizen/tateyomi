"""Memory Bank (external brain)."""

from pathlib import Path
from typing import Dict, Any

from ..config import get_config
from ..utils import load_yaml, save_yaml, get_logger

logger = get_logger(__name__)


class MemoryBank:
    """Memory Bank - external long-term memory."""

    def __init__(self):
        """Initialize Memory Bank."""
        self.config = get_config()
        self.root = Path(self.config.memory_bank.root)
        self.files = self.config.memory_bank.files

        logger.info(f"Memory Bank initialized: {self.root}")

    def reset_active_context(self) -> None:
        """Reset active context (every job start).

        This implements the "short-term memory reset" requirement.
        """
        active_context_path = self.root / self.files["active_context"]
        active_context_path.parent.mkdir(parents=True, exist_ok=True)

        with open(active_context_path, 'w', encoding='utf-8') as f:
            f.write("# Active Context\n\n")
            f.write("(Reset at job start)\n")

        logger.info("Active context reset")

    def read_project_brief(self) -> str:
        """Read project brief (constitution).

        Returns:
            Project brief text
        """
        path = self.root / self.files["projectbrief"]
        if not path.exists():
            return ""

        with open(path, 'r', encoding='utf-8') as f:
            return f.read()

    def read_system_patterns(self) -> str:
        """Read system patterns (success patterns).

        Returns:
            System patterns text
        """
        path = self.root / self.files["system_patterns"]
        if not path.exists():
            return ""

        with open(path, 'r', encoding='utf-8') as f:
            return f.read()

    def read_policies(self) -> str:
        """Read policies (invariant rules).

        Returns:
            Policies text
        """
        path = self.root / self.files["policies"]
        if not path.exists():
            return ""

        with open(path, 'r', encoding='utf-8') as f:
            return f.read()

    def read_glossary(self) -> Dict[str, Any]:
        """Read glossary (terminology).

        Returns:
            Glossary dict
        """
        path = self.root / self.files["glossary"]
        if not path.exists():
            return {}

        return load_yaml(path)

    def read_preferences(self) -> Dict[str, Any]:
        """Read preferences (formatting, style).

        Returns:
            Preferences dict
        """
        path = self.root / self.files["preferences"]
        if not path.exists():
            return {}

        return load_yaml(path)

    def append_progress(self, entry: str) -> None:
        """Append to progress log.

        Args:
            entry: Progress entry text
        """
        path = self.root / self.files["progress"]
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, 'a', encoding='utf-8') as f:
            f.write(f"\n{entry}\n")

        logger.info("Progress updated")

    def get_memory_context(self) -> str:
        """Get complete memory context for LLM.

        Returns:
            Concatenated memory context
        """
        context_parts = []

        # Project brief
        brief = self.read_project_brief()
        if brief:
            context_parts.append(f"# Project Brief\n{brief}")

        # Policies
        policies = self.read_policies()
        if policies:
            context_parts.append(f"# Policies\n{policies}")

        # System patterns
        patterns = self.read_system_patterns()
        if patterns:
            context_parts.append(f"# System Patterns\n{patterns}")

        return "\n\n".join(context_parts)
