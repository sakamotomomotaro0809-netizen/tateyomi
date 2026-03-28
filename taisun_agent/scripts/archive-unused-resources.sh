#!/bin/bash

# TAISUN Agent - Unused Resources Archiver
# 未使用リソースを安全にアーカイブするスクリプト

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
ARCHIVE_DIR="$CLAUDE_DIR/archive"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create archive directories
create_archive_dirs() {
    log_info "Creating archive directories..."

    mkdir -p "$ARCHIVE_DIR/agents"
    mkdir -p "$ARCHIVE_DIR/skills"
    mkdir -p "$ARCHIVE_DIR/commands"
    mkdir -p "$ARCHIVE_DIR/metadata"

    log_success "Archive directories created"
}

# Create metadata file
create_metadata() {
    local metadata_file="$ARCHIVE_DIR/metadata/archive_${TIMESTAMP}.json"

    cat > "$metadata_file" << EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "archived_by": "archive-unused-resources.sh",
  "total_archived": {
    "agents": 0,
    "skills": 0,
    "commands": 0
  },
  "resources": {
    "agents": [],
    "skills": [],
    "commands": []
  }
}
EOF

    echo "$metadata_file"
}

# Archive unused agents
archive_agents() {
    log_info "Archiving unused agents..."

    local count=0
    local agents=(
        "ait42-01-ait42-coordinator-fast"
        "ait42-api-developer"
        "ait42-backup-manager"
        "ait42-bug-fixer"
        "ait42-chaos-engineer"
        "ait42-cicd-manager"
        "ait42-cloud-architect"
        "ait42-code-reviewer"
        "ait42-complexity-analyzer"
        "ait42-config-manager"
        "ait42-container-specialist"
        "ait42-database-designer"
        "ait42-database-developer"
        "ait42-dependency-validator"
        "ait42-devops-engineer"
        "ait42-doc-reviewer"
        "ait42-environment-doctor"
        "ait42-error-recovery-planner"
        "ait42-feature-builder"
        "ait42-feedback-analyzer"
        "ait42-frontend-developer"
        "ait42-implementation-assistant"
        "ait42-incident-responder"
        "ait42-initialization-orchestrator"
        "ait42-innovation-scout"
        "ait42-integration-developer"
        "ait42-integration-planner"
        "ait42-integration-tester"
        "ait42-knowledge-manager"
        "ait42-learning-agent"
        "ait42-log-analyzer"
        "ait42-metrics-collector"
        "ait42-migration-developer"
        "ait42-monitoring-specialist"
        "ait42-multi-agent-competition"
        "ait42-multi-agent-debate"
        "ait42-multi-agent-ensemble"
        "ait42-mutation-tester"
        "ait42-omega-aware-coordinator"
        "ait42-performance-tester"
        "ait42-process-optimizer"
        "ait42-qa-validator"
        "ait42-refactor-specialist"
        "ait42-reflection-agent"
        "ait42-release-manager"
        "ait42-requirements-elicitation"
        "ait42-script-writer"
        "ait42-security-architect"
        "ait42-security-scanner"
        "ait42-security-tester"
        "ait42-self-healing-coordinator"
        "ait42-session-summarizer"
        "ait42-system-architect"
        "ait42-system-diagnostician"
        "ait42-tech-writer"
        "ait42-test-generator"
        "ait42-tmux-command-executor"
        "ait42-tmux-monitor"
        "ait42-tmux-session-creator"
        "ait42-ui-ux-designer"
        "ait42-workflow-coordinator"
        "automation-architect"
        "data-analyst"
        "doc-ops"
        "researcher"
        "security-auditor"
        "sub-code-reviewer"
        "sub-code-searcher"
        "sub-implementer"
        "sub-planner"
        "sub-test-engineer"
        "sub-test-runner-fixer"
    )

    for agent in "${agents[@]}"; do
        local source_file="$CLAUDE_DIR/agents/${agent}.md"
        if [[ -f "$source_file" ]]; then
            mv "$source_file" "$ARCHIVE_DIR/agents/"
            log_success "Archived: $agent"
            ((count++))
        else
            log_warning "Not found: $agent"
        fi
    done

    log_success "Archived $count agents"
    echo "$count"
}

# Archive unused skills
archive_skills() {
    log_info "Archiving unused skills..."

    local count=0
    local skills=(
        "customer-support-120"
        "dual-ai-review"
        "gpt-sovits-tts"
        "phase2-monitoring"
        "taiyo-rewriter"
        "taiyo-style-bullet"
        "taiyo-style-headline"
        "taiyo-style-ps"
        "taiyo-style-vsl"
        "video-transcribe"
        "youtube_channel_summary"
    )

    for skill in "${skills[@]}"; do
        local source_dir="$CLAUDE_DIR/skills/${skill}"
        if [[ -d "$source_dir" ]]; then
            mv "$source_dir" "$ARCHIVE_DIR/skills/"
            log_success "Archived: $skill"
            ((count++))
        else
            log_warning "Not found: $skill"
        fi
    done

    log_success "Archived $count skills"
    echo "$count"
}

