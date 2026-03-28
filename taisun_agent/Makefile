# TAISUN v2 - Execution Foundation
# Phase 1: Document Processing | Phase 2: Monitoring

.PHONY: help setup verify doctor tools-up tools-down docs-export clean
.PHONY: monitoring-up monitoring-down monitoring-health monitoring-metrics monitoring-alerts

# Default target
help:
	@echo "TAISUN v2 - Execution Foundation"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Setup & Verification:"
	@echo "  setup       - Initialize environment and dependencies"
	@echo "  verify      - Verify all tools are properly configured"
	@echo "  doctor      - Run diagnostic checks on the system"
	@echo ""
	@echo "Phase 1 - Document Tools:"
	@echo "  tools-up    - Start Gotenberg and Stirling-PDF containers"
	@echo "  tools-down  - Stop document processing containers"
	@echo "  docs-export - Export documents using configured tools"
	@echo ""
	@echo "Phase 2 - Monitoring:"
	@echo "  monitoring-up     - Start Prometheus/Grafana/Loki stack"
	@echo "  monitoring-down   - Stop monitoring stack"
	@echo "  monitoring-health - Check monitoring services health"
	@echo "  monitoring-metrics - Show current system metrics"
	@echo "  monitoring-alerts  - Show active alerts"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean       - Clean temporary files and caches"
	@echo "  logs        - Show container logs"
	@echo ""
	@echo "MCP & Agents:"
	@echo "  mcp-health  - Check MCP server health"
	@echo "  agents-list - List available agents"
	@echo "  skills-list - List available skills"

# ============================================================
# Setup & Initialization
# ============================================================

setup: _check-deps _setup-env _setup-tools
	@echo "✅ Setup complete"

_check-deps:
	@echo "🔍 Checking dependencies..."
	@command -v git >/dev/null 2>&1 || { echo "❌ git is required"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ docker is required"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || { echo "❌ docker-compose is required"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "❌ node is required"; exit 1; }
	@echo "✅ All dependencies found"

_setup-env:
	@echo "🔧 Setting up environment..."
	@if [ ! -f .env ]; then \
		if [ -f .env.example ]; then \
			cp .env.example .env; \
			echo "📝 Created .env from .env.example"; \
		fi; \
	fi
	@if [ ! -f .env.tools ]; then \
		if [ -f .env.tools.example ]; then \
			cp .env.tools.example .env.tools; \
			echo "📝 Created .env.tools from .env.tools.example"; \
		fi; \
	fi

_setup-tools:
	@echo "📦 Installing npm dependencies..."
	@npm install --silent

# ============================================================
# Verification & Diagnostics
# ============================================================

verify:
	@echo "🔍 Verifying TAISUN v2 installation..."
	@./scripts/phase1/verify.sh

doctor:
	@echo "🩺 Running diagnostics..."
	@./scripts/phase1/doctor.sh

# ============================================================
# Document Processing Tools
# ============================================================

tools-up:
	@echo "🚀 Starting document processing tools..."
	@docker-compose -f docker-compose.tools.yml up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 5
	@$(MAKE) _tools-health

tools-down:
	@echo "🛑 Stopping document processing tools..."
	@docker-compose -f docker-compose.tools.yml down

_tools-health:
	@echo "🔍 Checking tool health..."
	@curl -sf http://localhost:3000/health >/dev/null 2>&1 && echo "✅ Gotenberg: healthy" || echo "⚠️  Gotenberg: not ready"
	@curl -sf http://localhost:8080/api/v1/info >/dev/null 2>&1 && echo "✅ Stirling-PDF: healthy" || echo "⚠️  Stirling-PDF: not ready"

docs-export:
	@echo "📄 Exporting documents..."
	@./scripts/phase1/docs-export.sh

logs:
	@docker-compose -f docker-compose.tools.yml logs -f

# ============================================================
# Phase 2: Monitoring Stack
# ============================================================

monitoring-up:
	@echo "🚀 Starting monitoring stack..."
	@docker-compose -f docker-compose.monitoring.yml up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@$(MAKE) monitoring-health
	@echo ""
	@echo "📊 Grafana:      http://localhost:3001 (admin/taisun2024)"
	@echo "📈 Prometheus:   http://localhost:9090"
	@echo "📋 Alertmanager: http://localhost:9093"
	@echo "📝 Loki:         http://localhost:3100"

monitoring-down:
	@echo "🛑 Stopping monitoring stack..."
	@docker-compose -f docker-compose.monitoring.yml down

monitoring-health:
	@./scripts/phase2/health-check.sh

monitoring-metrics:
	@./scripts/phase2/metrics.sh

monitoring-alerts:
	@./scripts/phase2/alerts.sh

monitoring-logs:
	@docker-compose -f docker-compose.monitoring.yml logs -f

# ============================================================
# MCP & Agent Commands
# ============================================================

mcp-health:
	@echo "🔍 Checking MCP server health..."
	@./scripts/mcp-health-check.sh

agents-list:
	@node scripts/list-agents.js --details

skills-list:
	@node scripts/list-skills.js --details

# ============================================================
# Maintenance
# ============================================================

clean:
	@echo "🧹 Cleaning temporary files..."
	@rm -rf node_modules/.cache
	@rm -rf .tmp
	@rm -rf dist
	@echo "✅ Clean complete"

# ============================================================
# Testing
# ============================================================

test:
	@npm test

test-unit:
	@npm run test:unit

test-integration:
	@npm run test:integration

lint:
	@npm run lint

typecheck:
	@npm run typecheck
