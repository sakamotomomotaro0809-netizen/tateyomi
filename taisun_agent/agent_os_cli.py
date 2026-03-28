#!/usr/bin/env python3
"""Agent OS CLI - Run, Replay, Distill."""

import argparse
import sys
from pathlib import Path

from agent_os import Job, Runner, get_config, distill_success_patterns
from agent_os.utils import load_yaml, setup_logging, get_logger
from agent_os.steps_builtin import LoadInputStep, SummarizeStep, StubStep

logger = get_logger(__name__)


def load_task_spec(task_path: str) -> dict:
    """Load task specification.

    Args:
        task_path: Path to task YAML

    Returns:
        Task spec dict
    """
    return load_yaml(task_path)


def create_steps_from_spec(task_spec: dict, inputs: dict) -> list:
    """Create Step instances from task spec.

    Args:
        task_spec: Task specification
        inputs: Input parameters

    Returns:
        List of Step instances
    """
    steps = []
    step_classes = {
        "LoadInputStep": LoadInputStep,
        "SummarizeStep": SummarizeStep,
        "StubStep": StubStep,
    }

    for step_config in task_spec["steps"]:
        step_type = step_config["type"]
        step_class = step_classes.get(step_type)

        if not step_class:
            raise ValueError(f"Unknown step type: {step_type}")

        # Replace placeholders in config
        config = step_config.get("config", {})
        for key, value in config.items():
            if isinstance(value, str) and "{" in value:
                # Simple placeholder replacement
                for input_key, input_value in inputs.items():
                    value = value.replace(f"{{{input_key}}}", str(input_value))
                config[key] = value

        # Create step instance
        step = step_class(
            step_id=step_config["id"],
            name=step_config["name"],
            config={
                **config,
                "inputs": step_config.get("inputs", []),
                "outputs": step_config.get("outputs", []),
                "validator": step_config.get("validator", {})
            }
        )

        steps.append(step)

    return steps


def cmd_run(args):
    """Run task.

    Args:
        args: Command arguments
    """
    # Setup logging
    setup_logging()

    logger.info("=" * 60)
    logger.info("Agent OS - Run Task")
    logger.info("=" * 60)

    # Load task spec
    task_spec = load_task_spec(args.task)
    task_name = task_spec["name"]

    # Prepare inputs
    inputs = {}
    if args.input:
        inputs["input_file"] = args.input

    # Create job
    job = Job(task_name=task_name, inputs=inputs)
    job.setup_workdir()

    logger.info(f"Job ID: {job.job_id}")
    logger.info(f"Workdir: {job.workdir}")

    # Create steps
    steps = create_steps_from_spec(task_spec, inputs)

    # Run
    runner = Runner(job, steps)
    result = runner.run_all()

    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("Execution Summary")
    logger.info("=" * 60)
    logger.info(f"Job ID: {result['job_id']}")
    logger.info(f"Steps Total: {result['steps_total']}")
    logger.info(f"Steps Executed: {result['steps_executed']}")
    logger.info(f"Steps Skipped: {result['steps_skipped']}")
    logger.info(f"Steps Failed: {result['steps_failed']}")
    logger.info(f"Success: {result['success']}")

    if not result["success"]:
        logger.error(f"Failed Step: {result['failed_step']}")
        logger.error(f"Error: {result['error']}")
        logger.error(f"\nCheck failure report: {job.workdir}/failure_report.txt")
        sys.exit(1)

    logger.info(f"\nArtifacts: {job.artifacts_dir}")
    logger.info(f"Logs: {job.logs_dir}")
    logger.info(f"Manifest: {job.workdir / 'artifacts/manifest.json'}")


def cmd_replay(args):
    """Replay job (deterministic).

    Args:
        args: Command arguments
    """
    logger.info("Replay not yet implemented")
    sys.exit(1)


def cmd_distill(args):
    """Distill success patterns.

    Args:
        args: Command arguments
    """
    logger.info("Distill not yet implemented")
    sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Agent OS CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command")

    # Run command
    run_parser = subparsers.add_parser("run", help="Run task")
    run_parser.add_argument("--task", required=True, help="Path to task YAML")
    run_parser.add_argument("--input", help="Input file path")
    run_parser.set_defaults(func=cmd_run)

    # Replay command
    replay_parser = subparsers.add_parser("replay", help="Replay job")
    replay_parser.add_argument("--job", required=True, help="Job ID")
    replay_parser.set_defaults(func=cmd_replay)

    # Distill command
    distill_parser = subparsers.add_parser("distill", help="Distill success patterns")
    distill_parser.add_argument("--job", required=True, help="Job ID")
    distill_parser.set_defaults(func=cmd_distill)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
