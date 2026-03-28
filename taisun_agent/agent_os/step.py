"""Step abstract class."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, List, Optional

from .utils import get_logger

logger = get_logger(__name__)


class StepContext:
    """Context passed to each step."""

    def __init__(self, job, manifest, memory_bank):
        """Initialize context.

        Args:
            job: Job instance
            manifest: ArtifactManifest instance
            memory_bank: MemoryBank instance
        """
        self.job = job
        self.manifest = manifest
        self.memory_bank = memory_bank
        self.step_data: Dict[str, Any] = {}


class Step(ABC):
    """Abstract step class."""

    def __init__(self, step_id: str, name: str, config: Dict[str, Any]):
        """Initialize step.

        Args:
            step_id: Step ID
            name: Step name
            config: Step configuration
        """
        self.step_id = step_id
        self.name = name
        self.config = config
        self.inputs: List[str] = config.get("inputs", [])
        self.outputs: List[str] = config.get("outputs", [])
        self.validator_config = config.get("validator", {})

    @abstractmethod
    def run(self, ctx: StepContext) -> Dict[str, Any]:
        """Run step logic.

        Args:
            ctx: Step context

        Returns:
            Step result dict
        """
        pass

    def validate(self, ctx: StepContext) -> bool:
        """Validate step outputs (gate).

        Args:
            ctx: Step context

        Returns:
            True if validation passed
        """
        # Default implementation - can be overridden
        if not self.validator_config:
            logger.info(f"No validator configured for {self.step_id}")
            return True

        # Will be implemented by specific validators
        return True

    def on_fail(self, ctx: StepContext, error: Exception) -> Dict[str, str]:
        """Handle step failure.

        Args:
            ctx: Step context
            error: Exception that occurred

        Returns:
            Failure info dict
        """
        return {
            "step_id": self.step_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "suggestion": "Check logs for details"
        }

    def should_skip(self, ctx: StepContext) -> bool:
        """Check if step should be skipped (deterministic replay).

        Args:
            ctx: Step context

        Returns:
            True if should skip
        """
        # Check if all outputs are validated in manifest
        for output_key in self.outputs:
            if not ctx.manifest.should_reuse(output_key):
                return False

        logger.info(f"Skipping {self.step_id} - all outputs validated")
        return True

    def get_input_paths(self, ctx: StepContext) -> Dict[str, Path]:
        """Get input artifact paths.

        Args:
            ctx: Step context

        Returns:
            Dict of input paths
        """
        paths = {}
        for input_key in self.inputs:
            artifact = ctx.manifest.get_artifact(input_key)
            if artifact:
                paths[input_key] = Path(artifact["path"])
        return paths

    def get_output_path(self, ctx: StepContext, output_key: str) -> Path:
        """Get output artifact path.

        Args:
            ctx: Step context
            output_key: Output artifact key

        Returns:
            Path to output artifact
        """
        return ctx.job.get_artifact_path(output_key)
