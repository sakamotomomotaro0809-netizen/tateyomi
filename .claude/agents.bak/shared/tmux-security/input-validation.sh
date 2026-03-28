#!/usr/bin/env bash
# AIT42 Tmux Security Module: Input Validation
# Version: 1.0.0
# Purpose: Centralized input validation for all tmux operations

set -euo pipefail

# Validate session name
# Args: $1 - session name
# Returns: 0 if valid, 1 if invalid
validate_session_name() {
    local session_name="$1"

    # Empty check
    if [[ -z "$session_name" ]]; then
        echo "Error: Session name cannot be empty" >&2
        return 1
    fi

    # Length check (max 100 chars)
    if [[ ${#session_name} -gt 100 ]]; then
        echo "Error: Session name too long (max 100 chars)" >&2
        return 1
    fi

    # Character validation (alphanumeric, hyphen, underscore only)
    if [[ ! "$session_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        echo "Error: Session name contains invalid characters (only a-z, A-Z, 0-9, -, _ allowed)" >&2
        return 1
    fi

    # Reserved names check
    local reserved_names=("default" "main" "root" "admin")
    for reserved in "${reserved_names[@]}"; do
        if [[ "$session_name" == "$reserved" ]]; then
            echo "Error: Session name '$session_name' is reserved" >&2
            return 1
        fi
    done

    return 0
}

# Validate working directory
# Args: $1 - directory path
# Returns: 0 if valid, 1 if invalid, stdout: absolute path
validate_working_dir() {
    local dir="$1"

    # Empty check
    if [[ -z "$dir" ]]; then
        echo "Error: Working directory cannot be empty" >&2
        return 1
    fi

    # Existence check
    if [[ ! -d "$dir" ]]; then
        echo "Error: Directory does not exist: $dir" >&2
        return 1
    fi

    # Convert to absolute path
    local abs_path
    abs_path=$(realpath "$dir" 2>/dev/null) || {
        echo "Error: Cannot resolve absolute path for: $dir" >&2
        return 1
    }

    # Path traversal attack check
    if [[ "$abs_path" =~ \.\. ]]; then
        echo "Error: Path traversal detected: $dir" >&2
        return 1
    fi

    # Home directory boundary check (optional security layer)
    if [[ ! "$abs_path" =~ ^"$HOME" ]]; then
        echo "Warning: Accessing directory outside home: $abs_path" >&2
    fi

    echo "$abs_path"
    return 0
}

# Validate timeout value
# Args: $1 - timeout in seconds
# Returns: 0 if valid, 1 if invalid
validate_timeout() {
    local timeout="$1"

    # Numeric check
    if ! [[ "$timeout" =~ ^[0-9]+$ ]]; then
        echo "Error: Timeout must be a positive integer" >&2
        return 1
    fi

    # Range check (1 second to 1 hour)
    if [[ "$timeout" -lt 1 || "$timeout" -gt 3600 ]]; then
        echo "Error: Timeout must be between 1 and 3600 seconds" >&2
        return 1
    fi

    return 0
}

# Export functions for use in other scripts
export -f validate_session_name
export -f validate_working_dir
export -f validate_timeout
