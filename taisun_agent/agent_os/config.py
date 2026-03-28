"""Configuration loader (SSOT: spec/agent_os.yaml)."""

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Any

from .utils import load_yaml, get_logger

logger = get_logger(__name__)


@dataclass
class RuntimeConfig:
    """Runtime configuration."""
    python_min: str
    retries_max: int
    stop_on_fail: bool


@dataclass
class PathsConfig:
    """Paths configuration."""
    work_root: str
    job_root_template: str
    logs_dir: str
    artifacts_dir: str
    cache_dir: str


@dataclass
class MemoryBankConfig:
    """Memory bank configuration."""
    root: str
    files: Dict[str, str]


@dataclass
class ArtifactsConfig:
    """Artifacts configuration."""
    manifest_file: str
    include_hashes: bool
    include_tool_versions: bool
    reuse_if_validated: bool


@dataclass
class ValidationConfig:
    """Validation configuration."""
    jsonschema_strict: bool
    fail_fast: bool


@dataclass
class LLMConfig:
    """LLM configuration."""
    mode: str
    structured_output: bool
    max_parse_retries: int


@dataclass
class TasksConfig:
    """Tasks configuration."""
    root: str
    allow_shell: bool
    allow_python: bool


@dataclass
class AgentOSConfig:
    """Complete Agent OS configuration (SSOT)."""
    version: str
    last_updated: str
    runtime: RuntimeConfig
    paths: PathsConfig
    memory_bank: MemoryBankConfig
    artifacts: ArtifactsConfig
    validation: ValidationConfig
    llm: LLMConfig
    tasks: TasksConfig

    @classmethod
    def load(cls, spec_path: str = "spec/agent_os.yaml") -> "AgentOSConfig":
        """Load configuration from SSOT.

        Args:
            spec_path: Path to spec/agent_os.yaml

        Returns:
            AgentOSConfig instance
        """
        logger.info(f"Loading SSOT from {spec_path}")
        data = load_yaml(spec_path)

        return cls(
            version=data["version"],
            last_updated=data["last_updated"],
            runtime=RuntimeConfig(**data["runtime"]),
            paths=PathsConfig(**data["paths"]),
            memory_bank=MemoryBankConfig(**data["memory_bank"]),
            artifacts=ArtifactsConfig(**data["artifacts"]),
            validation=ValidationConfig(**data["validation"]),
            llm=LLMConfig(**data["llm"]),
            tasks=TasksConfig(**data["tasks"]),
        )


# Global config instance
_config: AgentOSConfig = None


def get_config() -> AgentOSConfig:
    """Get global configuration instance.

    Returns:
        AgentOSConfig instance
    """
    global _config
    if _config is None:
        _config = AgentOSConfig.load()
    return _config
