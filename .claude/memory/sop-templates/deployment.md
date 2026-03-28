# SOP: Deployment

## Overview
Standard Operating Procedure for deploying code to production with blue-green strategy and automated rollback.

## Deployment Types

### 1. Standard Deployment
- **Frequency**: Weekly release cycle
- **Risk**: Low-Medium
- **Approval**: Automated if all gates pass
- **Rollback**: Blue-green switch

### 2. Hotfix Deployment
- **Frequency**: As needed (P0/P1 bugs)
- **Risk**: Medium-High
- **Approval**: Tech lead required
- **Rollback**: Immediate if issues detected

### 3. Feature Flag Deployment
- **Frequency**: Continuous
- **Risk**: Low
- **Approval**: Automated
- **Rollback**: Toggle feature flag

---

## Pre-Deployment Checklist

### Code Quality Gates
- [ ] All tests pass (unit, integration, E2E)
- [ ] Test coverage >= 80%
- [ ] Code review score >= 90/100
- [ ] No high/critical security vulnerabilities
- [ ] Performance benchmarks meet SLA

### Documentation
- [ ] CHANGELOG.md updated
- [ ] API documentation updated (if applicable)
- [ ] Deployment runbook reviewed
- [ ] Rollback procedure verified

### Infrastructure
- [ ] Staging environment matches production
- [ ] Database migrations tested
- [ ] Configuration variables verified
- [ ] Secrets/credentials rotated if needed

### Stakeholder Communication
- [ ] Release notes prepared
- [ ] Stakeholders notified of deployment window
- [ ] Support team briefed on changes
- [ ] Monitoring dashboards ready

---

## Deployment Workflow

### Stage 1: Pre-Deployment Validation
**Responsible**: cicd-manager, qa-validator

**Activities**:
- [ ] Run full CI/CD pipeline
- [ ] Execute all quality gates
- [ ] Generate deployment artifacts
- [ ] Verify artifact integrity
- [ ] Tag release in version control

**Output**: Validated deployment artifacts

**Quality Gate**: All CI/CD checks pass

**Time**: 10-30 minutes

---

### Stage 2: Staging Deployment
**Responsible**: devops-engineer

**Activities**:
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Execute integration tests
- [ ] Verify database migrations
- [ ] Check configuration
- [ ] Performance testing

**Output**: Staging deployment successful

**Quality Gate**:
- Smoke tests pass
- Integration tests pass
- No errors in logs (last 10 minutes)
- Health checks pass

**Time**: 15-45 minutes

---

### Stage 3: Production Deployment (Blue-Green)
**Responsible**: devops-engineer, release-manager

**Blue-Green Strategy**:
1. **Prepare Green Environment**
   - [ ] Deploy new version to green environment
   - [ ] Run health checks on green
   - [ ] Verify green is ready to receive traffic

2. **Switch Traffic Gradually**
   - [ ] Route 10% traffic to green (canary)
   - [ ] Monitor for 5 minutes
   - [ ] Increase to 25% if stable
   - [ ] Increase to 50% if stable
   - [ ] Increase to 100% if stable

3. **Monitor and Validate**
   - [ ] Watch error rates
   - [ ] Check response times
   - [ ] Verify business metrics
   - [ ] Monitor user complaints

**Output**: New version serving 100% traffic

**Time**: 30-60 minutes

---

### Stage 4: Post-Deployment Validation
**Responsible**: monitoring-specialist, qa-validator

**Activities**:
- [ ] Run automated smoke tests in production
- [ ] Verify critical user flows
- [ ] Check error rates (< baseline)
- [ ] Validate response times (< SLA)
- [ ] Monitor business KPIs
- [ ] Review security logs

**Monitoring Duration**:
- First 10 minutes: Intensive monitoring
- First hour: Active monitoring
- First 24 hours: Passive monitoring

**Output**: Production health report

**Quality Gate**:
- Error rate < 5% (or < baseline)
- Response time < SLA (p95 < 500ms)
- No critical errors
- Business KPIs stable

---

### Stage 5: Rollback (If Needed)
**Responsible**: incident-responder, devops-engineer

**Automatic Rollback Triggers**:
- Error rate > 5% (sustained for 2 minutes)
- Response time p95 > 3 seconds
- Health check failures
- Database connection failures
- Critical business metric drop (>10%)

**Manual Rollback Triggers**:
- Security vulnerability discovered
- Data corruption detected
- Critical bug reported
- Stakeholder request

**Rollback Procedure**:
1. **Execute Blue-Green Switch**
   - [ ] Switch traffic back to blue (old version)
   - [ ] Verify blue is serving traffic
   - [ ] Monitor stability

2. **Investigate Issues**
   - [ ] Capture logs from green
   - [ ] Document issues
   - [ ] Initiate incident response

3. **Communicate**
   - [ ] Notify stakeholders of rollback
   - [ ] Update status page
   - [ ] Schedule post-mortem

**Rollback Time**: < 5 minutes (automated)

---

## Database Migration Strategy

### Forward-Compatible Migrations
All database migrations must be forward-compatible:
1. **Deploy migration first** (make changes additive)
2. **Deploy code** (start using new schema)
3. **Clean up old schema** (next deployment)

### Example: Renaming a Column
**Bad** (breaks blue-green):
```sql
ALTER TABLE users RENAME COLUMN name TO full_name;
```

**Good** (forward-compatible):
```sql
-- Deployment 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- Deployment 2: Update code to write to both columns

-- Deployment 3: Stop writing to old column

-- Deployment 4: Remove old column
ALTER TABLE users DROP COLUMN name;
```

### Migration Testing
- [ ] Test migration on production-like data
- [ ] Measure migration duration
- [ ] Verify rollback procedure
- [ ] Check for locking issues

