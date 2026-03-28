#!/bin/bash
# AIT42 Test Data Generator
# Version 1.0.0
# Generates sample memory data for integration testing

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AIT42 Test Data Generator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create test data directory
TEST_DATA_DIR="test-data"
mkdir -p "$TEST_DATA_DIR/agents"
mkdir -p "$TEST_DATA_DIR/tasks"

echo "Generating test data in $TEST_DATA_DIR/..."
echo ""

# Generate agent stats - backend-developer
cat > "$TEST_DATA_DIR/agents/backend-developer-stats.yaml" <<'EOF'
# Agent Statistics for backend-developer
# Test data generated for integration testing

agent_name: "backend-developer"
total_tasks: 100
successful_tasks: 90
failed_tasks: 10
success_rate: 0.90
avg_quality_score: 92.0
avg_duration_ms: 30000
last_updated: "2025-11-04T10:00:00Z"

recent_tasks:
  - id: "2025-11-03-010"
    success: true
    score: 95
  - id: "2025-11-03-009"
    success: true
    score: 88
  - id: "2025-11-03-008"
    success: false
    score: 0
  - id: "2025-11-03-007"
    success: true
    score: 92
  - id: "2025-11-03-006"
    success: true
    score: 94
  - id: "2025-11-03-005"
    success: true
    score: 89
  - id: "2025-11-03-004"
    success: true
    score: 93
  - id: "2025-11-03-003"
    success: true
    score: 91
  - id: "2025-11-03-002"
    success: true
    score: 90
  - id: "2025-11-03-001"
    success: true
    score: 87

trends:
  success_rate_trend: 0.05  # Improving
  quality_score_trend: 2.3
  avg_duration_trend: -500  # Getting faster

specializations:
  implementation: 50
  bug-fix: 25
  refactoring: 15
  api: 40
EOF

echo "✓ Generated: backend-developer-stats.yaml"

# Generate agent stats - frontend-developer
cat > "$TEST_DATA_DIR/agents/frontend-developer-stats.yaml" <<'EOF'
# Agent Statistics for frontend-developer
# Test data generated for integration testing

agent_name: "frontend-developer"
total_tasks: 50
successful_tasks: 40
failed_tasks: 10
success_rate: 0.80
avg_quality_score: 85.0
avg_duration_ms: 25000
last_updated: "2025-11-04T10:00:00Z"

recent_tasks:
  - id: "2025-11-03-005"
    success: true
    score: 88
  - id: "2025-11-03-004"
    success: true
    score: 82
  - id: "2025-11-03-003"
    success: false
    score: 0
  - id: "2025-11-03-002"
    success: true
    score: 90
  - id: "2025-11-03-001"
    success: true
    score: 85

trends:
  success_rate_trend: 0.0  # Stable
  quality_score_trend: 1.0
  avg_duration_trend: 0

specializations:
  implementation: 20
  ui: 30
  bug-fix: 10
EOF

echo "✓ Generated: frontend-developer-stats.yaml"

# Generate agent stats - security-architect
cat > "$TEST_DATA_DIR/agents/security-architect-stats.yaml" <<'EOF'
# Agent Statistics for security-architect
# Test data generated for integration testing

agent_name: "security-architect"
total_tasks: 30
successful_tasks: 28
failed_tasks: 2
success_rate: 0.933
avg_quality_score: 95.0
avg_duration_ms: 45000
last_updated: "2025-11-04T10:00:00Z"

recent_tasks:
  - id: "2025-11-03-003"
    success: true
    score: 98
  - id: "2025-11-03-002"
    success: true
    score: 96
  - id: "2025-11-03-001"
    success: true
    score: 94

trends:
  success_rate_trend: 0.03  # Improving
  quality_score_trend: 1.5
  avg_duration_trend: -1000

specializations:
  security: 25
  implementation: 15
  review: 10
EOF

echo "✓ Generated: security-architect-stats.yaml"

