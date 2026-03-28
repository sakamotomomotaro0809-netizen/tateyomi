"""Success pattern distillation."""

from pathlib import Path
from typing import Dict, Any

from ..utils import get_logger

logger = get_logger(__name__)


def distill_success_patterns(
    job,
    manifest,
    output_path: Path
) -> str:
    """Distill success patterns from job execution.

    This generates a PROPOSAL for systemPatterns update.
    Does NOT auto-apply (safety).

    Args:
        job: Job instance
        manifest: ArtifactManifest instance
        output_path: Path to save proposal

    Returns:
        Proposal text
    """
    logger.info("Distilling success patterns")

    # Collect job metadata
    metadata = job.get_metadata()
    artifacts = manifest.get_all_artifacts()

    # Count validated artifacts
    validated_count = sum(1 for a in artifacts.values() if a.get("validated", False))
    total_count = len(artifacts)

    # Generate proposal
    proposal_lines = [
        "# Success Pattern Proposal",
        f"\n## Job: {metadata['task_name']} ({metadata['job_id']})",
        f"\n### Outcomes",
        f"- Artifacts created: {total_count}",
        f"- Artifacts validated: {validated_count}",
    ]

    # Add artifact list
    if artifacts:
        proposal_lines.append("\n### Artifacts")
        for key, artifact in artifacts.items():
            status = "✓" if artifact.get("validated") else "✗"
            proposal_lines.append(f"- {status} {key} ({artifact['producer_step']})")

    # Add suggested pattern
    proposal_lines.extend([
        "\n### Suggested Pattern",
        f"**Task Type**: {metadata['task_name']}",
        f"**Success Criteria**: {validated_count}/{total_count} artifacts validated",
        "",
        "**Abstracted Steps**:",
        "(Edit this section to describe the general pattern, removing specific file names/content)",
    ])

    proposal = "\n".join(proposal_lines)

    # Save proposal
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(proposal)

    logger.info(f"Success pattern proposal saved: {output_path}")

    return proposal
