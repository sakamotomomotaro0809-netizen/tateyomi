"""Logging configuration for Agent OS."""

import logging
import sys
from pathlib import Path
from typing import Optional


def setup_logging(
    log_file: Optional[Path] = None,
    level: int = logging.INFO,
    format_string: str = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
) -> None:
    """Setup logging configuration.

    Args:
        log_file: Optional path to log file
        level: Logging level
        format_string: Log format string
    """
    handlers = [logging.StreamHandler(sys.stdout)]

    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file, encoding='utf-8'))

    logging.basicConfig(
        level=level,
        format=format_string,
        handlers=handlers
    )


def get_logger(name: str) -> logging.Logger:
    """Get logger instance.

    Args:
        name: Logger name

    Returns:
        Logger instance
    """
    return logging.getLogger(name)
