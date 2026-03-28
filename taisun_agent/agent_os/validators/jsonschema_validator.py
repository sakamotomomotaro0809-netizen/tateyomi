"""JSON Schema validator."""

from pathlib import Path
from typing import Union

import jsonschema

from ..utils import load_json, get_logger

logger = get_logger(__name__)


def validate_json_schema(data_path: Union[str, Path], schema_path: Union[str, Path], strict: bool = True) -> bool:
    """Validate JSON data against schema.

    Args:
        data_path: Path to JSON data file
        schema_path: Path to JSON schema file
        strict: Strict mode (additional properties not allowed)

    Returns:
        True if validation passed
    """
    try:
        data = load_json(data_path)
        schema = load_json(schema_path)

        # Validate
        jsonschema.validate(instance=data, schema=schema)
        logger.info(f"JSON schema validation passed: {data_path}")
        return True

    except jsonschema.ValidationError as e:
        logger.error(f"JSON schema validation failed: {e.message}")
        logger.error(f"  Path: {e.path}")
        logger.error(f"  Schema path: {e.schema_path}")
        return False

    except Exception as e:
        logger.error(f"JSON schema validation error: {e}")
        return False
