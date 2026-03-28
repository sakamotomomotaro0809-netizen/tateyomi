"""Common validators."""

from pathlib import Path
from typing import Union

from ..utils import get_logger

logger = get_logger(__name__)


def validate_file_exists(file_path: Union[str, Path]) -> bool:
    """Validate that file exists.

    Args:
        file_path: Path to file

    Returns:
        True if file exists
    """
    path = Path(file_path)
    exists = path.exists()
    if not exists:
        logger.error(f"File does not exist: {file_path}")
    return exists


def validate_file_size(file_path: Union[str, Path], min_size: int = 1, max_size: int = None) -> bool:
    """Validate file size.

    Args:
        file_path: Path to file
        min_size: Minimum size in bytes
        max_size: Maximum size in bytes (optional)

    Returns:
        True if size is valid
    """
    path = Path(file_path)
    if not path.exists():
        logger.error(f"File does not exist: {file_path}")
        return False

    size = path.stat().st_size

    if size < min_size:
        logger.error(f"File too small: {size} < {min_size} bytes")
        return False

    if max_size is not None and size > max_size:
        logger.error(f"File too large: {size} > {max_size} bytes")
        return False

    logger.info(f"File size OK: {size} bytes")
    return True


def validate_not_empty(file_path: Union[str, Path]) -> bool:
    """Validate that file is not empty.

    Args:
        file_path: Path to file

    Returns:
        True if file is not empty
    """
    return validate_file_size(file_path, min_size=1)
