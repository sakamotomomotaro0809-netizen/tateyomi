"""Test artifact manifest and deterministic replay."""

import pytest
from pathlib import Path
from agent_os import Job
from agent_os.artifacts import ArtifactManifest
from agent_os.utils import save_json


def test_artifact_reuse_when_validated():
    """Test that validated artifacts are reused (not regenerated)."""
    job = Job(task_name="test_reuse", inputs={})
    job.setup_workdir()

    manifest_path = job.workdir / "artifacts/manifest.json"
    manifest = ArtifactManifest(manifest_path)

    # Create test artifact
    artifact_path = job.get_artifact_path("test.json")
    save_json({"test": "data"}, artifact_path)

    # Add to manifest
    manifest.add_artifact(
        key="test.json",
        path=artifact_path,
        producer_step="test_step",
        inputs_used=[],
        validated=True
    )

    # Check should_reuse returns True
    assert manifest.should_reuse("test.json") == True


def test_artifact_not_reused_when_not_validated():
    """Test that unvalidated artifacts are not reused."""
    job = Job(task_name="test_no_reuse", inputs={})
    job.setup_workdir()

    manifest_path = job.workdir / "artifacts/manifest.json"
    manifest = ArtifactManifest(manifest_path)

    # Create test artifact
    artifact_path = job.get_artifact_path("test.json")
    save_json({"test": "data"}, artifact_path)

    # Add to manifest as NOT validated
    manifest.add_artifact(
        key="test.json",
        path=artifact_path,
        producer_step="test_step",
        inputs_used=[],
        validated=False
    )

    # Check should_reuse returns False
    assert manifest.should_reuse("test.json") == False


def test_manifest_includes_hashes():
    """Test that manifest includes SHA256 hashes."""
    job = Job(task_name="test_hash", inputs={})
    job.setup_workdir()

    manifest_path = job.workdir / "artifacts/manifest.json"
    manifest = ArtifactManifest(manifest_path)

    # Create test artifact
    artifact_path = job.get_artifact_path("test.json")
    save_json({"test": "data"}, artifact_path)

    # Add to manifest
    manifest.add_artifact(
        key="test.json",
        path=artifact_path,
        producer_step="test_step",
        inputs_used=[],
        validated=True
    )

    # Check hash is recorded
    artifact = manifest.get_artifact("test.json")
    assert "sha256" in artifact
    assert len(artifact["sha256"]) == 64  # SHA256 hex length