---

## Smoke Tests

### Critical User Flows to Test
- [ ] Homepage loads
- [ ] User authentication
- [ ] Core API endpoints respond
- [ ] Database connectivity
- [ ] External service integrations
- [ ] Payment processing (if applicable)

### Automated Smoke Test Suite
Run immediately after deployment:
```bash
npm run smoke-tests:production
```

**Expected Duration**: < 5 minutes
**Pass Criteria**: 100% pass rate

---

## Monitoring & Alerting

### Metrics to Monitor

**Application Metrics**:
- Request rate (requests/second)
- Error rate (%)
- Response time (p50, p95, p99)
- Active users

**Infrastructure Metrics**:
- CPU utilization (%)
- Memory usage (%)
- Disk I/O
- Network I/O

**Business Metrics**:
- Conversion rate
- Revenue
- User sign-ups
- Feature usage

### Alert Thresholds

**Critical Alerts** (Immediate Action):
- Error rate > 5%
- Response time p95 > 3 seconds
- Health checks failing
- Memory usage > 90%

**Warning Alerts** (Monitor Closely):
- Error rate > 2%
- Response time p95 > 1 second
- CPU usage > 70%
- Disk usage > 80%

---

## Rollback Decision Matrix

| Condition | Severity | Action | Timeframe |
|-----------|----------|--------|-----------|
| Error rate >10% | P0 | Auto-rollback | Immediate |
| Error rate 5-10% | P1 | Manual rollback | 5 minutes |
| Response time >5s | P0 | Auto-rollback | Immediate |
| Response time >3s | P1 | Manual rollback | 10 minutes |
| Critical bug reported | P0 | Manual rollback | 15 minutes |
| Security vulnerability | P0 | Manual rollback | Immediate |
| Business metric drop >20% | P1 | Manual rollback | 15 minutes |

---

## Post-Deployment Activities

### Immediate (0-1 hour)
- [ ] Monitor error rates and response times
- [ ] Verify smoke tests pass
- [ ] Check user feedback channels
- [ ] Review deployment logs

### Short-term (1-24 hours)
- [ ] Monitor business KPIs
- [ ] Analyze performance metrics
- [ ] Review security logs
- [ ] Collect user feedback

### Long-term (1-7 days)
- [ ] Conduct deployment retrospective
- [ ] Update runbooks based on issues
- [ ] Document lessons learned
- [ ] Calculate DORA metrics (deployment frequency, lead time, MTTR, change failure rate)

---

## Communication Plan

### Pre-Deployment
**Audience**: Engineering team, Product, Support, Stakeholders
**Message**:
- Deployment window
- Expected changes
- Potential impact
- Contact person

**Timing**: 24 hours before deployment

### During Deployment
**Audience**: Engineering team, On-call
**Message**:
- Deployment started
- Progress updates every 15 minutes
- Any issues encountered

**Channel**: Slack, Email

### Post-Deployment
**Audience**: All stakeholders
**Message**:
- Deployment complete
- Changes deployed
- Known issues (if any)
- Next steps

**Timing**: Within 1 hour of completion

---

## Deployment Metrics (DORA)

### Track These Metrics
1. **Deployment Frequency**
   - Target: Daily (for mature teams)
   - Minimum: Weekly

2. **Lead Time for Changes**
   - Target: < 1 day (commit to production)
   - Acceptable: < 1 week

3. **Mean Time to Recovery (MTTR)**
   - Target: < 1 hour
   - Acceptable: < 4 hours

4. **Change Failure Rate**
   - Target: < 5%
   - Acceptable: < 15%

### Continuous Improvement
- Review metrics monthly
- Identify bottlenecks
- Implement process improvements
- Celebrate wins! 🎉

---

## Deployment Checklist Template

Copy this checklist for each deployment:

```markdown
## Deployment: [Version] - [Date]

### Pre-Deployment
- [ ] All tests pass
- [ ] Code review >= 90/100
- [ ] CHANGELOG updated
- [ ] Stakeholders notified

### Staging
- [ ] Deployed to staging
- [ ] Smoke tests pass
- [ ] Integration tests pass

### Production
- [ ] Deploy to green environment
- [ ] Health checks pass on green
- [ ] Switch 10% traffic → Monitor 5 min
- [ ] Switch 25% traffic → Monitor 5 min
- [ ] Switch 50% traffic → Monitor 5 min
- [ ] Switch 100% traffic → Monitor 10 min

### Post-Deployment
- [ ] Smoke tests in production pass
- [ ] Error rate < baseline
- [ ] Response time < SLA
- [ ] Stakeholders notified of completion

### Monitoring (First 24h)
- [ ] Error rates stable
- [ ] Response times stable
- [ ] Business KPIs stable
- [ ] No user complaints

### Rollback Plan
- [ ] Rollback procedure tested
- [ ] Blue environment maintained for 24h
- [ ] Documented rollback triggers

**Deployment Lead**: [Name]
**Start Time**: [HH:MM]
**End Time**: [HH:MM]
**Status**: [SUCCESS/ROLLED_BACK]
```

---

## Expected Impact

Following this SOP is expected to:
- Reduce deployment failures by 80%
- Decrease MTTR from hours to minutes
- Increase deployment frequency by 3x
- Improve deployment confidence

---

## References

- Blue-Green Deployment: https://martinfowler.com/bliki/BlueGreenDeployment.html
- Canary Releases: https://martinfowler.com/bliki/CanaryRelease.html
- DORA Metrics: https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance

---

**Version**: 1.0
**Last Updated**: 2025-11-12
**Maintained By**: AIT42 self-healing-coordinator
