# AIT42 Tmux Security Module

Centralized security functions for all tmux operations in AIT42.

## Purpose

Prevent security vulnerabilities in tmux session management:
- Command injection attacks
- Path traversal attacks
- Input validation bypass
- Session name collisions

## Modules

### 1. input-validation.sh

Validates all user inputs before tmux operations.

Functions:
- `validate_session_name(name)` - Session name validation
- `validate_working_dir(path)` - Directory path validation
- `validate_timeout(seconds)` - Timeout value validation

### 2. command-sanitization.sh

Sanitizes commands to prevent injection attacks.

Functions:
- `sanitize_command(cmd)` - Command sanitization
- `safe_send_keys(session, cmd)` - Safe tmux send-keys wrapper
- `validate_agent_name(name)` - Agent name validation

## Usage

### In Agent Files

```bash
# Source security modules
SECURITY_DIR="$(dirname "${BASH_SOURCE[0]}")/shared/tmux-security"
source "$SECURITY_DIR/input-validation.sh"
source "$SECURITY_DIR/command-sanitization.sh"

# Use validation functions
if validate_session_name "$SESSION_NAME"; then
    echo "Valid session name"
fi

# Use sanitization
if safe_send_keys "$SESSION_NAME" "echo 'Hello'"; then
    echo "Command sent safely"
fi
```

## Security Principles

1. **Defense in Depth**: Multiple layers of validation
2. **Fail Secure**: Default to rejection on invalid input
3. **Least Privilege**: Minimal permissions required
4. **Input Validation**: Never trust user input
5. **Output Encoding**: Proper quoting and escaping

## Compliance

- OWASP Top 10 Prevention
- CWE-78 (OS Command Injection) Prevention
- CWE-22 (Path Traversal) Prevention

## Version

- Current: 1.0.0
- Updated: 2025-11-03
