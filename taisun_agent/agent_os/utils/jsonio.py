"""JSON and YAML I/O with UTF-8 encoding."""

import json
from pathlib import Path
from typing import Any, Dict, Union

import yaml


def load_json(file_path: Union[str, Path]) -> Dict[str, Any]:
    """Load JSON file with UTF-8 encoding.

    Args:
        file_path: Path to JSON file

    Returns:
        Parsed JSON object
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(data: Dict[str, Any], file_path: Union[str, Path], indent: int = 2) -> None:
    """Save JSON file with UTF-8 encoding.

    Args:
        data: Data to save
        file_path: Path to JSON file
        indent: Indentation level
    """
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)


def load_yaml(file_path: Union[str, Path]) -> Dict[str, Any]:
    """Load YAML file with UTF-8 encoding.

    Args:
        file_path: Path to YAML file

    Returns:
        Parsed YAML object
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def save_yaml(data: Dict[str, Any], file_path: Union[str, Path]) -> None:
    """Save YAML file with UTF-8 encoding.

    Args:
        data: Data to save
        file_path: Path to YAML file
    """
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
