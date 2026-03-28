"""Test runner retry and stop behavior."""

import pytest
from pathlib import Path
from agent_os import Job, Runner
from agent_os.step import Step, StepContext
from agent_os.runner import StepExecutionError


class FailingStep(Step):
    """Step that always fails."""

    def run(self, ctx: StepContext):
        raise RuntimeError("Intentional failure")

    def validate(self, ctx: StepContext):
        return False


def test_runner_stops_after_3_failures():
    """Test that runner stops after 3 retry attempts."""
    job = Job(task_name="test_retry", inputs={})
    job.setup_workdir()

    failing_step = FailingStep(
        step_id="test_fail",
        name="Test Failing Step",
        config={"inputs": [], "outputs": ["output.json"]}
    )

    runner = Runner(job, [failing_step])

    # Should raise StepExecutionError after 3 attempts
    with pytest.raises(StepExecutionError) as exc_info:
        runner.run_all()

    # Verify error message mentions 3 attempts
    assert "3 attempts" in str(exc_info.value)

    # Verify failure report was created
    failure_report = job.workdir / "failure_report.txt"
    assert failure_report.exists()


def test_runner_result_contains_failure_info():
    """Test that result dict contains failure information."""
    job = Job(task_name="test_result", inputs={})
    job.setup_workdir()

    failing_step = FailingStep(
        step_id="test_fail",
        name="Test Failing Step",
        config={"inputs": [], "outputs": ["output.json"]}
    )

    runner = Runner(job, [failing_step])

    try:
        result = runner.run_all()
    except StepExecutionError:
        pass

    # Load execution summary
    from agent_os.utils import load_json
    summary = load_json(job.workdir / "execution_summary.json")

    assert summary["success"] == False
    assert summary["failed_step"] == "test_fail"
    assert summary["steps_failed"] >= 1
