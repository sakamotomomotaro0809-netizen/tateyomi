#!/bin/bash
#
# Claude Code CI/CD Integration Script
# Based on Anthropic's Best Practices for Headless Mode
#
# Usage:
#   ./scripts/headless/claude-ci.sh <command> [options]
#
# Commands:
#   review      - Run code review on changed files
#   test        - Generate and run tests for changes
#   fix         - Auto-fix linting and type errors
#   migrate     - Large-scale code migration
#   security    - Security scan with auto-remediation
#   changelog   - Generate changelog from commits
#
# Options:
#   --json      - Output in JSON format
#   --verbose   - Verbose output
#   --dry-run   - Show what would be done without executing
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs/ci"
OUTPUT_FORMAT="text"
VERBOSE=false
DRY_RUN=false

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Parse global options
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            OUTPUT_FORMAT="json"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            COMMAND=$1
            shift
            break
            ;;
    esac
done

# Helper functions
log_info() {
    if [ "$OUTPUT_FORMAT" = "text" ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [ "$OUTPUT_FORMAT" = "text" ]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

log_warning() {
    if [ "$OUTPUT_FORMAT" = "text" ]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    if [ "$OUTPUT_FORMAT" = "text" ]; then
        echo -e "${RED}[ERROR]${NC} $1" >&2
    fi
}

# Check if Claude CLI is available
check_claude_cli() {
    if ! command -v claude &> /dev/null; then
        log_error "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
        exit 1
    fi
}

# Run Claude in headless mode with prompt
run_claude_headless() {
    local prompt="$1"
    local output_file="$2"

    if [ "$DRY_RUN" = true ]; then
        log_info "Would run: claude -p \"$prompt\""
        return 0
    fi

    if [ "$VERBOSE" = true ]; then
        log_info "Running Claude with prompt: $prompt"
    fi

    if [ "$OUTPUT_FORMAT" = "json" ]; then
        claude -p "$prompt" --json 2>&1 | tee "$output_file"
    else
        claude -p "$prompt" 2>&1 | tee "$output_file"
    fi
}

# Command: review
# Run code review on changed files
cmd_review() {
    log_info "Running code review on changed files..."

    # Get changed files
    local changed_files=$(git diff --name-only HEAD~1 2>/dev/null || git diff --name-only)

    if [ -z "$changed_files" ]; then
        log_warning "No changed files found"
        return 0
    fi

    log_info "Changed files: $(echo $changed_files | tr '\n' ' ')"

    local output_file="$LOGS_DIR/review-$(date +%Y%m%d-%H%M%S).log"

    run_claude_headless "Review the following changed files for code quality, security issues, and best practices violations. Provide specific line numbers and recommendations.

Files to review:
$changed_files

Focus on:
1. Security vulnerabilities (OWASP Top 10)
2. Performance issues
3. Code style and readability
4. Missing error handling
5. Test coverage gaps

Output format:
- File: <filename>
- Line: <line number>
- Severity: [Critical|High|Medium|Low]
- Issue: <description>
- Recommendation: <fix suggestion>" "$output_file"

    log_success "Review complete. Output saved to: $output_file"
}

# Command: test
# Generate and run tests for changes
cmd_test() {
    log_info "Generating tests for changed files..."

    local changed_files=$(git diff --name-only HEAD~1 -- '*.ts' '*.js' 2>/dev/null || git diff --name-only -- '*.ts' '*.js')

    if [ -z "$changed_files" ]; then
        log_warning "No TypeScript/JavaScript files changed"
        return 0
    fi

    local output_file="$LOGS_DIR/test-gen-$(date +%Y%m%d-%H%M%S).log"

    run_claude_headless "Generate comprehensive tests for the following changed files. Follow the project's testing conventions (Jest).

Files:
$changed_files

Requirements:
1. Unit tests for all public functions
2. Edge case coverage
3. Error scenario tests
4. Mock external dependencies
5. Target 80% coverage

After generating tests, run them and report results." "$output_file"

    log_success "Test generation complete. Output saved to: $output_file"
}

# Command: fix
# Auto-fix linting and type errors
cmd_fix() {
    log_info "Running auto-fix for linting and type errors..."

    local output_file="$LOGS_DIR/fix-$(date +%Y%m%d-%H%M%S).log"

    # First, get current errors
    local lint_errors=$(npm run lint 2>&1 || true)
    local type_errors=$(npm run typecheck 2>&1 || true)

    if [ -z "$lint_errors" ] && [ -z "$type_errors" ]; then
        log_success "No errors to fix"
        return 0
    fi

    run_claude_headless "Fix the following linting and type errors in the codebase. Make minimal changes to fix each issue.

Lint Errors:
$lint_errors

Type Errors:
$type_errors

Instructions:
1. Fix each error with the smallest possible change
2. Do not refactor unrelated code
3. Preserve existing functionality
4. Run lint and typecheck after fixes to verify" "$output_file"

    log_success "Auto-fix complete. Output saved to: $output_file"
}

# Command: migrate
# Large-scale code migration (fan-out pattern)
cmd_migrate() {
    local pattern="$1"
    local replacement="$2"

    if [ -z "$pattern" ] || [ -z "$replacement" ]; then
        log_error "Usage: migrate <pattern> <replacement>"
        log_info "Example: migrate 'oldFunction' 'newFunction'"
        exit 1
    fi

    log_info "Running migration: '$pattern' -> '$replacement'..."

    # Step 1: Generate task list
    local task_file="$LOGS_DIR/migrate-tasks-$(date +%Y%m%d-%H%M%S).json"

    run_claude_headless "List all files that contain '$pattern' and need migration to '$replacement'.
Output as JSON array of objects with fields: file, lineCount, complexity (low/medium/high)" "$task_file"

    # Step 2: Process each file (fan-out pattern)
    if [ "$DRY_RUN" = true ]; then
        log_info "Would process files from: $task_file"
        return 0
    fi

    if [ -f "$task_file" ]; then
        log_info "Processing migration tasks from: $task_file"

        # Parse JSON and process each file
        local files=$(grep -o '"file"[[:space:]]*:[[:space:]]*"[^"]*"' "$task_file" | cut -d'"' -f4)

        for file in $files; do
            local file_output="$LOGS_DIR/migrate-$(basename $file)-$(date +%Y%m%d-%H%M%S).log"

            log_info "Migrating: $file"
            run_claude_headless "Migrate '$pattern' to '$replacement' in file: $file

Requirements:
1. Update all occurrences
2. Update related imports if needed
3. Update tests if they exist
4. Verify no breaking changes" "$file_output"
        done
    fi

    log_success "Migration complete"
}

# Command: security
# Security scan with auto-remediation
cmd_security() {
    log_info "Running security scan with auto-remediation..."

    local output_file="$LOGS_DIR/security-$(date +%Y%m%d-%H%M%S).log"

    # Run Trivy if available
    local trivy_output=""
    if command -v trivy &> /dev/null; then
        trivy_output=$(trivy fs --severity HIGH,CRITICAL . 2>&1 || true)
    fi

    # Run npm audit
    local npm_audit=$(npm audit --json 2>&1 || true)

    run_claude_headless "Analyze the following security scan results and provide remediation steps.

Trivy Scan Results:
$trivy_output

NPM Audit Results:
$npm_audit

For each vulnerability:
1. Assess risk level (Critical/High/Medium/Low)
2. Provide specific fix command or code change
3. Explain potential impact if not fixed
4. Suggest preventive measures

If possible, apply safe automatic fixes (dependency updates, config changes)." "$output_file"

    log_success "Security scan complete. Output saved to: $output_file"
}

# Command: changelog
# Generate changelog from commits
cmd_changelog() {
    local since_tag="${1:-$(git describe --tags --abbrev=0 2>/dev/null || echo 'HEAD~10')}"

    log_info "Generating changelog since: $since_tag..."

    local commits=$(git log --oneline "$since_tag"..HEAD 2>/dev/null || git log --oneline -10)
    local output_file="$LOGS_DIR/changelog-$(date +%Y%m%d-%H%M%S).md"

    run_claude_headless "Generate a professional changelog from the following commits. Follow Keep a Changelog format.

Commits:
$commits

Output format:
## [Unreleased] - $(date +%Y-%m-%d)

### Added
- New features

### Changed
- Changes in existing functionality

### Fixed
- Bug fixes

### Security
- Security improvements

### Deprecated
- Features to be removed

### Removed
- Removed features

Group similar commits and provide clear, user-friendly descriptions." "$output_file"

    log_success "Changelog generated: $output_file"
}

# Pipeline integration mode
cmd_pipeline() {
    log_info "Running full CI pipeline..."

    local pipeline_log="$LOGS_DIR/pipeline-$(date +%Y%m%d-%H%M%S).log"

    {
        echo "=== CI Pipeline Started: $(date) ==="
        echo ""

        # Step 1: Code Review
        echo "### Step 1: Code Review"
        cmd_review
        echo ""

        # Step 2: Auto-fix
        echo "### Step 2: Auto-fix"
        cmd_fix
        echo ""

        # Step 3: Test Generation
        echo "### Step 3: Test Generation"
        cmd_test
        echo ""

        # Step 4: Security Scan
        echo "### Step 4: Security Scan"
        cmd_security
        echo ""

        echo "=== CI Pipeline Completed: $(date) ==="
    } | tee "$pipeline_log"

    log_success "Pipeline complete. Full log: $pipeline_log"
}

# Main execution
check_claude_cli

case "$COMMAND" in
    review)
        cmd_review
        ;;
    test)
        cmd_test
        ;;
    fix)
        cmd_fix
        ;;
    migrate)
        cmd_migrate "$@"
        ;;
    security)
        cmd_security
        ;;
    changelog)
        cmd_changelog "$@"
        ;;
    pipeline)
        cmd_pipeline
        ;;
    *)
        echo "Claude Code CI/CD Integration"
        echo ""
        echo "Usage: $0 [options] <command> [args]"
        echo ""
        echo "Commands:"
        echo "  review              Review changed files for issues"
        echo "  test                Generate and run tests"
        echo "  fix                 Auto-fix linting and type errors"
        echo "  migrate <from> <to> Large-scale code migration"
        echo "  security            Security scan with remediation"
        echo "  changelog [tag]     Generate changelog since tag"
        echo "  pipeline            Run full CI pipeline"
        echo ""
        echo "Options:"
        echo "  --json              Output in JSON format"
        echo "  --verbose           Verbose output"
        echo "  --dry-run           Show what would be done"
        echo ""
        echo "Examples:"
        echo "  $0 review"
        echo "  $0 --json review"
        echo "  $0 migrate 'oldAPI' 'newAPI'"
        echo "  $0 changelog v1.0.0"
        exit 1
        ;;
esac
