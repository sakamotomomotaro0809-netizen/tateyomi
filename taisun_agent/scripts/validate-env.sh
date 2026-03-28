#!/bin/bash
# TAISUN v2 - Environment Variable Validator
# Usage: bash scripts/validate-env.sh [--strict]
#
# Validates that all required API keys are set in .env
# --strict: Exit with error code if any required key is missing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
STRICT_MODE="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

errors=0
warnings=0

check_key() {
  local key="$1"
  local level="$2"  # required | recommended | optional
  local desc="$3"

  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}FATAL: .env file not found at $ENV_FILE${NC}"
    echo "Run: cp .env.example .env && edit .env"
    exit 1
  fi

  local value
  value=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)

  if [ -z "$value" ]; then
    if [ "$level" = "required" ]; then
      echo -e "${RED}  MISSING [required]: ${key} - ${desc}${NC}"
      errors=$((errors + 1))
    elif [ "$level" = "recommended" ]; then
      echo -e "${YELLOW}  MISSING [recommended]: ${key} - ${desc}${NC}"
      warnings=$((warnings + 1))
    fi
    return
  fi

  # Check for placeholder values
  if echo "$value" | grep -qE '^(your_|sk-xxx|ghp_xxx|secret_xxx|xxx)'; then
    if [ "$level" = "required" ]; then
      echo -e "${RED}  PLACEHOLDER [required]: ${key} - still has placeholder value${NC}"
      errors=$((errors + 1))
    elif [ "$level" = "recommended" ]; then
      echo -e "${YELLOW}  PLACEHOLDER [recommended]: ${key} - still has placeholder value${NC}"
      warnings=$((warnings + 1))
    fi
    return
  fi

  echo -e "${GREEN}  OK: ${key}${NC}"
}

echo "========================================"
echo "  TAISUN v2 - Environment Validator"
echo "========================================"
echo ""

# --- AI API Keys ---
echo "--- AI API Keys ---"
check_key "ANTHROPIC_API_KEY" "required" "Claude API access"
check_key "OPENAI_API_KEY" "recommended" "GPT/Realtime API access"
check_key "GOOGLE_API_KEY" "recommended" "Gemini API access"

# --- Research APIs ---
echo ""
echo "--- Research & Search APIs ---"
check_key "TAVILY_API_KEY" "recommended" "AI-optimized search"
check_key "SERPAPI_KEY" "optional" "Google SERP data"
check_key "BRAVE_SEARCH_API_KEY" "optional" "Brave web search"
check_key "NEWSAPI_KEY" "optional" "News aggregation"
check_key "PERPLEXITY_API_KEY" "optional" "AI search + summary"

# --- TTS / Audio ---
echo ""
echo "--- TTS / Audio ---"
check_key "FISH_AUDIO_API_KEY" "recommended" "Fish Audio TTS"
check_key "FISH_AUDIO_MODEL_ID" "recommended" "Fish Audio model"

# --- SNS ---
echo ""
echo "--- SNS APIs ---"
check_key "TWITTER_AUTH_TOKEN" "optional" "X/Twitter cookie auth"

# --- MCP Infrastructure ---
echo ""
echo "--- MCP Infrastructure ---"
check_key "GITHUB_TOKEN" "recommended" "GitHub integration"
check_key "NOTION_API_KEY" "optional" "Notion integration"
check_key "POSTGRES_MCP_DSN" "optional" "PostgreSQL read-only"

# --- External Services ---
echo ""
echo "--- External Services ---"
check_key "GOTENBERG_URL" "optional" "PDF conversion service"
check_key "N8N_API_URL" "optional" "Workflow automation"

# --- Redundancy Check ---
echo ""
echo "--- Redundancy Check ---"
CLAUDE_ENV="$PROJECT_ROOT/.claude/.env"
if [ -f "$CLAUDE_ENV" ]; then
  echo -e "${YELLOW}  WARNING: .claude/.env exists (keys should be in main .env)${NC}"
  echo "  Keys found in .claude/.env:"
  grep -v "^#" "$CLAUDE_ENV" | grep -v "^$" | cut -d= -f1 | while read -r key; do
    echo "    - $key"
  done
  warnings=$((warnings + 1))
else
  echo -e "${GREEN}  OK: No scattered .env files${NC}"
fi

# --- Summary ---
echo ""
echo "========================================"
if [ $errors -gt 0 ]; then
  echo -e "${RED}  ERRORS: $errors required keys missing${NC}"
fi
if [ $warnings -gt 0 ]; then
  echo -e "${YELLOW}  WARNINGS: $warnings recommended keys missing${NC}"
fi
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "${GREEN}  ALL CHECKS PASSED${NC}"
fi
echo "========================================"

if [ "$STRICT_MODE" = "--strict" ] && [ $errors -gt 0 ]; then
  exit 1
fi
