"""Hashing utilities for deterministic artifact tracking."""

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, Union


def compute_sha256(file_path: Union[str, Path]) -> str:
    """Compute SHA256 hash of a file.

    Args:
        file_path: Path to file

    Returns:
        Hexadecimal hash string
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def compute_input_hash(inputs: Dict[str, Any]) -> str:
    """Compute deterministic hash of input parameters.

    Args:
        inputs: Dictionary of input parameters

    Returns:
        Short hexadecimal hash (first 8 chars)
    """
    # Sort keys for determinism
    sorted_json = json.dumps(inputs, sort_keys=True, ensure_ascii=False)
    hash_obj = hashlib.sha256(sorted_json.encode('utf-8'))
    return hash_obj.hexdigest()[:8]
