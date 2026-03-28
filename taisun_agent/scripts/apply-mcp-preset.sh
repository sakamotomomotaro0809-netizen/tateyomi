#!/usr/bin/env bash
# Apply MCP preset to .claude/settings.json
# Usage: bash scripts/apply-mcp-preset.sh [development|marketing|research]

set -euo pipefail

PRESET="${1:-}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SETTINGS="$PROJECT_DIR/.claude/settings.json"
PRESETS_DIR="$PROJECT_DIR/.claude/presets"

if [ -z "$PRESET" ] || [ ! -f "$PRESETS_DIR/$PRESET.json" ]; then
    echo "Usage: bash scripts/apply-mcp-preset.sh [development|marketing|research]"
    echo ""
    echo "Available presets:"
    for f in "$PRESETS_DIR"/*.json; do
        name=$(basename "$f" .json)
        count=$(python3 -c "import json; d=json.load(open('$f')); print(d.get('activeMcpCount', '?'))")
        echo "  $name (${count} active MCPs)"
    done
    exit 1
fi

PRESET_FILE="$PRESETS_DIR/$PRESET.json"

# Extract disabledMcpServers array from preset
DISABLED=$(python3 -c "
import json
preset = json.load(open('$PRESET_FILE'))
settings = json.load(open('$SETTINGS'))
settings['disabledMcpServers'] = preset['disabledMcpServers']
print(json.dumps(settings, indent=2, ensure_ascii=False))
")

echo "$DISABLED" > "$SETTINGS"

ACTIVE=$(python3 -c "import json; d=json.load(open('$PRESET_FILE')); print(d.get('activeMcpCount', '?'))")
DISABLED_COUNT=$(python3 -c "import json; d=json.load(open('$PRESET_FILE')); print(len(d.get('disabledMcpServers', [])))")

echo "Applied preset: $PRESET"
echo "  Active MCPs: $ACTIVE"
echo "  Disabled MCPs: $DISABLED_COUNT"
echo ""
echo "Restart Claude Code session for changes to take effect."
