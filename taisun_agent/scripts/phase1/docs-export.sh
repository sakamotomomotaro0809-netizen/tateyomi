#!/bin/bash
# TAISUN v2 - Document Export Script
# Exports documentation using Gotenberg and Pandoc

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXPORT_DIR="$PROJECT_ROOT/docs/exports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
GOTENBERG_URL="${GOTENBERG_URL:-http://localhost:3000}"

echo "=============================================="
echo "  TAISUN v2 - Document Export"
echo "=============================================="
echo ""

# Create export directory
mkdir -p "$EXPORT_DIR"

# ============================================================
# Check Prerequisites
# ============================================================
echo "🔍 Checking prerequisites..."

GOTENBERG_OK=false
PANDOC_OK=false

if curl -sf "$GOTENBERG_URL/health" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Gotenberg: available"
    GOTENBERG_OK=true
else
    echo -e "  ${YELLOW}⚠️${NC} Gotenberg: not available (run 'make tools-up')"
fi

if command -v pandoc &>/dev/null; then
    echo -e "  ${GREEN}✅${NC} Pandoc: available ($(pandoc --version | head -1))"
    PANDOC_OK=true
else
    echo -e "  ${YELLOW}⚠️${NC} Pandoc: not installed"
fi

echo ""

# ============================================================
# Export Functions
# ============================================================

export_md_to_pdf_pandoc() {
    local input=$1
    local output=$2

    if [ "$PANDOC_OK" = true ]; then
        pandoc "$input" -o "$output" \
            --pdf-engine=xelatex \
            -V geometry:margin=1in \
            -V mainfont="Hiragino Sans" \
            2>/dev/null && return 0
    fi
    return 1
}

export_md_to_pdf_gotenberg() {
    local input=$1
    local output=$2

    if [ "$GOTENBERG_OK" = true ]; then
        # Convert MD to HTML first, then to PDF via Gotenberg
        local html_content="<html><head><meta charset='utf-8'><style>body{font-family:sans-serif;margin:40px;}</style></head><body>$(cat "$input")</body></html>"
        echo "$html_content" > /tmp/temp_doc.html

        curl -sf "$GOTENBERG_URL/forms/chromium/convert/html" \
            -F "files=@/tmp/temp_doc.html" \
            -o "$output" 2>/dev/null && return 0
    fi
    return 1
}

export_md_to_docx() {
    local input=$1
    local output=$2

    if [ "$PANDOC_OK" = true ]; then
        pandoc "$input" -o "$output" 2>/dev/null && return 0
    fi
    return 1
}

# ============================================================
# Main Export Logic
# ============================================================
echo "📄 Exporting documents..."
echo ""

EXPORTED=0
FAILED=0

# Export README
if [ -f "$PROJECT_ROOT/README.md" ]; then
    echo "  Exporting README.md..."

    if export_md_to_pdf_pandoc "$PROJECT_ROOT/README.md" "$EXPORT_DIR/README.pdf"; then
        echo -e "    ${GREEN}✅${NC} README.pdf (via Pandoc)"
        ((EXPORTED++))
    elif export_md_to_pdf_gotenberg "$PROJECT_ROOT/README.md" "$EXPORT_DIR/README.pdf"; then
        echo -e "    ${GREEN}✅${NC} README.pdf (via Gotenberg)"
        ((EXPORTED++))
    else
        echo -e "    ${RED}❌${NC} README.pdf failed"
        ((FAILED++))
    fi

    if export_md_to_docx "$PROJECT_ROOT/README.md" "$EXPORT_DIR/README.docx"; then
        echo -e "    ${GREEN}✅${NC} README.docx"
        ((EXPORTED++))
    fi
fi

# Export CLAUDE.md
if [ -f "$PROJECT_ROOT/.claude/CLAUDE.md" ]; then
    echo "  Exporting CLAUDE.md..."

    if export_md_to_pdf_pandoc "$PROJECT_ROOT/.claude/CLAUDE.md" "$EXPORT_DIR/CLAUDE.pdf"; then
        echo -e "    ${GREEN}✅${NC} CLAUDE.pdf"
        ((EXPORTED++))
    fi
fi

# Export docs/*.md
if [ -d "$PROJECT_ROOT/docs" ]; then
    for doc in "$PROJECT_ROOT/docs"/*.md; do
        if [ -f "$doc" ]; then
            filename=$(basename "$doc" .md)
            echo "  Exporting $filename.md..."

            if export_md_to_pdf_pandoc "$doc" "$EXPORT_DIR/$filename.pdf"; then
                echo -e "    ${GREEN}✅${NC} $filename.pdf"
                ((EXPORTED++))
            fi
        fi
    done
fi

echo ""
echo "=============================================="
echo "  Export Summary"
echo "=============================================="
echo "  Exported: $EXPORTED files"
echo "  Failed: $FAILED files"
echo "  Output: $EXPORT_DIR"
echo ""

if [ $EXPORTED -gt 0 ]; then
    echo -e "${GREEN}✅ Export complete!${NC}"
    ls -la "$EXPORT_DIR"
else
    echo -e "${YELLOW}⚠️ No files exported. Check prerequisites.${NC}"
fi