# Generate agent stats - api-developer
cat > "$TEST_DATA_DIR/agents/api-developer-stats.yaml" <<'EOF'
# Agent Statistics for api-developer
# Test data generated for integration testing

agent_name: "api-developer"
total_tasks: 75
successful_tasks: 68
failed_tasks: 7
success_rate: 0.907
avg_quality_score: 90.0
avg_duration_ms: 28000
last_updated: "2025-11-04T10:00:00Z"

recent_tasks:
  - id: "2025-11-03-008"
    success: true
    score: 92
  - id: "2025-11-03-007"
    success: true
    score: 91
  - id: "2025-11-03-006"
    success: true
    score: 89
  - id: "2025-11-03-005"
    success: false
    score: 0
  - id: "2025-11-03-004"
    success: true
    score: 93

trends:
  success_rate_trend: 0.02
  quality_score_trend: 1.8
  avg_duration_trend: -300

specializations:
  api: 60
  implementation: 45
  integration: 20
EOF

echo "✓ Generated: api-developer-stats.yaml"

# Generate task record - successful API implementation
cat > "$TEST_DATA_DIR/tasks/2025-11-04-001-api-implementation.yaml" <<'EOF'
# Task Record: Successful API Implementation
# Test data generated for integration testing

id: "2025-11-04-001"
timestamp: "2025-11-04T14:30:00Z"
request: "REST API for user authentication with JWT tokens"
task_type: "implementation"

selected_agents:
  - backend-developer
  - api-developer
  - security-architect

duration_ms: 45000
success: true
quality_score: 95

errors: []
warnings:
  - "Consider rate limiting implementation"

quality_metrics:
  code_coverage: 92
  documentation_complete: true
  security_review_passed: true
  performance_benchmark: "excellent"

reflection:
  score: 95
  decision: "approved"
  feedback: "高品質な実装。テストカバレッジ92%。セキュリティベストプラクティスに準拠。"
  improvements: []

artifacts:
  - path: "src/api/auth.rs"
    type: "implementation"
  - path: "tests/api/auth_test.rs"
    type: "test"
  - path: "docs/api/auth.md"
    type: "documentation"

resources:
  tokens_used: 85000
  api_calls: 12
  files_modified: 8

tags:
  - authentication
  - api
  - security
  - jwt
EOF

echo "✓ Generated: 2025-11-04-001-api-implementation.yaml"

# Generate task record - bug fix
cat > "$TEST_DATA_DIR/tasks/2025-11-04-002-bug-fix-memory-leak.yaml" <<'EOF'
# Task Record: Bug Fix - Memory Leak
# Test data generated for integration testing

id: "2025-11-04-002"
timestamp: "2025-11-04T15:00:00Z"
request: "Fix memory leak in WebSocket handler"
task_type: "bug-fix"

selected_agents:
  - backend-developer
  - performance-engineer

duration_ms: 30000
success: true
quality_score: 88

errors: []
warnings: []

quality_metrics:
  code_coverage: 85
  documentation_complete: true
  security_review_passed: true
  performance_benchmark: "good"

reflection:
  score: 88
  decision: "approved"
  feedback: "メモリリークを修正。パフォーマンステストで検証済み。"
  improvements:
    - "Add more comprehensive memory profiling tests"

artifacts:
  - path: "src/websocket/handler.rs"
    type: "fix"
  - path: "tests/websocket/memory_test.rs"
    type: "test"

resources:
  tokens_used: 55000
  api_calls: 8
  files_modified: 3

tags:
  - bug-fix
  - performance
  - websocket
  - memory
EOF

echo "✓ Generated: 2025-11-04-002-bug-fix-memory-leak.yaml"

# Generate task record - failed deployment
cat > "$TEST_DATA_DIR/tasks/2025-11-04-003-failed-deployment.yaml" <<'EOF'
# Task Record: Failed Deployment
# Test data generated for integration testing

