"""Shell command executor."""

import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from ..utils import get_logger

logger = get_logger(__name__)


def execute_shell(
    command: str,
    workdir: Optional[Path] = None,
    log_file: Optional[Path] = None,
    timeout: int = 300
) -> Dict[str, Any]:
    """Execute shell command.

    Args:
        command: Shell command
        workdir: Working directory
        log_file: Log file path
        timeout: Timeout in seconds

    Returns:
        Execution result dict
    """
    logger.info(f"Executing shell command: {command}")

    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=workdir,
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding='utf-8'
        )

        output = {
            "command": command,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0
        }

        # Write log if specified
        if log_file:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            with open(log_file, 'w', encoding='utf-8') as f:
                f.write(f"Command: {command}\n")
                f.write(f"Return code: {result.returncode}\n")
                f.write(f"\n--- STDOUT ---\n{result.stdout}\n")
                f.write(f"\n--- STDERR ---\n{result.stderr}\n")

        if result.returncode != 0:
            logger.error(f"Command failed with code {result.returncode}")
            logger.error(f"STDERR: {result.stderr}")
        else:
            logger.info("Command succeeded")

        return output

    except subprocess.TimeoutExpired as e:
        logger.error(f"Command timed out after {timeout}s")
        return {
            "command": command,
            "returncode": -1,
            "stdout": "",
            "stderr": f"Timeout after {timeout}s",
            "success": False
        }

    except Exception as e:
        logger.error(f"Command execution error: {e}")
        return {
            "command": command,
            "returncode": -1,
            "stdout": "",
            "stderr": str(e),
            "success": False
        }
