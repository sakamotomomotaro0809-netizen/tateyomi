"""Artifact management (manifest.json)."""

import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

from .config import get_config
from .utils import compute_sha256, load_json, save_json, get_logger

logger = get_logger(__name__)


class ArtifactManifest:
    """Artifact manifest (decision point for deterministic replay)."""

    def __init__(self, manifest_path: Path):
        """Initialize manifest.

        Args:
            manifest_path: Path to manifest.json
        """
        self.manifest_path = manifest_path
        self.config = get_config()
        self.artifacts: Dict[str, Dict[str, Any]] = {}

        # Load existing manifest if exists
        if self.manifest_path.exists():
            logger.info(f"Loading existing manifest: {self.manifest_path}")
            self.artifacts = load_json(self.manifest_path)
        else:
            logger.info(f"Creating new manifest: {self.manifest_path}")

    def add_artifact(
        self,
        key: str,
        path: Path,
        producer_step: str,
        inputs_used: List[str],
        schema_used: Optional[str] = None,
        validated: bool = False,
    ) -> None:
        """Add artifact to manifest.

        Args:
            key: Artifact key
            path: Path to artifact file
            producer_step: Step that produced this artifact
            inputs_used: List of input artifact keys
            schema_used: Schema file used for validation
            validated: Whether artifact passed validation
        """
        artifact_info = {
            "key": key,
            "path": str(path),
            "producer_step": producer_step,
            "inputs_used": inputs_used,
            "schema_used": schema_used,
            "validated": validated,
            "created_at": datetime.now().isoformat(),
        }

        # Add hash if configured
        if self.config.artifacts.include_hashes and path.exists():
            artifact_info["sha256"] = compute_sha256(path)

        # Add tool versions if configured
        if self.config.artifacts.include_tool_versions:
            artifact_info["python_version"] = sys.version

        self.artifacts[key] = artifact_info
        logger.info(f"Added artifact to manifest: {key}")
        self.save()

    def get_artifact(self, key: str) -> Optional[Dict[str, Any]]:
        """Get artifact info.

        Args:
            key: Artifact key

        Returns:
            Artifact info or None
        """
        return self.artifacts.get(key)

    def is_validated(self, key: str) -> bool:
        """Check if artifact is validated.

        Args:
            key: Artifact key

        Returns:
            True if validated
        """
        artifact = self.get_artifact(key)
        return artifact is not None and artifact.get("validated", False)

    def should_reuse(self, key: str) -> bool:
        """Check if artifact should be reused (deterministic replay).

        Args:
            key: Artifact key

        Returns:
            True if should reuse
        """
        if not self.config.artifacts.reuse_if_validated:
            return False

        artifact = self.get_artifact(key)
        if artifact is None:
            return False

        # Check if file exists
        path = Path(artifact["path"])
        if not path.exists():
            logger.warning(f"Artifact file missing: {path}")
            return False

        # Check if validated
        if not artifact.get("validated", False):
            logger.info(f"Artifact not validated, will regenerate: {key}")
            return False

        # Verify hash if configured
        if self.config.artifacts.include_hashes:
            stored_hash = artifact.get("sha256")
            if stored_hash:
                current_hash = compute_sha256(path)
                if current_hash != stored_hash:
                    logger.warning(f"Hash mismatch for {key}, will regenerate")
                    return False

        logger.info(f"Reusing validated artifact: {key}")
        return True

    def mark_validated(self, key: str) -> None:
        """Mark artifact as validated.

        Args:
            key: Artifact key
        """
        if key in self.artifacts:
            self.artifacts[key]["validated"] = True
            logger.info(f"Marked artifact as validated: {key}")
            self.save()

    def save(self) -> None:
        """Save manifest to file."""
        save_json(self.artifacts, self.manifest_path)
        logger.debug(f"Manifest saved: {self.manifest_path}")

    def get_all_artifacts(self) -> Dict[str, Dict[str, Any]]:
        """Get all artifacts.

        Returns:
            All artifacts dict
        """
        return self.artifacts
