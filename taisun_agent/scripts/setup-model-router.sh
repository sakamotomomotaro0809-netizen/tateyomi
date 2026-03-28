#!/usr/bin/env bash
set -euo pipefail

# LLM Auto-Switching System v1.0 - Setup Script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROUTER_CONFIG_DIR="${HOME}/.claude-code-router"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }

echo "============================================"
echo "LLM Auto-Switching System v1.0 - Setup"
echo "============================================"
echo ""

ERRORS=0

echo "--- Checking claude-code-router ---"
if command -v claude-code-router &>/dev/null; then
  ROUTER_VERSION=$(claude-code-router --version 2>/dev/null || echo "unknown")
  log_ok "claude-code-router installed (${ROUTER_VERSION})"
else
  log_warn "claude-code-router not found (optional: npm i -g claude-code-router)"
fi

echo ""
echo "--- Checking Ollama ---"
if command -v ollama &>/dev/null; then
  OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
  log_ok "Ollama installed (${OLLAMA_VERSION})"
  if curl -sf http://localhost:11434/api/tags &>/dev/null; then
    log_ok "Ollama server is running"
    curl -sf http://localhost:11434/api/tags | python3 -c "import sys,json; [print(f'  - {m[\"name\"]}') for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || true
  else
    log_warn "Ollama server not running (start with: ollama serve)"
    ERRORS=$((ERRORS + 1))
  fi
else
  log_fail "Ollama not installed (brew install ollama)"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "--- Checking Redis ---"
if command -v redis-cli &>/dev/null; then
  if redis-cli ping &>/dev/null; then
    log_ok "Redis is running"
  else
    log_warn "Redis installed but not running (brew services start redis)"
  fi
else
  log_warn "Redis not installed (optional: brew install redis)"
fi

echo ""
echo "--- Checking Environment Variables ---"
[ -n "${ANTHROPIC_API_KEY:-}" ] && log_ok "ANTHROPIC_API_KEY is set" || log_warn "ANTHROPIC_API_KEY not set"
[ -n "${OPENAI_API_KEY:-}" ] && log_ok "OPENAI_API_KEY is set" || log_warn "OPENAI_API_KEY not set (optional)"
[ -n "${OPENROUTER_API_KEY:-}" ] && log_ok "OPENROUTER_API_KEY is set" || log_warn "OPENROUTER_API_KEY not set (optional)"

echo ""
echo "--- Setting up Router Config ---"
ROUTER_CONFIG="${PROJECT_DIR}/.claude/router-config.json"
if [ -f "$ROUTER_CONFIG" ]; then
  mkdir -p "$ROUTER_CONFIG_DIR"
  cp "$ROUTER_CONFIG" "${ROUTER_CONFIG_DIR}/config.json"
  log_ok "Router config copied to ${ROUTER_CONFIG_DIR}/config.json"
else
  log_fail "Router config not found: ${ROUTER_CONFIG}"
  ERRORS=$((ERRORS + 1))
fi

PERF_CONFIG="${PROJECT_DIR}/.claude/performance.yaml"
[ -f "$PERF_CONFIG" ] && log_ok "Performance config found" || { log_fail "Performance config not found"; ERRORS=$((ERRORS + 1)); }

mkdir -p "${PROJECT_DIR}/logs"
log_ok "Logs directory ready"

echo ""
echo "============================================"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}Setup complete! All checks passed.${NC}"
else
  echo -e "${YELLOW}Setup complete with ${ERRORS} warning(s).${NC}"
fi
echo "============================================"
