#!/usr/bin/env bash
set -euo pipefail

# LLM Auto-Switching System v1.0 - Stack Management
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.llm.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

check_compose() { [ -f "$COMPOSE_FILE" ] || { echo -e "${RED}Error: ${COMPOSE_FILE} not found${NC}"; exit 1; }; }

cmd_start() {
  check_compose
  echo -e "${CYAN}Starting LLM stack...${NC}"
  docker compose -f "$COMPOSE_FILE" up -d
  echo "Waiting for services..."
  local i=0
  while [ $i -lt 30 ]; do
    curl -sf http://localhost:4000/health/liveliness &>/dev/null && { echo -e "${GREEN}LiteLLM healthy!${NC}"; cmd_status; return 0; }
    i=$((i + 1)); sleep 2
  done
  echo -e "${YELLOW}LiteLLM not yet healthy. Check: bash scripts/llm-stack.sh logs${NC}"
}

cmd_stop() { check_compose; echo -e "${CYAN}Stopping...${NC}"; docker compose -f "$COMPOSE_FILE" down; echo -e "${GREEN}Stopped.${NC}"; }

cmd_status() {
  echo -e "${CYAN}=== LLM Auto-Switching System Status ===${NC}"
  echo -n "LiteLLM (4000): "; curl -sf http://localhost:4000/health/liveliness &>/dev/null && echo -e "${GREEN}UP${NC}" || echo -e "${RED}DOWN${NC}"
  echo -n "Redis: "; redis-cli ping &>/dev/null 2>&1 && echo -e "${GREEN}UP${NC}" || echo -e "${RED}DOWN${NC}"
  echo -n "Ollama (11434): "
  if curl -sf http://localhost:11434/api/tags &>/dev/null; then
    echo -e "${GREEN}UP${NC}"
    curl -sf http://localhost:11434/api/tags | python3 -c "import sys,json;[print(f'  - {m[\"name\"]}') for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || true
  else
    echo -e "${RED}DOWN${NC}"
  fi
  echo ""; docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || echo "(compose not running)"
}

cmd_logs() { check_compose; docker compose -f "$COMPOSE_FILE" logs -f --tail=50 "${1:-}"; }

cmd_cost() {
  local p="${1:-day}"
  if [ -f "${PROJECT_DIR}/scripts/cost-report.ts" ]; then
    npx ts-node "${PROJECT_DIR}/scripts/cost-report.ts" --period="$p"
  else
    local log="${PROJECT_DIR}/logs/cost-tracking.jsonl"
    [ -f "$log" ] && tail -20 "$log" | python3 -c "
import sys,json
t=0
for l in sys.stdin:
 try:
  r=json.loads(l.strip());c=r.get('cost',0);t+=c
  print(f'  {r.get(\"timestamp\",\"?\")} | {r.get(\"model\",\"?\")} | \${c:.4f}')
 except:pass
print(f'\n  Total: \${t:.4f}')" || echo "No cost records yet."
  fi
}

cmd_switch() {
  case "${1:-litellm}" in
    litellm) echo "export ANTHROPIC_BASE_URL=http://localhost:4000"; echo -e "${YELLOW}Run above to activate.${NC}" ;;
    direct)  echo "unset ANTHROPIC_BASE_URL"; echo -e "${YELLOW}Run above to activate.${NC}" ;;
    *)       echo "Usage: llm-stack.sh switch [litellm|direct]" ;;
  esac
}

case "${1:-}" in
  start)  cmd_start ;; stop) cmd_stop ;; status) cmd_status ;;
  logs)   cmd_logs "${2:-}" ;; cost) cmd_cost "${2:-day}" ;; switch) cmd_switch "${2:-litellm}" ;;
  *)      echo "Usage: llm-stack.sh [start|stop|status|logs|cost|switch]" ;;
esac
