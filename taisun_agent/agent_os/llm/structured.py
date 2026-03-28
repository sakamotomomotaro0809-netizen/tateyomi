"""Structured output generation with JSON schema validation."""

import json
from pathlib import Path
from typing import Dict, Any, Optional

from ..config import get_config
from ..utils import get_logger, load_json
from ..validators import validate_json_schema

logger = get_logger(__name__)


def generate_structured_output(
    prompt: str,
    schema_path: Path,
    system: Optional[str] = None,
    max_retries: int = None
) -> Dict[str, Any]:
    """Generate structured JSON output with schema validation.

    Args:
        prompt: User prompt
        schema_path: Path to JSON schema
        system: System prompt
        max_retries: Max retries (defaults to config)

    Returns:
        Validated JSON dict

    Raises:
        RuntimeError: If LLM is disabled or max retries exceeded
    """
    config = get_config()

    if config.llm.mode == "disabled_by_default":
        raise RuntimeError("LLM is disabled. Set llm.mode='enabled' in spec/agent_os.yaml")

    if max_retries is None:
        max_retries = config.llm.max_parse_retries

    schema = load_json(schema_path)

    # Dummy implementation - would integrate with real LLM
    logger.warning("Using dummy structured output implementation")

    # Return minimal valid JSON matching schema
    return {
        "status": "dummy",
        "message": "LLM integration not implemented"
    }