# Archive unused commands
archive_commands() {
    log_info "Archiving unused commands..."

    local count=0
    local commands=(
        "analyze-feedback"
        "capture-learning"
        "design-cloud-architecture"
        "develop-api"
        "develop-backend"
        "develop-database"
        "develop-frontend"
        "develop-integration"
        "develop-migration"
        "diagram-insert"
        "gather-requirements"
        "generate-docs"
        "manage-backups"
        "manage-incidents"
        "manage-infrastructure"
        "manage-knowledge"
        "taiyou-init"
        "opencode-setup"
        "optimize-containers"
        "optimize-process"
        "optimize-workflow"
        "plan-integration"
        "review-docs"
        "scout-innovation"
        "test-chaos"
        "test-mutation"
        "test-security"
        "workflow-next"
        "workflow-start"
        "workflow-status"
        "workflow-verify"
        "write-docs"
        "write-script"
    )

    for cmd in "${commands[@]}"; do
        local source_file="$CLAUDE_DIR/commands/${cmd}.md"
        if [[ -f "$source_file" ]]; then
            mv "$source_file" "$ARCHIVE_DIR/commands/"
            log_success "Archived: $cmd"
            ((count++))
        else
            log_warning "Not found: $cmd"
        fi
    done

    log_success "Archived $count commands"
    echo "$count"
}

# Create restore script
create_restore_script() {
    local restore_script="$ARCHIVE_DIR/restore.sh"

    cat > "$restore_script" << 'EOF'
#!/bin/bash

# TAISUN Agent - Archive Restorer
# アーカイブからリソースを復元するスクリプト

set -euo pipefail

ARCHIVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$ARCHIVE_DIR")"

echo "Restoring archived resources..."

# Restore agents
if [[ -d "$ARCHIVE_DIR/agents" ]]; then
    cp -r "$ARCHIVE_DIR/agents/"* "$CLAUDE_DIR/agents/" 2>/dev/null || true
    echo "Agents restored"
fi

# Restore skills
if [[ -d "$ARCHIVE_DIR/skills" ]]; then
    cp -r "$ARCHIVE_DIR/skills/"* "$CLAUDE_DIR/skills/" 2>/dev/null || true
    echo "Skills restored"
fi

# Restore commands
if [[ -d "$ARCHIVE_DIR/commands" ]]; then
    cp -r "$ARCHIVE_DIR/commands/"* "$CLAUDE_DIR/commands/" 2>/dev/null || true
    echo "Commands restored"
fi

echo "Restore complete!"
echo "Note: This does not delete the archive. Run 'rm -rf $ARCHIVE_DIR' to clean up."
EOF

    chmod +x "$restore_script"
    log_success "Restore script created: $restore_script"
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  TAISUN Agent - Resource Archiver"
    echo "=========================================="
    echo ""

    log_info "Starting archive process..."
    log_warning "This will move unused resources to: $ARCHIVE_DIR"
    echo ""

    # Confirm
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Archive cancelled"
        exit 1
    fi

    # Create backup
    log_info "Creating backup..."
    BACKUP_DIR="$PROJECT_ROOT/backups/claude_backup_${TIMESTAMP}"
    mkdir -p "$BACKUP_DIR"
    cp -r "$CLAUDE_DIR" "$BACKUP_DIR/"
    log_success "Backup created: $BACKUP_DIR"

    # Create archive structure
    create_archive_dirs

    # Archive resources
    agents_count=$(archive_agents)
    skills_count=$(archive_skills)
    commands_count=$(archive_commands)

    # Create restore script
    create_restore_script

    # Summary
    echo ""
    echo "=========================================="
    echo "  Archive Summary"
    echo "=========================================="
    echo "Agents archived:   $agents_count"
    echo "Skills archived:   $skills_count"
    echo "Commands archived: $commands_count"
    echo "Total archived:    $((agents_count + skills_count + commands_count))"
    echo ""
    echo "Archive location:  $ARCHIVE_DIR"
    echo "Backup location:   $BACKUP_DIR"
    echo "Restore script:    $ARCHIVE_DIR/restore.sh"
    echo "=========================================="
    echo ""

    log_success "Archive process complete!"
    log_info "To restore: bash $ARCHIVE_DIR/restore.sh"
    log_info "To delete archive permanently: rm -rf $ARCHIVE_DIR"
}

# Run main
main