id: "2025-11-04-003"
timestamp: "2025-11-04T16:00:00Z"
request: "Deploy to production environment"
task_type: "deployment"

selected_agents:
  - cicd-manager
  - cloud-architect

duration_ms: 60000
success: false
quality_score: 0

errors:
  - "Database migration failed: connection timeout"
  - "Rollback initiated"

warnings:
  - "Production database unreachable"

quality_metrics:
  code_coverage: 0
  documentation_complete: false
  security_review_passed: false
  performance_benchmark: "n/a"

reflection:
  score: 0
  decision: "rejected"
  feedback: "デプロイ失敗。データベース接続タイムアウト。ネットワーク設定を確認する必要があります。"
  improvements:
    - "Check network connectivity"
    - "Verify database credentials"
    - "Increase timeout settings"

artifacts: []

resources:
  tokens_used: 25000
  api_calls: 15
  files_modified: 0

tags:
  - deployment
  - failed
  - database
  - network
EOF

echo "✓ Generated: 2025-11-04-003-failed-deployment.yaml"

# Generate task record - security review
cat > "$TEST_DATA_DIR/tasks/2025-11-04-004-security-review.yaml" <<'EOF'
# Task Record: Security Review
# Test data generated for integration testing

id: "2025-11-04-004"
timestamp: "2025-11-04T17:00:00Z"
request: "Security audit of authentication system"
task_type: "security"

selected_agents:
  - security-architect
  - code-reviewer

duration_ms: 50000
success: true
quality_score: 98

errors: []
warnings: []

quality_metrics:
  code_coverage: 95
  documentation_complete: true
  security_review_passed: true
  performance_benchmark: "excellent"

reflection:
  score: 98
  decision: "approved"
  feedback: "包括的なセキュリティレビュー。すべてのベストプラクティスに準拠。"
  improvements: []

artifacts:
  - path: "docs/security/auth-audit-report.md"
    type: "documentation"
  - path: "tests/security/auth_security_test.rs"
    type: "test"

resources:
  tokens_used: 65000
  api_calls: 10
  files_modified: 5

tags:
  - security
  - audit
  - authentication
  - review
EOF

echo "✓ Generated: 2025-11-04-004-security-review.yaml"

# Generate config file
cat > "$TEST_DATA_DIR/config.yaml" <<'EOF'
# AIT42 Memory System Configuration
# Test data generated for integration testing

version: "1.0"

# Task retention settings
max_tasks: 1000
retention_days: 90

# Backup settings
backup_enabled: true
backup_path: ".claude/memory-backup/"
backup_interval_days: 7

# Quality thresholds
quality_threshold:
  excellent: 90
  good: 75
  acceptable: 60
  poor: 0

# Success rate thresholds for agent selection
success_rate_threshold:
  preferred: 0.85
  acceptable: 0.70
  warning: 0.50

# Recent tasks tracking
recent_tasks_limit: 10

# Task types
task_types:
  - implementation
  - bug-fix
  - refactoring
  - testing
  - documentation
  - deployment
  - optimization
  - security
  - integration
  - migration
  - analysis
  - design

# Rotation policy
rotation:
  enabled: true
  archive_path: ".claude/memory-backup/archive/"
  compress_archives: true

# Statistics
statistics:
  calculate_trends: true
  trend_window_days: 30
EOF

echo "✓ Generated: config.yaml"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Data Generation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Generated files:"
echo "  Agents: 4 stats files"
echo "  Tasks: 4 task records"
echo "  Config: 1 config file"
echo ""
echo "To load test data:"
echo "  cp $TEST_DATA_DIR/agents/*.yaml .claude/memory/agents/"
echo "  cp $TEST_DATA_DIR/tasks/*.yaml .claude/memory/tasks/"
echo "  cp $TEST_DATA_DIR/config.yaml .claude/memory/config.yaml"
echo ""
echo "To validate test data:"
echo "  yamllint $TEST_DATA_DIR/"
echo ""
