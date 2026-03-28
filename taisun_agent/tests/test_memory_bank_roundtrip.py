"""Test memory bank read/write and activeContext reset."""

import pytest
from agent_os.memory import MemoryBank


def test_memory_bank_read_write():
    """Test reading memory bank files."""
    bank = MemoryBank()

    # Test reading (should not error even if empty)
    brief = bank.read_project_brief()
    patterns = bank.read_system_patterns()
    policies = bank.read_policies()

    assert isinstance(brief, str)
    assert isinstance(patterns, str)
    assert isinstance(policies, str)


def test_active_context_reset():
    """Test that activeContext is reset on job start."""
    bank = MemoryBank()

    # Reset active context
    bank.reset_active_context()

    # Read it back
    active_context_path = bank.root / bank.files["active_context"]
    assert active_context_path.exists()

    with open(active_context_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Should contain reset marker
    assert "Reset at job start" in content


def test_progress_append():
    """Test appending to progress log."""
    bank = MemoryBank()

    # Append entry
    test_entry = "Test job completed successfully"
    bank.append_progress(test_entry)

    # Read back
    progress_path = bank.root / bank.files["progress"]
    assert progress_path.exists()

    with open(progress_path, 'r', encoding='utf-8') as f:
        content = f.read()

    assert test_entry in content


def test_memory_context_concatenation():
    """Test get_memory_context combines all sources."""
    bank = MemoryBank()

    context = bank.get_memory_context()

    # Should be a string
    assert isinstance(context, str)

    # If memory files exist, should contain sections
    if bank.read_project_brief():
        assert "# Project Brief" in context
