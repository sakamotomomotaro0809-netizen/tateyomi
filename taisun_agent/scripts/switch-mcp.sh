#!/bin/bash
# MCP Preset Switcher for TAISUN Agent
# Usage: ./scripts/switch-mcp.sh [preset]
# Presets: marketing, video, research, development, image, full

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PRESETS_DIR="$PROJECT_ROOT/mcp-presets"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${BLUE}MCP Preset Switcher (v2.1 - defer_loading対応)${NC}"
    echo ""
    echo "Usage: $0 [preset]"
    echo ""
    echo "Available presets:"
    echo -e "  ${GREEN}marketing${NC}      - マーケティング（LP分析、コピーライティング）"
    echo -e "  ${GREEN}video${NC}          - 動画制作（YouTube、動画パイプライン）"
    echo -e "  ${GREEN}research${NC}       - リサーチ（深層調査、Apify、出典付きレポート）"
    echo -e "  ${GREEN}development${NC}    - システム開発（要件定義、TDD、コードレビュー）"
    echo -e "  ${GREEN}image${NC}          - 画像生成（NanoBanana、Figma）"
    echo -e "  ${GREEN}full${NC}           - フル構成（全MCP有効、defer_loadingなし）"
    echo -e "  ${GREEN}full-optimized${NC} - フル構成（defer_loading最適化、コンテキスト70%削減）"
    echo ""
    echo "Examples:"
    echo "  $0 marketing       # マーケティング用に切り替え"
    echo "  $0 full-optimized  # 最適化フル構成に切り替え（推奨）"
    echo ""
    echo "Note: defer_loading対応プリセットはMCPを必要時のみロードし、"
    echo "      コンテキスト消費を大幅に削減します。"
}

if [ -z "$1" ]; then
    show_help
    exit 0
fi

PRESET="$1"

case "$PRESET" in
    marketing|video|research|development|image|full-optimized)
        PRESET_FILE="$PRESETS_DIR/${PRESET}.mcp.json"
        if [ -f "$PRESET_FILE" ]; then
            cp "$PRESET_FILE" "$PROJECT_ROOT/.mcp.json"
            echo -e "${GREEN}✓${NC} MCP preset switched to: ${BLUE}${PRESET}${NC}"
            echo ""
            echo "有効なMCP:"
            grep -o '"disabled": false' "$PROJECT_ROOT/.mcp.json" | wc -l | xargs echo "  "
        else
            echo "Error: Preset file not found: $PRESET_FILE"
            exit 1
        fi
        ;;
    full)
        # Restore original full configuration
        cat > "$PROJECT_ROOT/.mcp.json" << 'EOF'
{
  "mcpServers": {
    "taisun-proxy": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/proxy-mcp/server.js"],
      "disabled": false,
      "description": "TAISUN Proxy MCP (single entrypoint)",
      "category": "system"
    },
    "youtube": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/matsumototoshihiko/mcp-youtube/dist/index.js"],
      "disabled": false,
      "description": "YouTube downloader",
      "category": "media"
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "disabled": false,
      "description": "Context7 - 最新ドキュメント",
      "category": "documentation"
    },
    "gpt-researcher": {
      "type": "stdio",
      "command": "uvx",
      "args": ["--from", "gpt-researcher-mcp", "gpt-researcher-mcp"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "TAVILY_API_KEY": "${TAVILY_API_KEY}"
      },
      "disabled": false,
      "description": "GPT Researcher - 深層リサーチ",
      "category": "research"
    },
    "figma": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--figma-api-key=${FIGMA_API_KEY}", "--stdio"],
      "disabled": false,
      "description": "Figma MCP",
      "category": "design"
    },
    "qdrant": {
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": {
        "QDRANT_URL": "${QDRANT_URL:-http://localhost:6333}",
        "COLLECTION_NAME": "${QDRANT_COLLECTION_NAME:-taisun_memory}",
        "EMBEDDING_MODEL": "sentence-transformers/all-MiniLM-L6-v2"
      },
      "disabled": false,
      "description": "Qdrant MCP - ベクトル検索",
      "category": "database"
    },
    "puppeteer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "disabled": false,
      "description": "Puppeteer MCP",
      "category": "browser-automation"
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "disabled": false,
      "description": "Playwright MCP",
      "category": "browser-automation"
    },
    "chroma": {
      "type": "stdio",
      "command": "uvx",
      "args": ["chroma-mcp"],
      "env": {
        "CHROMA_PERSISTENCE_PATH": "./.chroma",
        "EMBEDDING_FUNCTION": "default"
      },
      "disabled": false,
      "description": "Chroma MCP - ベクトルDB",
      "category": "memory"
    },
    "n8n-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@czlonkowski/n8n-mcp"],
      "disabled": false,
      "description": "n8n MCP - ワークフロー",
      "category": "automation"
    },
    "mcp-memory-service": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-memory-service"],
      "env": {
        "MCP_MAX_RESPONSE_CHARS": "30000"
      },
      "disabled": false,
      "description": "Memory Service MCP",
      "category": "memory"
    },
    "open-websearch": {
      "type": "stdio",
      "command": "uvx",
      "args": ["open-websearch-mcp"],
      "disabled": false,
      "description": "Open WebSearch MCP - 無料検索",
      "category": "search"
    }
  }
}
EOF
        echo -e "${GREEN}✓${NC} MCP preset switched to: ${BLUE}full${NC} (12 MCPs enabled)"
        ;;
    *)
        echo "Error: Unknown preset '$PRESET'"
        echo ""
        show_help
        exit 1
        ;;
esac
