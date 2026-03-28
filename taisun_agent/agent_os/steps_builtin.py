"""Built-in step implementations for sample tasks."""

from pathlib import Path
from typing import Dict, Any

from .step import Step, StepContext
from .validators import validate_file_exists, validate_file_size, validate_json_schema
from .utils import load_json, save_json, get_logger

logger = get_logger(__name__)


class LoadInputStep(Step):
    """Load input file into artifact."""

    def run(self, ctx: StepContext) -> Dict[str, Any]:
        """Load input file.

        Args:
            ctx: Step context

        Returns:
            Result dict
        """
        input_file = self.config.get("input_file")
        if not input_file:
            raise ValueError("input_file not specified in config")

        input_path = Path(input_file)
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_file}")

        # Read input
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Save as artifact
        output_key = self.outputs[0]
        output_path = self.get_output_path(ctx, output_key)

        artifact_data = {
            "source_file": str(input_path),
            "content": content,
            "length": len(content)
        }

        save_json(artifact_data, output_path)
        logger.info(f"Loaded input: {len(content)} characters")

        return {"status": "success", "length": len(content)}

    def validate(self, ctx: StepContext) -> bool:
        """Validate output.

        Args:
            ctx: Step context

        Returns:
            True if valid
        """
        output_key = self.outputs[0]
        output_path = self.get_output_path(ctx, output_key)

        # Check file exists and not empty
        if not validate_file_exists(output_path):
            return False

        if not validate_file_size(output_path, min_size=10):
            return False

        return True


class SummarizeStep(Step):
    """Summarize text (simple rule-based implementation)."""

    def run(self, ctx: StepContext) -> Dict[str, Any]:
        """Summarize text.

        Args:
            ctx: Step context

        Returns:
            Result dict
        """
        # Load input
        input_paths = self.get_input_paths(ctx)
        input_key = self.inputs[0]
        input_path = input_paths[input_key]

        input_data = load_json(input_path)
        content = input_data["content"]

        # Simple summarization: first N characters + stats
        max_length = self.config.get("max_summary_length", 200)
        summary_text = content[:max_length]
        if len(content) > max_length:
            summary_text += "..."

        summary_data = {
            "summary": summary_text,
            "original_length": len(content),
            "summary_length": len(summary_text),
            "compression_ratio": round(len(summary_text) / len(content), 2) if len(content) > 0 else 0
        }

        # Save output
        output_key = self.outputs[0]
        output_path = self.get_output_path(ctx, output_key)
        save_json(summary_data, output_path)

        logger.info(f"Created summary: {len(summary_text)} characters")

        return {"status": "success", "summary_length": len(summary_text)}

    def validate(self, ctx: StepContext) -> bool:
        """Validate summary.

        Args:
            ctx: Step context

        Returns:
            True if valid
        """
        output_key = self.outputs[0]
        output_path = self.get_output_path(ctx, output_key)

        # Check file exists
        if not validate_file_exists(output_path):
            return False

        # Load and validate content
        try:
            data = load_json(output_path)

            # Check required fields
            if "summary" not in data:
                logger.error("Missing 'summary' field")
                return False

            if "original_length" not in data:
                logger.error("Missing 'original_length' field")
                return False

            # Check summary not empty
            if not data["summary"]:
                logger.error("Summary is empty")
                return False

            logger.info("Summary validation passed")
            return True

        except Exception as e:
            logger.error(f"Summary validation error: {e}")
            return False


class StubStep(Step):
    """Stub step for testing (does nothing but creates output)."""

    def run(self, ctx: StepContext) -> Dict[str, Any]:
        """Run stub step.

        Args:
            ctx: Step context

        Returns:
            Result dict
        """
        logger.info(f"Running stub step: {self.step_id}")

        # Create stub output
        for output_key in self.outputs:
            output_path = self.get_output_path(ctx, output_key)
            stub_data = {
                "step_id": self.step_id,
                "status": "stub",
                "message": f"Stub output for {output_key}"
            }
            save_json(stub_data, output_path)

        return {"status": "success", "mode": "stub"}

    def validate(self, ctx: StepContext) -> bool:
        """Validate stub output.

        Args:
            ctx: Step context

        Returns:
            True if valid
        """
        # Just check all outputs exist
        for output_key in self.outputs:
            output_path = self.get_output_path(ctx, output_key)
            if not validate_file_exists(output_path):
                return False

        return True
