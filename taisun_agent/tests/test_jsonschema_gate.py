"""Test JSON schema validation gate."""

import pytest
from pathlib import Path
from agent_os.validators import validate_json_schema
from agent_os.utils import save_json


def test_jsonschema_validation_passes():
    """Test that valid JSON passes schema validation."""
    # Create test data
    data_path = Path("work/test_data.json")
    data = {
        "step_id": "test",
        "status": "success",
        "validated": True
    }
    save_json(data, data_path)

    # Create simple schema
    schema_path = Path("work/test_schema.json")
    schema = {
        "type": "object",
        "properties": {
            "step_id": {"type": "string"},
            "status": {"type": "string"},
            "validated": {"type": "boolean"}
        },
        "required": ["step_id", "status", "validated"]
    }
    save_json(schema, schema_path)

    # Validate
    assert validate_json_schema(data_path, schema_path) == True

    # Cleanup
    data_path.unlink(missing_ok=True)
    schema_path.unlink(missing_ok=True)


def test_jsonschema_validation_fails():
    """Test that invalid JSON fails schema validation."""
    # Create invalid data (missing required field)
    data_path = Path("work/test_data_invalid.json")
    data = {
        "step_id": "test"
        # Missing "status" and "validated"
    }
    save_json(data, data_path)

    # Create schema
    schema_path = Path("work/test_schema.json")
    schema = {
        "type": "object",
        "properties": {
            "step_id": {"type": "string"},
            "status": {"type": "string"},
            "validated": {"type": "boolean"}
        },
        "required": ["step_id", "status", "validated"]
    }
    save_json(schema, schema_path)

    # Validate (should fail)
    assert validate_json_schema(data_path, schema_path) == False

    # Cleanup
    data_path.unlink(missing_ok=True)
    schema_path.unlink(missing_ok=True)


def test_jsonschema_type_mismatch():
    """Test that type mismatches are caught."""
    # Create data with wrong type
    data_path = Path("work/test_data_type.json")
    data = {
        "step_id": "test",
        "status": "success",
        "validated": "true"  # String instead of boolean
    }
    save_json(data, data_path)

    # Create schema
    schema_path = Path("work/test_schema.json")
    schema = {
        "type": "object",
        "properties": {
            "step_id": {"type": "string"},
            "status": {"type": "string"},
            "validated": {"type": "boolean"}
        },
        "required": ["step_id", "status", "validated"]
    }
    save_json(schema, schema_path)

    # Validate (should fail due to type mismatch)
    assert validate_json_schema(data_path, schema_path) == False

    # Cleanup
    data_path.unlink(missing_ok=True)
    schema_path.unlink(missing_ok=True)
