"""Step runner (execution engine with retry/gate logic)."""

from typing import List, Dict, Any
from pathlib import Path

from .config import get_config
from .job import Job
from .artifacts import ArtifactManifest
from .memory import MemoryBank
from .step import Step, StepContext
from .utils import get_logger, save_json

logger = get_logger(__name__)


class StepExecutionError(Exception):
    """Step execution failed."""
    pass


class Runner:
    """Step execution runner with TDO (Test-Driven Operations)."""

    def __init__(self, job: Job, steps: List[Step]):
        """Initialize runner.

        Args:
            job: Job instance
            steps: List of steps to execute
        """
        self.job = job
        self.steps = steps
        self.config = get_config()

        # Setup manifest and memory
        manifest_path = job.workdir / self.config.artifacts.manifest_file
        self.manifest = ArtifactManifest(manifest_path)

        self.memory_bank = MemoryBank()
        self.memory_bank.reset_active_context()

        self.ctx = StepContext(job, self.manifest, self.memory_bank)

        logger.info(f"Runner initialized with {len(steps)} steps")

    def run_all(self) -> Dict[str, Any]:
        """Run all steps.

        Returns:
            Execution summary
        """
        logger.info("Starting step execution")

        results = {
            "job_id": self.job.job_id,
            "steps_total": len(self.steps),
            "steps_executed": 0,
            "steps_skipped": 0,
            "steps_failed": 0,
            "success": True,
            "error": None,
            "failed_step": None
        }

        for step in self.steps:
            logger.info(f"\n{'=' * 60}")
            logger.info(f"Step: {step.step_id} - {step.name}")
            logger.info(f"{'=' * 60}")

            try:
                # Check if should skip (deterministic replay)
                if step.should_skip(self.ctx):
                    results["steps_skipped"] += 1
                    logger.info(f"Skipped {step.step_id}")
                    continue

                # Execute step with retry logic
                self._execute_step_with_retry(step)
                results["steps_executed"] += 1

            except StepExecutionError as e:
                logger.error(f"Step {step.step_id} failed: {e}")
                results["success"] = False
                results["error"] = str(e)
                results["failed_step"] = step.step_id
                results["steps_failed"] += 1

                if self.config.runtime.stop_on_fail:
                    logger.error("Stopping execution (stop_on_fail=true)")
                    break

        # Save execution summary
        summary_path = self.job.workdir / "execution_summary.json"
        save_json(results, summary_path)

        return results

    def _execute_step_with_retry(self, step: Step) -> None:
        """Execute step with retry logic (max 3 attempts).

        Args:
            step: Step to execute

        Raises:
            StepExecutionError: If step fails after max retries
        """
        max_retries = self.config.runtime.retries_max
        attempt = 0

        while attempt < max_retries:
            attempt += 1
            logger.info(f"Attempt {attempt}/{max_retries}")

            try:
                # Run step
                result = step.run(self.ctx)
                logger.info(f"Step execution completed")

                # Register outputs in manifest
                for output_key in step.outputs:
                    output_path = step.get_output_path(self.ctx, output_key)
                    if output_path.exists():
                        self.manifest.add_artifact(
                            key=output_key,
                            path=output_path,
                            producer_step=step.step_id,
                            inputs_used=step.inputs,
                            validated=False
                        )

                # Validate (GATE)
                if not self._validate_step(step):
                    logger.error(f"Validation failed for {step.step_id}")

                    if attempt >= max_retries:
                        # Max retries exceeded - STOP
                        self._generate_failure_report(step, attempt)
                        raise StepExecutionError(
                            f"Step {step.step_id} failed validation after {max_retries} attempts"
                        )

                    logger.warning(f"Retrying {step.step_id} (attempt {attempt + 1}/{max_retries})")
                    continue

                # Validation passed
                logger.info(f"✓ Step {step.step_id} validated successfully")
                for output_key in step.outputs:
                    self.manifest.mark_validated(output_key)

                return

            except Exception as e:
                logger.error(f"Step execution error: {e}")

                if attempt >= max_retries:
                    self._generate_failure_report(step, attempt, error=e)
                    raise StepExecutionError(
                        f"Step {step.step_id} failed after {max_retries} attempts: {e}"
                    )

                logger.warning(f"Retrying {step.step_id} (attempt {attempt + 1}/{max_retries})")

    def _validate_step(self, step: Step) -> bool:
        """Validate step outputs.

        Args:
            step: Step to validate

        Returns:
            True if validation passed
        """
        logger.info(f"Validating {step.step_id}")

        try:
            return step.validate(self.ctx)
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False

    def _generate_failure_report(
        self,
        step: Step,
        attempts: int,
        error: Exception = None
    ) -> None:
        """Generate failure report (anti-apology measure).

        Args:
            step: Failed step
            attempts: Number of attempts
            error: Exception (if any)
        """
        report_path = self.job.workdir / "failure_report.txt"

        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(f"Step Execution Failure Report\n")
            f.write(f"{'=' * 60}\n\n")
            f.write(f"Failed Step: {step.step_id} - {step.name}\n")
            f.write(f"Attempts: {attempts}\n")
            f.write(f"Max Retries: {self.config.runtime.retries_max}\n\n")

            if error:
                f.write(f"Error Type: {type(error).__name__}\n")
                f.write(f"Error Message: {str(error)}\n\n")

            f.write(f"Required User Actions:\n")
            f.write(f"1. Check logs in: {self.job.logs_dir}\n")
            f.write(f"2. Review step configuration in task YAML\n")
            f.write(f"3. Verify inputs: {', '.join(step.inputs)}\n")
            f.write(f"4. Check dependencies/permissions\n")
            f.write(f"5. Review validation criteria\n")

        logger.error(f"Failure report generated: {report_path}")
        logger.error("EXECUTION STOPPED - Fix issues and retry")
