"""Job management (job_id, workdir, paths)."""

import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from .config import get_config
from .utils import compute_input_hash, get_logger

logger = get_logger(__name__)


class Job:
    """Job instance with isolated workdir."""

    def __init__(self, task_name: str, inputs: Dict[str, Any], job_id: Optional[str] = None):
        """Initialize job.

        Args:
            task_name: Task name
            inputs: Input parameters
            job_id: Optional job_id (auto-generated if None)
        """
        self.task_name = task_name
        self.inputs = inputs
        self.config = get_config()

        # Generate job_id if not provided
        if job_id is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            input_hash = compute_input_hash(inputs)
            self.job_id = f"{timestamp}_{input_hash}"
        else:
            self.job_id = job_id

        # Setup workdir
        self.workdir = Path(self.config.paths.job_root_template.format(job_id=self.job_id))
        self.logs_dir = self.workdir / self.config.paths.logs_dir
        self.artifacts_dir = self.workdir / self.config.paths.artifacts_dir
        self.cache_dir = self.workdir / self.config.paths.cache_dir

        logger.info(f"Job initialized: {self.job_id}")
        logger.info(f"  Task: {self.task_name}")
        logger.info(f"  Workdir: {self.workdir}")

    def setup_workdir(self) -> None:
        """Create workdir structure."""
        self.workdir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)
        self.artifacts_dir.mkdir(exist_ok=True)
        self.cache_dir.mkdir(exist_ok=True)
        logger.info(f"Workdir setup complete: {self.workdir}")

    def get_artifact_path(self, artifact_key: str) -> Path:
        """Get path to artifact file.

        Args:
            artifact_key: Artifact key

        Returns:
            Path to artifact file
        """
        return self.artifacts_dir / artifact_key

    def get_log_path(self, log_name: str) -> Path:
        """Get path to log file.

        Args:
            log_name: Log file name

        Returns:
            Path to log file
        """
        return self.logs_dir / log_name

    def get_cache_path(self, cache_key: str) -> Path:
        """Get path to cache file.

        Args:
            cache_key: Cache key

        Returns:
            Path to cache file
        """
        return self.cache_dir / cache_key

    def get_metadata(self) -> Dict[str, Any]:
        """Get job metadata.

        Returns:
            Job metadata dict
        """
        return {
            "job_id": self.job_id,
            "task_name": self.task_name,
            "inputs": self.inputs,
            "workdir": str(self.workdir),
            "python_version": sys.version,
        }
