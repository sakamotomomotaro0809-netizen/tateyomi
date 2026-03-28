# SOP: Deployment

**Document Version**: 1.0.0
**Effective Date**: 2025-11-04
**Last Updated**: 2025-11-04
**Owner**: AIT42 System
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Workflow Steps](#workflow-steps)
4. [Error Handling](#error-handling)
5. [Success Metrics](#success-metrics)
6. [Compliance Checklist](#compliance-checklist)
7. [Example Walkthrough](#example-walkthrough)
8. [References](#references)

---

## Overview

### Purpose

This SOP defines the standardized deployment workflow for AIT42 v1.4.0, covering pre-deployment checks, deployment execution, post-deployment monitoring, and rollback procedures. This SOP focuses on **production deployments** with comprehensive safety measures.

### Scope

- **Applies to**: Production deployments, staging deployments, blue-green deployments, canary deployments
- **Does NOT apply to**: Local development deployments, emergency hotfixes (see `bug_fix.md` for P0 hotfix process)
- **Deployment Types**:
  - **Standard Release**: Scheduled deployment (weekly/biweekly)
  - **Hotfix**: Urgent bug fix (< 4 hours, see `bug_fix.md`)
  - **Feature Release**: New feature deployment (follows `feature_development.md`)

### Expected Outcome

- ✅ Code deployed to production without downtime
- ✅ All health checks pass (API, database, dependencies)
- ✅ No increase in error rate (< 1% above baseline)
- ✅ Performance metrics stable (latency, CPU, memory)
- ✅ Rollback plan ready and tested
- ✅ 24-hour post-deployment monitoring active

### Typical Duration

- **Pre-Deployment**: 30-45 minutes (checks, preparation)
- **Deployment**: 15-30 minutes (build, deploy, smoke tests)
- **Post-Deployment**: 24 hours (intensive monitoring first 2 hours, then passive)

---

## Prerequisites

Before starting deployment, verify:

### Code Readiness
- [ ] All quality gates passed (code review >= 90, tests >= 80% coverage)
- [ ] All tests pass (unit, integration, E2E)
- [ ] Security audit completed (0 P0/P1 vulnerabilities)
- [ ] Performance validated (no bottlenecks)
- [ ] Code merged to `main` branch (or release branch)

### Infrastructure Readiness
- [ ] Production environment is healthy (no ongoing incidents)
- [ ] CI/CD pipeline is operational
- [ ] Kubernetes cluster has capacity (CPU, memory, disk)
- [ ] Database migrations tested (on staging with production-like data)
- [ ] External dependencies are operational (third-party APIs, services)

### Documentation Readiness
- [ ] CHANGELOG.md updated (version, changes, breaking changes)
- [ ] Release notes written (user-facing changes)
- [ ] Rollback plan documented (`rollback-plan.md`)
- [ ] Runbook updated (troubleshooting guide)

### Team Readiness
- [ ] Stakeholders notified (deployment scheduled in Slack/email)
- [ ] On-call engineer available (during and 2 hours post-deployment)
- [ ] Deployment window confirmed (low-traffic hours if possible)
- [ ] Communication channels active (Slack incident channel)

### Monitoring & Alerting
- [ ] Monitoring dashboards accessible (Grafana, CloudWatch, etc.)
- [ ] Alerts configured (error rate, latency, resource usage)
- [ ] Logging infrastructure operational (logs flowing to central system)
- [ ] APM tools configured (Application Performance Monitoring)

---

## Workflow Steps

### Step 1: Pre-Deployment Checks

**Agent**: `qa-validator` (Pod 3)
**Duration**: 30-45 minutes
**Execution Mode**: Direct (single agent)

#### Input
- Release candidate code (merged to `main` branch)
- CHANGELOG.md
- Test results (from CI pipeline)

#### Tasks

1. **Verify Quality Gates**
   - Code review score >= 90/100 ✅
   - Test coverage >= 80% ✅
   - All tests pass (unit, integration, E2E) ✅
   - Security audit: 0 P0/P1 vulnerabilities ✅
   - Performance: P95 latency < target ✅

2. **Verify Infrastructure Health**
   ```bash
   # Check Kubernetes cluster health
   kubectl get nodes  # All nodes Ready
   kubectl top nodes  # CPU/Memory < 70%

   # Check database health
   psql -c "SELECT 1"  # Connection successful

   # Check Redis/cache health
   redis-cli ping  # PONG

   # Check external dependencies
   curl https://api.external-service.com/health  # 200 OK
   ```

3. **Verify Database Migrations**
   - Run migrations on staging (with production-like dataset)
   - Verify migrations complete successfully (no errors)
   - Measure migration duration (ensure < 5 minutes)
   - Verify rollback migration works (test reversibility)
   - Check for long-running queries (no table locks > 1 second)

4. **Run Pre-Deployment Tests on Staging**
   - Deploy to staging environment
   - Run full E2E test suite (all tests pass)
   - Run smoke tests (critical user flows)
   - Run performance tests (load testing)
   - Verify no errors in logs

5. **Security Scan** (final check)
   - Run dependency vulnerability scan (npm audit, Snyk)
   - Run container image scan (Trivy, Clair)
   - Verify no secrets in codebase (git-secrets)
   - Check SSL/TLS certificates (not expired)

6. **Capacity Planning**
   - Estimate resource requirements (CPU, memory, disk)
   - Verify cluster has capacity (20% buffer recommended)
   - Check database disk space (>30% free)
   - Verify connection pool limits (database, Redis)

#### Output Artifacts

- **`pre-deployment-checklist.md`**: Verification results
  ```markdown
  # Pre-Deployment Checklist

  ## Quality Gates ✅
  - Code review: 94/100 ✅
  - Test coverage: 87% ✅
  - All tests pass: 250/250 ✅
  - Security: 0 P0/P1 vulnerabilities ✅
  - Performance: P95 125ms (target <200ms) ✅

  ## Infrastructure Health ✅
  - Kubernetes nodes: 3/3 Ready ✅
  - Node CPU: 45% avg ✅
  - Node memory: 60% avg ✅
  - Database: Connected ✅
  - Redis: Connected ✅
  - External APIs: All reachable ✅

  ## Database Migrations ✅
  - Staging migration: Success (duration 45s) ✅
  - Rollback migration: Tested, works ✅
  - No long-running queries ✅

  ## Staging Tests ✅
  - E2E suite: 100/100 pass ✅
  - Smoke tests: All critical flows work ✅
  - Performance test: P95 120ms ✅
  - No errors in logs ✅

  ## Security ✅
  - Dependency scan: 0 critical vulnerabilities ✅
  - Container scan: 0 high/critical vulnerabilities ✅
  - No secrets in code ✅
  - SSL certificates: Valid until 2026-01-15 ✅

  ## Capacity ✅
  - Cluster capacity: 30% buffer available ✅
  - Database disk: 45% free ✅
  - Connection pools: Within limits ✅

  ## Decision: ✅ APPROVED FOR DEPLOYMENT
  ```

#### Handoff Validation Checklist

- [ ] **All Quality Gates Pass**: Code, tests, security, performance verified
- [ ] **Infrastructure Healthy**: All systems operational, no ongoing incidents
- [ ] **Staging Tests Pass**: Full E2E suite passes on staging
- [ ] **Database Migrations Tested**: Migrations work on production-like data
- [ ] **Security Verified**: No critical vulnerabilities, secrets, or expired certificates
- [ ] **Capacity Sufficient**: Cluster has 20%+ buffer for new deployment
- [ ] **Pre-Deployment Checklist Complete**: All items checked and documented

#### Quality Gate

**Decision**:
- **All checks pass**: ✅ Proceed to Step 2 (Build & Deploy)
- **Any critical check fails**: ❌ STOP, fix issue before proceeding
  - Critical checks: Infrastructure health, security vulnerabilities, staging tests

**Failure Examples**:
```yaml
# Example: Critical failure
infrastructure_health:
  database: FAILED (connection timeout)
  decision: STOP - Fix database issue before deploying

# Example: Non-critical warning
capacity:
  cluster_buffer: 15% (recommended 20%)
  decision: PROCEED with caution - Monitor resource usage closely
```

---

### Step 2: Build & Deployment Execution

**Agent**: `cicd-manager` (Pod 4)
**Duration**: 15-30 minutes
**Execution Mode**: Direct (automated via CI/CD)

#### Input
- Approved release (from Step 1)
- Git tag (e.g., `v1.6.0`)
- Deployment manifest (Kubernetes YAML, Terraform, etc.)

#### Tasks

##### 2a. Build Production Artifacts

1. **Build Docker Image**
   ```bash
   # Build with version tag
   docker build -t myapp:v1.6.0 .
   docker tag myapp:v1.6.0 myapp:latest

   # Multi-stage build (optimized for production)
   # Stage 1: Build dependencies
   # Stage 2: Build application
   # Stage 3: Production runtime (minimal image)
   ```

2. **Optimize Image**
   - Use multi-stage builds (reduce image size)
   - Remove development dependencies
   - Use distroless or alpine base images
   - Scan for vulnerabilities (Trivy)

3. **Push to Registry**
   ```bash
   docker push myregistry.com/myapp:v1.6.0
   docker push myregistry.com/myapp:latest
   ```

4. **Verify Image**
   ```bash
   # Pull and verify
   docker pull myregistry.com/myapp:v1.6.0
   docker inspect myregistry.com/myapp:v1.6.0

   # Verify size (should be optimized)
   # Verify layers (no secrets or sensitive data)
   ```

##### 2b. Run Database Migrations (if needed)

1. **Backup Database** (before migration)
   ```bash
   # Create backup
   pg_dump myapp_production > backup-pre-v1.6.0-$(date +%Y%m%d%H%M%S).sql

   # Verify backup
   ls -lh backup-pre-v1.6.0-*.sql
   ```

2. **Run Migrations**
   ```bash
   # Run migrations (idempotent)
   npm run migrate:production

   # Or Kubernetes job
   kubectl apply -f k8s/migration-job.yaml
   kubectl wait --for=condition=complete job/migration-v1.6.0 --timeout=300s
   ```

3. **Verify Migration Success**
   ```bash
   # Check migration status
   npm run migrate:status

   # Verify expected schema changes
   psql -c "\d users"  # Check table structure
   ```

##### 2c. Deploy to Production

**Deployment Strategy**: Blue-Green Deployment

1. **Deploy "Green" Environment** (new version)
   ```yaml
   # k8s/deployment-green.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: myapp-green
     labels:
       app: myapp
       version: green
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: myapp
         version: green
     template:
       metadata:
         labels:
           app: myapp
           version: green
       spec:
         containers:
         - name: myapp
           image: myregistry.com/myapp:v1.6.0
           ports:
           - containerPort: 3000
           env:
           - name: NODE_ENV
             value: production
           livenessProbe:
             httpGet:
               path: /health
               port: 3000
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /health
               port: 3000
             initialDelaySeconds: 10
             periodSeconds: 5
   ```

   ```bash
   # Deploy green
   kubectl apply -f k8s/deployment-green.yaml

   # Wait for pods to be ready
   kubectl wait --for=condition=ready pod -l version=green --timeout=300s
   ```

2. **Run Smoke Tests on Green**
   ```bash
   # Test green environment (before switching traffic)
   # Use internal service endpoint (not exposed to users yet)

   # Health check
   curl http://myapp-green.internal/health
   # Expected: 200 OK

   # Critical API endpoints
   curl http://myapp-green.internal/api/users
   curl http://myapp-green.internal/api/products

   # Database connectivity
   curl http://myapp-green.internal/api/health/db
   ```

3. **Switch Traffic from Blue to Green**
   ```bash
   # Update service to point to green
   kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'

   # Verify traffic is routed to green
   kubectl get endpoints myapp  # Should show green pod IPs
   ```

4. **Monitor Green Environment** (5 minutes)
   ```
   Watch dashboards:
   - Error rate (should stay at baseline)
   - Latency (P95 should be stable or improved)
   - CPU/Memory (should be within expected range)
   - Request rate (should match incoming traffic)
   ```

5. **Decision Point**
   - **If green is healthy** (5 min stable):
     - Keep green active
     - Proceed to Step 3 (Post-Deployment Monitoring)
     - Scale down blue (keep 1 replica for 24 hours as backup)
   - **If green is unhealthy** (errors, high latency):
     - Immediate rollback (switch traffic back to blue)
     - Investigate issue
     - See Error Handling section

#### Alternative Deployment Strategies

##### Canary Deployment (for high-risk changes)
```
1. Deploy canary with 5% traffic
2. Monitor for 30 minutes
3. If healthy: increase to 25% (monitor 30 min)
4. If healthy: increase to 50% (monitor 30 min)
5. If healthy: increase to 100%
6. If unhealthy at any stage: rollback to 0%
```

##### Rolling Update (for low-risk changes)
```
1. Update pods one at a time (maxSurge: 1, maxUnavailable: 0)
2. Wait for each pod to be ready before updating next
3. If any pod fails health check: automatic rollback
```

#### Output Artifacts

- **`deployment-log-v1.6.0.txt`**: Complete deployment log
  ```
  [2025-11-04 14:00:00] Starting deployment v1.6.0
  [2025-11-04 14:02:00] Docker build completed (image size: 250MB)
  [2025-11-04 14:04:00] Image pushed to registry
  [2025-11-04 14:05:00] Database backup created (size: 1.2GB)
  [2025-11-04 14:07:00] Database migrations started
  [2025-11-04 14:08:30] Database migrations completed (duration: 90s)
  [2025-11-04 14:10:00] Green deployment created (3 replicas)
  [2025-11-04 14:12:00] All green pods ready (3/3)
  [2025-11-04 14:13:00] Smoke tests on green: PASS
  [2025-11-04 14:15:00] Traffic switched to green
  [2025-11-04 14:20:00] Green environment stable (5 min monitoring)
  [2025-11-04 14:20:00] Deployment v1.6.0 complete ✅
  ```

#### Handoff Validation Checklist

- [ ] **Build Successful**: Docker image built without errors
- [ ] **Image Optimized**: Image size < 500MB (or reasonable for app)
- [ ] **Database Migration Successful**: Migrations completed without errors
- [ ] **Green Pods Ready**: All replicas are ready (liveness + readiness probes pass)
- [ ] **Smoke Tests Pass**: Critical endpoints return expected responses
- [ ] **Traffic Switched**: Load balancer routes traffic to green environment
- [ ] **Initial Monitoring Stable**: No errors or anomalies in first 5 minutes

---

### Step 3: Post-Deployment Monitoring

**Agent**: `monitoring-specialist` (Pod 4)
**Duration**: 24 hours (intensive: 2 hours, passive: 22 hours)
**Execution Mode**: Direct (automated monitoring + manual checks)

#### Input
- Deployed version (v1.6.0)
- Baseline metrics (from pre-deployment)
- Monitoring dashboards

#### Tasks

##### 3a. Intensive Monitoring (First 2 Hours)

**Monitor every 5 minutes**:

1. **Error Rate**
   ```
   Query: error_rate{app="myapp",version="green"}
   Threshold: <= baseline + 1%
   Alert if: error_rate > baseline + 1% for 5 consecutive minutes
   ```

2. **Latency (P95, P99)**
   ```
   Query: http_request_duration_seconds{quantile="0.95"}
   Threshold: <= baseline + 20%
   Alert if: P95 > baseline * 1.2 for 10 consecutive minutes
   ```

3. **Request Rate**
   ```
   Query: http_requests_total{app="myapp"}
   Expectation: Similar to baseline (traffic pattern)
   Alert if: Sudden drop > 50% (possible issue)
   ```

4. **Resource Usage**
   ```
   CPU: <= 80% average
   Memory: <= 85% average
   Disk I/O: No significant increase
   Network: No saturation
   ```

5. **Custom Business Metrics** (if applicable)
   ```
   - User signups per minute
   - Orders per minute
   - Payment success rate
   - API response success rate
   ```

6. **Log Monitoring**
   ```bash
   # Stream logs, watch for errors
   kubectl logs -f deployment/myapp-green | grep ERROR

   # Aggregate error counts
   kubectl logs deployment/myapp-green --since=1h | grep ERROR | wc -l
   ```

7. **Database Performance**
   ```
   - Query latency (P95 < 100ms)
   - Connection pool usage (< 80%)
   - Slow query log (no queries > 1 second)
   - Replication lag (< 5 seconds, if using replicas)
   ```

##### 3b. User Feedback Monitoring

1. **Support Tickets**
   - Monitor support ticket queue (any spike in issues?)
   - Check for new error reports related to deployment

2. **Social Media / User Reports**
   - Monitor Twitter, forums for user complaints
   - Check Slack community channels

3. **Analytics**
   - Monitor user engagement metrics (active users, session duration)
   - Check for drop in key actions (signups, purchases)

##### 3c. Automated Alerts

Configure alerts for automatic notification:

```yaml
# Prometheus alert rules
groups:
  - name: deployment_v1.6.0
    interval: 1m
    rules:
      # Error rate spike
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "Error rate > 1% for 5 minutes"
          description: "Possible deployment issue, consider rollback"

      # Latency increase
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.3
        for: 10m
        annotations:
          summary: "P95 latency > 300ms for 10 minutes"

      # Resource exhaustion
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes{pod=~"myapp-green-.*"} / container_spec_memory_limit_bytes > 0.9
        for: 5m
        annotations:
          summary: "Memory usage > 90% for 5 minutes"
```

##### 3d. Passive Monitoring (22 Hours)

**Monitor every 1 hour**:
- Check dashboards for anomalies
- Review error logs (any new error patterns?)
- Verify metrics are within expected ranges
- Check on-call engineer hasn't been paged

#### Output Artifacts

- **`monitoring-report-v1.6.0.md`**: Monitoring summary
  ```markdown
  # Post-Deployment Monitoring Report: v1.6.0

  ## Intensive Monitoring (First 2 Hours)

  ### Error Rate
  - Baseline: 0.5%
  - Post-deployment avg: 0.4% ✅
  - Trend: Stable, slight improvement

  ### Latency (P95)
  - Baseline: 125ms
  - Post-deployment avg: 110ms ✅
  - Trend: Improved (15ms faster)

  ### Request Rate
  - Baseline: 1000 req/min
  - Post-deployment avg: 1020 req/min ✅
  - Trend: Stable, slight increase (expected from traffic growth)

  ### Resource Usage
  - CPU: 45% avg (peak 60%) ✅
  - Memory: 55% avg (peak 70%) ✅
  - Disk I/O: 200 IOPS avg ✅

  ### Database Performance
  - Query P95 latency: 85ms ✅
  - Connection pool: 40% usage ✅
  - No slow queries (> 1s) ✅

  ### Logs
  - Total errors (2 hours): 12 ✅
  - Error rate: 0.1% ✅
  - No new error types ✅

  ### User Feedback
  - Support tickets: 0 related to deployment ✅
  - Social media: No complaints ✅
  - Analytics: User engagement stable ✅

  ## Passive Monitoring (22 Hours)

  - All metrics stable ✅
  - No alerts triggered ✅
  - No user complaints ✅

  ## Status: ✅ STABLE

  ## Recommendation
  - Deployment v1.6.0 is successful
  - Decommission blue environment (keep backup for 24 more hours)
  - Continue passive monitoring for 7 days
  ```

#### Handoff Validation Checklist

- [ ] **Error Rate Stable**: No increase above baseline + 1%
- [ ] **Latency Stable**: P95 within baseline + 20%
- [ ] **Resource Usage Normal**: CPU < 80%, Memory < 85%
- [ ] **No Alerts Triggered**: No critical or warning alerts
- [ ] **User Feedback Positive**: No increase in support tickets or complaints
- [ ] **Database Performance Stable**: Query latency within expected range
- [ ] **Logs Clean**: No new error types or patterns

#### Quality Gate

**Health Check Criteria** (first 2 hours):
```
Error Rate:
- <= baseline + 1% ✅

Latency (P95):
- <= baseline + 20% ✅

Resource Usage:
- CPU < 80% ✅
- Memory < 85% ✅

Alerts:
- No critical alerts ✅

User Feedback:
- No increase in support tickets ✅
```

**Threshold**:
- **All checks pass**: ✅ Deployment successful
- **Any check fails**: ⚠️ Investigate, consider rollback

**Automatic Rollback Triggers** (monitored for 2 hours):
```
Critical (immediate rollback):
- Error rate > baseline + 5%
- P95 latency > baseline + 100%
- Memory usage > 95% for 5 minutes
- CPU usage > 95% for 5 minutes

Warning (investigate, manual rollback decision):
- Error rate: baseline + 1% to + 5%
- P95 latency: baseline + 20% to + 100%
- Support tickets > 5 related to deployment
```

---

### Step 4: Cleanup & Finalization

**Agent**: `release-manager` (Pod 4)
**Duration**: 15-30 minutes
**Execution Mode**: Direct

**Note**: This step runs after 24 hours of successful monitoring.

#### Input
- Monitoring report (from Step 3)
- Deployment artifacts

#### Tasks

1. **Decommission Old Version (Blue)**
   ```bash
   # Scale down blue deployment (after 24 hours of green stability)
   kubectl scale deployment myapp-blue --replicas=0

   # After 7 days (if still stable), delete blue deployment
   kubectl delete deployment myapp-blue
   ```

2. **Update Documentation**
   - Update `docs/deployment-history.md`:
     ```markdown
     ## v1.6.0 - 2025-11-04
     - Deployed: 2025-11-04 14:00 UTC
     - Strategy: Blue-Green
     - Duration: 20 minutes (build to traffic switch)
     - Issues: None
     - Rollback: Not needed
     - Status: Successful ✅
     ```

3. **Archive Deployment Logs**
   - Move deployment logs to archive:
     ```bash
     mv deployment-log-v1.6.0.txt deployments/archive/2025-11-04/
     mv monitoring-report-v1.6.0.md deployments/archive/2025-11-04/
     ```

4. **Update Runbook** (if needed)
   - Add new features to troubleshooting guide
   - Update common issues section
   - Add new configuration options

5. **Tag Stable Release**
   ```bash
   # Tag as stable after 7 days of successful production run
   git tag -a v1.6.0-stable -m "Stable release after 7 days in production"
   git push origin v1.6.0-stable
   ```

6. **Notify Stakeholders**
   - Send deployment success notification:
     ```
     Subject: ✅ Deployment v1.6.0 Successful

     The deployment of v1.6.0 to production was successful.

     - Deployed: 2025-11-04 14:00 UTC
     - Duration: 20 minutes
     - Monitoring: 24 hours complete, all metrics stable
     - Issues: None
     - Rollback: Not needed

     Key improvements:
     - API latency reduced by 15ms (P95)
     - New feature X now available
     - Bug fix for issue Y

     Next steps:
     - Continue passive monitoring for 7 days
     - Decommission blue environment after 7 days
     ```

#### Output Artifacts

- **`deployment-summary-v1.6.0.md`**: Final deployment summary
  ```markdown
  # Deployment Summary: v1.6.0

  ## Overview
  - Version: v1.6.0
  - Deployed: 2025-11-04 14:00 UTC
  - Strategy: Blue-Green
  - Duration: 20 minutes
  - Status: ✅ Successful

  ## Changes
  - Added feature X (user authentication)
  - Fixed bug Y (null pointer error)
  - Improved performance (API latency -15ms)

  ## Pre-Deployment
  - Quality gates: All passed ✅
  - Staging tests: 100% pass rate ✅
  - Security scan: 0 vulnerabilities ✅
  - Database migration: 90 seconds ✅

  ## Deployment
  - Build: 2 minutes
  - Migration: 90 seconds
  - Deployment: 5 minutes
  - Traffic switch: 5 minutes
  - Total: 20 minutes

  ## Post-Deployment (24 Hours)
  - Error rate: 0.4% (baseline: 0.5%) ✅
  - P95 latency: 110ms (baseline: 125ms) ✅
  - CPU usage: 45% avg ✅
  - Memory usage: 55% avg ✅
  - Support tickets: 0 related issues ✅

  ## Issues
  - None

  ## Rollback
  - Not needed

  ## Lessons Learned
  - Blue-green deployment worked smoothly
  - Database migration was fast (well-optimized)
  - Pre-deployment checks caught potential issue (staging test failure)

  ## Recommendations
  - Continue using blue-green for future deployments
  - Maintain 24-hour monitoring window
  - Keep backup environment for 7 days (de-risk)
  ```

---

## Error Handling

This section defines recovery procedures when deployment fails.

### Pre-Deployment Checks Fail (Step 1)

**Symptoms**:
- Quality gates don't pass
- Staging tests fail
- Security vulnerabilities detected

**Recovery Procedure**:

#### Quality Gates Fail
```
1. Identify which gate failed (code review, tests, security)
2. Return to previous SOP:
   - Code review < 90 → Return to feature_development.md Step 5
   - Tests fail → Return to feature_development.md Step 4
   - Security vulnerabilities → Return to feature_development.md Step 5b
3. Fix issue, re-run quality gates
4. Re-attempt deployment after passing all gates
```

#### Staging Tests Fail
```
1. Analyze failing test:
   - Is test correct? (or is there a test bug)
   - Is code correct? (or is there a regression)
2. Fix issue (code or test)
3. Re-run staging tests
4. Repeat until 100% pass rate
5. Do NOT deploy to production until staging tests pass
```

#### Infrastructure Unhealthy
```
1. Fix infrastructure issue first (database, cluster, etc.)
2. Verify health checks pass
3. Re-attempt pre-deployment checks
4. If infrastructure issue persists:
   - Postpone deployment to maintenance window
   - Escalate to devops-engineer for urgent resolution
```

---

### Build Fails (Step 2a)

**Symptoms**:
- Docker build fails
- Image size too large (> 1GB)
- Dependency installation fails

**Recovery Procedure**:

#### Build Errors
```
1. Check build logs for specific error
2. Common issues:
   - Missing dependency → Add to package.json
   - TypeScript compilation error → Fix code
   - Dockerfile syntax error → Fix Dockerfile
3. Fix issue locally, test build
4. Re-run CI/CD build
5. Repeat until build succeeds
```

#### Image Size Too Large
```
1. Optimize Dockerfile:
   - Use multi-stage build
   - Remove development dependencies
   - Use smaller base image (alpine)
2. Remove unnecessary files (.dockerignore)
3. Rebuild and verify size
```

---

### Database Migration Fails (Step 2b)

**Symptoms**:
- Migration errors (SQL syntax error, constraint violation)
- Migration takes too long (> 5 minutes)
- Table locks causing production downtime

**Recovery Procedure**:

#### Migration Errors
```
1. STOP deployment immediately (do not proceed)
2. Restore database from backup:
   psql myapp_production < backup-pre-v1.6.0-20251104140000.sql
3. Investigate migration error:
   - Test migration on staging (with production-like data)
   - Fix SQL syntax or logic error
4. Re-test migration on staging
5. Re-attempt deployment after migration succeeds on staging
```

#### Migration Too Slow
```
1. Analyze migration query:
   EXPLAIN ANALYZE [migration query]
2. Common causes:
   - Missing indexes → Add indexes before migration
   - Full table scan → Optimize query
   - Large dataset → Batch migration (chunks)
3. Optimize migration:
   - Add indexes first (in separate migration)
   - Use batch processing (migrate 1000 rows at a time)
   - Run during low-traffic window
4. Re-test migration with optimizations
```

---

### Deployment Fails (Step 2c)

**Symptoms**:
- Pods fail to start (CrashLoopBackOff)
- Readiness probe fails
- Smoke tests fail

**Recovery Procedure**:

#### Pods Fail to Start
```
1. Check pod logs:
   kubectl logs deployment/myapp-green

2. Common issues:
   - Missing environment variable → Add to deployment manifest
   - Database connection fails → Check connection string
   - Port already in use → Fix port configuration
   - OOMKilled → Increase memory limit

3. Fix issue in deployment manifest
4. Re-deploy green environment
5. Verify pods start successfully
```

#### Readiness Probe Fails
```
1. Check /health endpoint:
   kubectl exec -it myapp-green-<pod> -- curl localhost:3000/health

2. Common issues:
   - Application not ready → Increase initialDelaySeconds
   - Database migration incomplete → Wait for migration job
   - Dependency unavailable → Check external services

3. Fix issue (code or configuration)
4. Re-deploy
```

#### Smoke Tests Fail
```
1. Analyze failing smoke test
2. Common issues:
   - API returns 500 → Check application logs
   - Authentication fails → Check JWT secret configuration
   - Database query fails → Check migration status

3. Fix issue
4. Re-run smoke tests
5. Do NOT switch traffic until smoke tests pass
```

---

### Health Checks Fail Post-Deployment (Step 3)

**Symptoms**:
- Error rate spikes
- Latency increases significantly
- Resource exhaustion (CPU/Memory > 90%)

**Recovery Procedure**:

#### Immediate Rollback
```bash
# Rollback: Switch traffic back to blue (old version)
kubectl patch service myapp -p '{"spec":{"selector":{"version":"blue"}}}'

# Verify rollback successful
kubectl get endpoints myapp  # Should show blue pod IPs
curl https://api.example.com/health  # Should return 200 OK

# Monitor for 5 minutes
# Verify error rate returns to baseline
# Verify latency returns to baseline

# Notify team
echo "ROLLBACK: Deployment v1.6.0 rolled back due to health check failure" | slack-notify
```

#### Post-Rollback Analysis
```
1. Capture evidence:
   - Logs from green environment (last 1 hour)
   - Monitoring data (error rate, latency, resource usage)
   - Database slow query logs

2. Investigate root cause:
   - New code introduced bug → Return to bug_fix.md
   - Configuration issue → Fix configuration, re-deploy
   - Database migration issue → Rollback migration, fix, re-attempt
   - Resource limits too low → Increase limits, re-deploy

3. Fix root cause
4. Re-test on staging
5. Re-attempt deployment
```

---

### Rollback Procedure (Detailed)

**When to Rollback**:
- Error rate > baseline + 5%
- P95 latency > baseline + 100%
- Memory/CPU usage > 95% for 5 minutes
- Critical functionality broken
- Database corruption detected
- Security vulnerability exploited

**Rollback Steps**:

```bash
# 1. Immediate traffic switch (< 1 minute)
kubectl patch service myapp -p '{"spec":{"selector":{"version":"blue"}}}'

# 2. Verify rollback (< 2 minutes)
# Check health
curl https://api.example.com/health

# Check error rate (should drop to baseline within 5 minutes)
# Check latency (should return to baseline)

# 3. Database rollback (if needed, < 5 minutes)
# Only if migration caused issue
psql myapp_production < backup-pre-v1.6.0-20251104140000.sql

# Or run rollback migration
npm run migrate:down

# 4. Notify team
# Slack, email, incident ticket

# 5. Cleanup failed deployment
kubectl delete deployment myapp-green

# 6. Investigate root cause (see Post-Rollback Analysis)
```

**Rollback Decision Matrix**:

| Symptom | Severity | Action | Timeframe |
|---------|----------|--------|-----------|
| Error rate > baseline + 5% | Critical | Immediate rollback | < 1 min |
| P95 latency > baseline + 100% | Critical | Immediate rollback | < 1 min |
| Memory > 95% for 5 min | Critical | Immediate rollback | < 2 min |
| Critical feature broken | Critical | Immediate rollback | < 2 min |
| Error rate: baseline + 1% to + 5% | Warning | Investigate, manual decision | 10 min |
| P95 latency: baseline + 20% to + 100% | Warning | Investigate, manual decision | 15 min |
| Support tickets increase | Warning | Monitor, prepare for rollback | 30 min |

---

## Success Metrics

Track these metrics to measure deployment SOP effectiveness:

### Primary Metrics

#### Deployment Success Rate
```
Target: > 95% (19 out of 20 deployments succeed without rollback)

Measurement:
- Count deployments that required rollback
- Calculate: (successful_deployments / total_deployments) * 100
```

#### Deployment Duration
```
Target:
- Standard release: < 30 minutes (build to traffic switch)
- Hotfix: < 15 minutes

Measurement:
- Time from CI/CD pipeline start to traffic switch complete
```

#### Mean Time to Rollback (MTTR)
```
Target: < 5 minutes (from detection to traffic switched back)

Measurement:
- Time from health check failure detection to rollback complete
```

#### Downtime
```
Target: 0 seconds (zero-downtime deployment)

Measurement:
- Monitor request failures during deployment
- Count 5xx errors during deployment window
- Acceptable: < 0.1% error rate spike (transient errors during switch)
```

#### Post-Deployment Incident Rate
```
Target: < 5% (fewer than 1 in 20 deployments have post-deployment issues)

Measurement:
- Count deployments with issues discovered in first 24 hours
- Calculate: (deployments_with_issues / total_deployments) * 100
```

### Secondary Metrics

#### Pre-Deployment Check Effectiveness
```
Target: > 90% (9 out of 10 issues caught in pre-deployment)

Measurement:
- Count issues found in pre-deployment checks
- Count issues found post-deployment
- Calculate: (pre_deployment_issues / total_issues) * 100
```

#### Rollback Success Rate
```
Target: 100% (all rollbacks succeed)

Measurement:
- Count rollback attempts
- Count successful rollbacks (system returns to baseline)
- Calculate: (successful_rollbacks / total_rollbacks) * 100
```

#### Deployment Frequency
```
Baseline: Weekly (or biweekly)
Target: Multiple times per week (with automation)

Measurement:
- Count deployments per week
- Track trend over time
```

### Tracking Dashboard

**Example Metrics Dashboard** (update monthly):

```yaml
month: 2025-11
deployments: 12

deployment_success_rate:
  value: 91.7%  # 11 of 12 succeeded without rollback
  target: 95%
  status: ⚠️ Below target (1 rollback occurred)

avg_deployment_duration:
  value: 22 minutes
  target: 30 minutes
  status: ✅ Within target

mttr_rollback:
  value: 3 minutes (1 rollback)
  target: 5 minutes
  status: ✅ Excellent

downtime:
  value: 0 seconds (all deployments zero-downtime)
  target: 0 seconds
  status: ✅ Perfect

post_deployment_incident_rate:
  value: 8.3%  # 1 of 12 had post-deployment issue
  target: 5%
  status: ⚠️ Above target

pre_deployment_check_effectiveness:
  value: 95%  # Caught 19 of 20 issues before production
  target: 90%
  status: ✅ Above target

rollback_success_rate:
  value: 100%  # 1 rollback attempt, 1 succeeded
  target: 100%
  status: ✅ Perfect

deployment_frequency:
  value: 2.8 per week (12 deployments / 4.3 weeks)
  baseline: 1 per week
  status: ✅ Improved

insights:
  - "1 rollback due to database migration issue (table lock)"
  - "Pre-deployment checks caught 95% of issues (very effective)"
  - "Deployment duration improved 30% compared to last month (28 min → 22 min)"
  - "Recommendation: Add database migration validation to pre-deployment checks"
```

---

## Compliance Checklist

Use this checklist to verify SOP compliance for each deployment:

### Pre-Deployment (Step 1)
- [ ] All quality gates passed (code review >= 90, tests >= 80%)
- [ ] Infrastructure health verified (all systems operational)
- [ ] Staging tests passed (100% E2E pass rate)
- [ ] Database migrations tested (on production-like data)
- [ ] Security scan completed (0 P0/P1 vulnerabilities)
- [ ] Capacity verified (cluster has 20%+ buffer)
- [ ] pre-deployment-checklist.md created and reviewed

### Build & Deployment (Step 2)
- [ ] Docker image built successfully
- [ ] Image optimized (size reasonable, multi-stage build)
- [ ] Database backup created (before migration)
- [ ] Database migration successful (no errors)
- [ ] Green environment deployed (all pods ready)
- [ ] Smoke tests passed (critical endpoints work)
- [ ] Traffic switched to green (load balancer updated)
- [ ] deployment-log-v1.x.x.txt created

### Post-Deployment Monitoring (Step 3)
- [ ] Intensive monitoring completed (first 2 hours)
- [ ] Error rate stable (<= baseline + 1%)
- [ ] Latency stable (P95 <= baseline + 20%)
- [ ] Resource usage normal (CPU < 80%, Memory < 85%)
- [ ] No critical alerts triggered
- [ ] User feedback positive (no increase in support tickets)
- [ ] monitoring-report-v1.x.x.md created

### Cleanup & Finalization (Step 4)
- [ ] Old version decommissioned (after 24-48 hours)
- [ ] Documentation updated (deployment history, runbook)
- [ ] Deployment logs archived
- [ ] Stable release tagged (after 7 days)
- [ ] Stakeholders notified (success notification)
- [ ] deployment-summary-v1.x.x.md created

---

## Example Walkthrough

(For brevity, I'll provide a condensed walkthrough as this document is already comprehensive)

### Deployment: v1.6.0 - Authentication Feature

**Timeline**:
- **14:00 UTC**: Pre-deployment checks start
- **14:30 UTC**: Checks complete, approved for deployment
- **14:35 UTC**: Build starts
- **14:45 UTC**: Green environment deployed
- **14:50 UTC**: Traffic switched to green
- **15:00 UTC**: Deployment complete, monitoring starts
- **Next 24h**: Passive monitoring
- **Result**: ✅ Successful deployment, no rollback needed

(Detailed steps follow the SOP procedures outlined above)

---

## References

### Related SOPs
- [feature_development.md](./feature_development.md): Complete feature development workflow
- [bug_fix.md](./bug_fix.md): Bug fix and hotfix procedures

### Agent Documentation
- `.claude/agents/qa-validator.md`: Pre-deployment validation
- `.claude/agents/cicd-manager.md`: CI/CD and deployment automation
- `.claude/agents/monitoring-specialist.md`: Post-deployment monitoring
- `.claude/agents/release-manager.md`: Release management

### AIT42 Documentation
- [README.md](../../README.md): AIT42 system overview
- [.claude/memory/README.md](../README.md): Memory system

### Standards & Best Practices
- [Blue-Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Canary Deployment](https://martinfowler.com/bliki/CanaryRelease.html)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [DORA Metrics](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance)

---

**Document Control**

- **Version**: 1.0.0
- **Approved by**: AIT42 System
- **Next Review Date**: 2025-12-04 (30 days)
- **Change Log**:
  - 2025-11-04: Initial version (v1.0.0)

---

*This SOP is a living document and will be updated based on deployment experiences and lessons learned.*
