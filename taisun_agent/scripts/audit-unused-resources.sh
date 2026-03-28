#!/bin/bash

# TAISUN Agent - Resource Usage Auditor
# リソース使用状況を監査するスクリプト

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="$PROJECT_ROOT/.claude"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check if a resource is referenced
is_referenced() {
    local resource_name="$1"
    local resource_type="$2"  # agents, skills, commands

    # Search for references in .claude directory (excluding the definition file)
    local count=$(grep -r "$resource_name" "$CLAUDE_DIR" \
        --include="*.md" \
        --include="*.json" \
        --include="*.js" \
        --include="*.sh" \
        2>/dev/null | \
        grep -v "$resource_type/$resource_name" | \
        wc -l)

    # Also search in project root
    local count_root=$(grep -r "$resource_name" "$PROJECT_ROOT" \
        --include="*.md" \
        --include="*.json" \
        --include="*.js" \
        --include="*.sh" \
        --include="*.py" \
        --exclude-dir=".claude" \
        --exclude-dir="node_modules" \
        --exclude-dir=".git" \
        2>/dev/null | wc -l)

    local total=$((count + count_root))

    echo "$total"
}

# Audit agents
audit_agents() {
    echo -e "${CYAN}===========================================\n  AGENT AUDIT\n===========================================${NC}" >&2

    local total=0
    local unused=0
    local low_usage=0

    for agent_file in "$CLAUDE_DIR/agents"/*.md; do
        [[ ! -f "$agent_file" ]] && continue

        local agent_name=$(basename "$agent_file" .md)
        [[ "$agent_name" == "CLAUDE" ]] && continue

        ((total++))

        local refs=$(is_referenced "$agent_name" "agents")

        if [[ $refs -eq 0 ]]; then
            echo -e "${RED}  UNUSED:${NC} $agent_name" >&2
            ((unused++))
        elif [[ $refs -le 2 ]]; then
            echo -e "${YELLOW}  LOW USAGE:${NC} $agent_name (refs: $refs)" >&2
            ((low_usage++))
        fi
    done

    echo "" >&2
    echo -e "${BLUE}Total agents:${NC} $total" >&2
    echo -e "${RED}Unused:${NC} $unused" >&2
    echo -e "${YELLOW}Low usage:${NC} $low_usage" >&2
    echo -e "${GREEN}Active:${NC} $((total - unused - low_usage))" >&2
    echo "" >&2

    # Return unused count (only this goes to stdout)
    echo "$unused"
}

# Audit skills
audit_skills() {
    echo -e "${CYAN}===========================================\n  SKILL AUDIT\n===========================================${NC}" >&2

    local total=0
    local unused=0
    local low_usage=0

    for skill_dir in "$CLAUDE_DIR/skills"/*; do
        [[ ! -d "$skill_dir" ]] && continue

        local skill_name=$(basename "$skill_dir")

        ((total++))

        local refs=$(is_referenced "$skill_name" "skills")

        if [[ $refs -eq 0 ]]; then
            echo -e "${RED}  UNUSED:${NC} $skill_name" >&2
            ((unused++))
        elif [[ $refs -le 2 ]]; then
            echo -e "${YELLOW}  LOW USAGE:${NC} $skill_name (refs: $refs)" >&2
            ((low_usage++))
        fi
    done

    echo "" >&2
    echo -e "${BLUE}Total skills:${NC} $total" >&2
    echo -e "${RED}Unused:${NC} $unused" >&2
    echo -e "${YELLOW}Low usage:${NC} $low_usage" >&2
    echo -e "${GREEN}Active:${NC} $((total - unused - low_usage))" >&2
    echo "" >&2

    # Return unused count (only this goes to stdout)
    echo "$unused"
}

# Audit commands
audit_commands() {
    echo -e "${CYAN}===========================================\n  COMMAND AUDIT\n===========================================${NC}" >&2

    local total=0
    local unused=0
    local low_usage=0

    for cmd_file in "$CLAUDE_DIR/commands"/*.md; do
        [[ ! -f "$cmd_file" ]] && continue

        local cmd_name=$(basename "$cmd_file" .md)
        [[ "$cmd_name" == "CLAUDE" ]] && continue

        ((total++))

        local refs=$(is_referenced "$cmd_name" "commands")

        if [[ $refs -eq 0 ]]; then
            echo -e "${RED}  UNUSED:${NC} $cmd_name" >&2
            ((unused++))
        elif [[ $refs -le 2 ]]; then
            echo -e "${YELLOW}  LOW USAGE:${NC} $cmd_name (refs: $refs)" >&2
            ((low_usage++))
        fi
    done

    echo "" >&2
    echo -e "${BLUE}Total commands:${NC} $total" >&2
    echo -e "${RED}Unused:${NC} $unused" >&2
    echo -e "${YELLOW}Low usage:${NC} $low_usage" >&2
    echo -e "${GREEN}Active:${NC} $((total - unused - low_usage))" >&2
    echo "" >&2

    # Return unused count (only this goes to stdout)
    echo "$unused"
}

# Check for duplicate files
check_duplicates() {
    echo -e "${CYAN}===========================================\n  DUPLICATE FILE CHECK\n===========================================${NC}"

    # Find duplicate filenames
    find "$CLAUDE_DIR" -type f -name "*.md" | \
        xargs -I {} basename {} | \
        sort | \
        uniq -d | \
        while read -r filename; do
            echo -e "${YELLOW}  DUPLICATE:${NC} $filename"
            find "$CLAUDE_DIR" -type f -name "$filename" | sed 's/^/    /'
            echo ""
        done
}

# Check for orphaned files
check_orphans() {
    echo -e "${CYAN}===========================================\n  ORPHANED FILE CHECK\n===========================================${NC}"

    # Check for skills without definition files
    local orphaned=0

    for skill_dir in "$CLAUDE_DIR/skills"/*; do
        [[ ! -d "$skill_dir" ]] && continue

        if [[ ! -f "$skill_dir/skill.md" ]] && [[ ! -f "$skill_dir/SKILL.md" ]]; then
            echo -e "${RED}  MISSING DEFINITION:${NC} $(basename "$skill_dir")"
            ((orphaned++))
        fi
    done

    if [[ $orphaned -eq 0 ]]; then
        echo -e "${GREEN}  No orphaned skills found${NC}"
    else
        echo ""
        echo -e "${RED}Total orphaned skills:${NC} $orphaned"
    fi

    echo ""
}

# Generate JSON report
generate_json_report() {
    local agents_unused="$1"
    local skills_unused="$2"
    local commands_unused="$3"

    local report_file="$PROJECT_ROOT/resource_audit_$(date +%Y%m%d_%H%M%S).json"

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "agents": {
      "total": $(ls "$CLAUDE_DIR/agents"/*.md 2>/dev/null | grep -v CLAUDE | wc -l),
      "unused": $agents_unused
    },
    "skills": {
      "total": $(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d | tail -n +2 | wc -l),
      "unused": $skills_unused
    },
    "commands": {
      "total": $(ls "$CLAUDE_DIR/commands"/*.md 2>/dev/null | grep -v CLAUDE | wc -l),
      "unused": $commands_unused
    }
  }
}
EOF

    echo "$report_file"
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  TAISUN Agent - Resource Auditor"
    echo "=========================================="
    echo ""
    echo "Auditing resource usage..."
    echo ""

    # Run audits
    agents_unused=$(audit_agents)
    skills_unused=$(audit_skills)
    commands_unused=$(audit_commands)

    # Additional checks
    check_duplicates
    check_orphans

    # Summary
    local total_unused=$((agents_unused + skills_unused + commands_unused))

    echo -e "${CYAN}===========================================\n  SUMMARY\n===========================================${NC}"
    echo -e "${BLUE}Total unused resources:${NC} $total_unused"
    echo ""

    if [[ $total_unused -gt 0 ]]; then
        echo -e "${YELLOW}Recommendation:${NC} Run './scripts/archive-unused-resources.sh' to clean up"
    else
        echo -e "${GREEN}All resources are being used!${NC}"
    fi

    # Generate JSON report
    report_file=$(generate_json_report "$agents_unused" "$skills_unused" "$commands_unused")
    echo ""
    echo -e "${BLUE}JSON report:${NC} $report_file"
    echo ""
}

# Run main
main
