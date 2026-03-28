# SOP: Bug Fix

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

This SOP defines the standardized workflow for bug fixes in AIT42 v1.4.0, from triage to production deployment. Bug fixes require faster iterations (1-3 hours) compared to feature development, with focus on root cause analysis and regression prevention.

### Scope

- **Applies to**: Production bugs, regression bugs, defects
- **Does NOT apply to**: New features (see `feature_development.md`), infrastructure changes, security incidents (see `incident_response.md`)
- **Severity Levels**:
  - **P0 (Critical)**: Production down, data loss, security breach → **Immediate hotfix** (< 4 hours)
  - **P1 (High)**: Major functionality broken, significant user impact → **Urgent fix** (< 24 hours)
  - **P2 (Medium)**: Minor functionality issue, workaround exists → **Standard fix** (< 1 week)
  - **P3 (Low)**: Cosmetic issue, no user impact → **Backlog** (next sprint)

### Expected Outcome

- ✅ Bug fixed and verified in production
- ✅ Root cause identified and documented
- ✅ Regression tests added (prevent recurrence)
- ✅ No new bugs introduced (regression testing)
- ✅ Post-mortem completed (for P0/P1 bugs)

### Typical Duration

- **P0 (Critical)**: 30 minutes - 4 hours (hotfix process)
- **P1 (High)**: 2-6 hours
- **P2 (Medium)**: 4-8 hours
- **P3 (Low)**: 2-4 hours (when prioritized)

---

## Prerequisites

Before starting this SOP, verify:

### Bug Report Requirements
- [ ] Bug is reproducible (steps to reproduce documented)
- [ ] Severity level is assigned (P0/P1/P2/P3)
- [ ] Impact is documented (affected users, features, systems)
- [ ] Environment is specified (production, staging, development)
- [ ] Expected vs. actual behavior is clear

### System Readiness
- [ ] Development environment is configured
- [ ] Access to production logs (if P0/P1)
- [ ] Access to monitoring dashboards (Grafana, CloudWatch, etc.)
- [ ] Git repository is accessible
- [ ] CI/CD pipeline is operational

### Resource Availability
- [ ] incident-responder agent is available (for triage)
- [ ] bug-fixer agent is available
- [ ] test-generator agent is available
- [ ] Coordinator agent is responsive

### Emergency Procedures (P0 only)
- [ ] Rollback procedure is documented
- [ ] Emergency contacts are available
- [ ] Communication channels are active (Slack incident channel)

---

## Workflow Steps

### Step 0: Triage (P0/P1 only, 5-15 minutes)

**Agent**: `incident-responder` (Pod 4)
**Duration**: 5-15 minutes
**Execution Mode**: Direct (urgent, no Tmux)

**Note**: P2/P3 bugs skip this step and proceed directly to Step 1.

#### Input
- Bug report (issue ticket, Slack message, monitoring alert)
- Initial symptoms (error logs, user reports)

#### Tasks

1. **Assess Severity**
   - Confirm P0/P1 severity based on impact
   - Determine affected systems and user count
   - Estimate business impact (revenue loss, SLA breach)

2. **Immediate Mitigation (P0 only)**
   - If possible, apply temporary workaround:
     - Enable maintenance mode (user-facing message)
     - Route traffic to healthy servers
     - Disable broken feature (feature flag)
     - Rollback to last known good version (if critical)
   - **Goal**: Stop the bleeding first, fix properly later

3. **Gather Context**
   - Collect error logs (last 30 minutes)
   - Check monitoring dashboards (error rate, latency, resource usage)
   - Identify when issue started (correlate with recent deployments)
   - Check for related incidents (similar errors)

4. **Create Incident Ticket**
   - Document findings in incident ticket
   - Assign priority and owner
   - Notify stakeholders (Slack, email)

#### Output Artifacts

- **`incident-report-draft.md`**: Initial incident report
  - Severity: P0/P1
  - Affected systems: [list]
  - User impact: [description]
  - Started at: [timestamp]
  - Error logs: [links or snippets]
  - Temporary mitigation: [applied workaround]
  - Next steps: Proceed to Step 1 (Investigation)

#### Handoff Validation Checklist

- [ ] **Severity Confirmed**: P0/P1 verified based on impact assessment
- [ ] **Immediate Mitigation Applied** (P0): Workaround deployed or rollback completed
- [ ] **Context Gathered**: Logs, metrics, deployment history collected
- [ ] **Stakeholders Notified**: Incident ticket created, Slack message sent
- [ ] **Clear Next Steps**: Investigation assigned to bug-fixer

#### Decision Point

**P0 Critical**: If immediate rollback resolves issue:
- Deploy rollback → Monitor for 15 minutes → If stable, proceed to Step 1 for root cause analysis
- If rollback doesn't resolve issue → Proceed to Step 1 immediately

**P1 High**: Proceed to Step 1 (no rollback needed)

---

### Step 1: Investigation & Root Cause Analysis

**Agent**: `bug-fixer` (Pod 2)
**Duration**: 30 minutes - 2 hours (depends on complexity)
**Execution Mode**: Direct (single agent)

#### Input
- Bug report (from triage or issue ticket)
- Error logs (from Step 0 or issue description)
- Steps to reproduce

#### Tasks

1. **Reproduce the Bug**
   - Follow steps to reproduce in local/staging environment
   - Verify bug matches reported behavior
   - Document reproduction steps (if not already documented)
   - If bug cannot be reproduced:
     - Check environment differences (data, config, versions)
     - Try reproducing in production-like environment
     - Request additional information from reporter

2. **Analyze Error Logs**
   - Search for error stack traces
   - Identify error source (file, line number)
   - Check for patterns (frequency, conditions)
   - Correlate with monitoring data (CPU spikes, memory leaks)

3. **Identify Root Cause**
   - Use debugging tools (debugger, logging, profiling)
   - Common root causes:
     - **Logic errors**: Incorrect conditional, off-by-one error
     - **Null/undefined**: Missing validation, unhandled edge case
     - **Race conditions**: Async/await issue, concurrent access
     - **Data issues**: Invalid data, schema mismatch
     - **Configuration**: Wrong environment variable, missing secret
     - **Dependency**: Library bug, version mismatch
     - **Resource exhaustion**: Memory leak, connection pool exhaustion
   - Trace execution path leading to bug
   - Identify root cause (not just symptom)

4. **Determine Fix Strategy**
   - **Quick fix**: Patch immediate issue (for P0/P1)
   - **Proper fix**: Address root cause (may take longer)
   - **Refactor**: Fix underlying design issue (if root cause is architectural)
   - **Data fix**: Correct invalid data in database (if data corruption)
   - For P0: Apply quick fix first, then proper fix later

5. **Document Root Cause Analysis**
   - Write RCA document (Root Cause Analysis)
   - Include:
     - Symptom (what users experienced)
     - Root cause (why it happened)
     - Contributing factors (what enabled the bug)
     - Fix strategy (how to resolve)

#### Output Artifacts

- **`rca-[bug-id].md`**: Root Cause Analysis document
  ```markdown
  # Root Cause Analysis: [Bug ID]

  ## Symptom
  [What users experienced]

  ## Root Cause
  [Why it happened - technical explanation]

  ## Contributing Factors
  - [Factor 1: e.g., Missing input validation]
  - [Factor 2: e.g., Insufficient test coverage for edge cases]

  ## Fix Strategy
  [Proposed solution]

  ## Regression Prevention
  [How to prevent recurrence - e.g., add validation, add tests]

  ## Affected Code
  - File: `src/services/user.service.ts`
  - Line: 45
  - Function: `getUserById()`
  ```

#### Handoff Validation Checklist

- [ ] **Bug Reproduced**: Successfully reproduced in local/staging environment
- [ ] **Root Cause Identified**: Clear explanation of why bug occurred
- [ ] **Fix Strategy Defined**: Concrete plan to resolve bug
- [ ] **Affected Code Identified**: File, line number, function documented
- [ ] **Regression Prevention Planned**: Ideas for preventing recurrence
- [ ] **RCA Document Created**: `rca-[bug-id].md` written

#### Quality Gate

No formal quality gate at this step, but verify:
- Root cause is clear and specific (not vague like "code is wrong")
- Fix strategy is concrete and testable
- If root cause is unclear after 2 hours (P1/P2) or 1 hour (P0):
  - Escalate to `system-architect` for architectural review
  - Escalate to `senior-developer` if available
  - Request pair programming session

---

### Step 2: Implementation & Testing

**Agent**: `bug-fixer` (Pod 2)
**Duration**: 30 minutes - 2 hours
**Execution Mode**: Direct (single agent)

#### Input
- RCA document from Step 1
- Affected code location
- Fix strategy

#### Tasks

1. **Implement Fix**
   - Write code to fix root cause
   - Follow fix strategy from Step 1
   - Minimize changes (only fix the bug, don't refactor excessively)
   - Add input validation (if missing)
   - Add error handling (if missing)
   - Add logging (to help debug similar issues in future)

2. **Write Regression Test**
   - Create test case that reproduces the bug (should fail before fix)
   - Verify test passes after fix
   - Test edge cases that could trigger similar bugs
   - **Regression test is MANDATORY** (prevent recurrence)

3. **Run Existing Tests**
   - Run full test suite (unit + integration + E2E)
   - Verify no regressions introduced (all tests pass)
   - If tests fail:
     - Determine if bug fix broke existing functionality (regression)
     - Or if existing test is wrong (update test)
   - Fix any failing tests

4. **Manual Testing**
   - Test fix in local environment
   - Follow original reproduction steps → Verify bug is fixed
   - Test related functionality (ensure no side effects)
   - Test edge cases (boundary values, null, undefined, empty strings)

5. **Performance Check** (if bug is performance-related)
   - Profile before and after fix
   - Verify performance improvement (if bug was slowness)
   - Ensure fix doesn't introduce new performance issues

#### Output Artifacts

- **Fixed source code**: Modified files with bug fix
- **`tests/regression/bug-[id].test.ts`**: Regression test
  ```typescript
  describe('Bug [ID]: [Description]', () => {
    it('should [expected behavior]', () => {
      // Reproduce bug scenario
      const result = buggyFunction(edgeCaseInput);

      // Verify fix
      expect(result).toBe(expectedValue);
    });
  });
  ```

- **`fix-summary.md`**: Summary of changes
  ```markdown
  # Bug Fix Summary: [Bug ID]

  ## Files Changed
  - `src/services/user.service.ts` (10 lines changed)
  - `tests/regression/bug-123.test.ts` (new file, 25 lines)

  ## Changes
  1. Added null check for `user` object (line 45)
  2. Added error handling for database query (line 50)
  3. Added regression test for null user scenario

  ## Testing
  - Regression test: ✅ PASS
  - Full test suite: ✅ PASS (250 tests, 0 failures)
  - Manual testing: ✅ Bug fixed, no side effects

  ## Performance Impact
  - No performance impact (added null check is O(1))
  ```

#### Handoff Validation Checklist

- [ ] **Bug Fixed**: Original reproduction steps no longer trigger bug
- [ ] **Regression Test Created**: Test fails before fix, passes after fix
- [ ] **All Tests Pass**: Full test suite runs successfully (100% pass rate)
- [ ] **No Regressions**: No new bugs introduced (manual testing)
- [ ] **Code Quality**: Fix follows style guide (ESLint/Prettier)
- [ ] **Documentation Updated**: Inline comments explain fix (if non-obvious)

#### Quality Gate

**Agent**: `code-reviewer` (quick review)

**Scoring Criteria** (simplified for bug fixes):
- Correctness (40 points): Bug is fixed, root cause addressed
- No Regressions (30 points): All tests pass, no side effects
- Code Quality (20 points): Clean code, follows style guide
- Regression Test (10 points): Test prevents recurrence

**Threshold**:
- **Score >= 80**: ✅ Proceed to Step 3
- **Score < 80**: ❌ Refine fix (address issues)

**Example Quality Gate Output**:
```yaml
quality_score: 92

strengths:
  - "Root cause properly addressed (null check added)"
  - "Comprehensive regression test (covers edge cases)"
  - "No side effects (all 250 tests pass)"

issues: []

recommendation: APPROVE
```

---

### Step 3: Code Review & Verification

**Agent**: `code-reviewer` (Pod 3)
**Duration**: 15-30 minutes
**Execution Mode**: Direct (single agent)

#### Input
- Fixed source code from Step 2
- Regression test
- RCA document
- Fix summary

#### Tasks

1. **Review Code Changes**
   - Verify fix addresses root cause (not just symptom)
   - Check for potential side effects
   - Verify code quality (SOLID principles, DRY, KISS)
   - Check error handling (comprehensive)
   - Check input validation (if relevant)

2. **Review Regression Test**
   - Verify test reproduces original bug
   - Verify test is comprehensive (edge cases)
   - Verify test is deterministic (no flaky behavior)
   - Check test naming (clear description of bug)

3. **Security Check** (if bug has security implications)
   - Verify fix doesn't introduce security vulnerabilities
   - Check for injection attacks (SQL, XSS, etc.)
   - Verify authentication/authorization (if relevant)

4. **Performance Check** (if bug is performance-related)
   - Verify fix improves performance (profiling data)
   - Ensure no new performance bottlenecks

5. **Score Bug Fix**
   - Assign quality score (0-100)
   - Document issues (if any)
   - Provide recommendation (APPROVE / REQUEST_CHANGES)

#### Output Artifacts

- **`code-review-bug-[id].md`**: Code review report
  ```markdown
  # Code Review: Bug [ID]

  ## Quality Score: 94/100

  ## Strengths
  - Root cause properly addressed (null check prevents error)
  - Comprehensive regression test (3 edge cases covered)
  - Clear error message added (helpful for debugging)

  ## Issues
  - [None]

  ## Recommendation: APPROVE

  ## Notes
  - Consider adding similar null checks to related functions (preventive)
  ```

#### Handoff Validation Checklist

- [ ] **Root Cause Addressed**: Fix solves root cause (not just symptom)
- [ ] **No Side Effects**: Code review confirms no regressions
- [ ] **Regression Test Quality**: Test is comprehensive and deterministic
- [ ] **Code Quality**: Fix follows best practices
- [ ] **Security Verified**: No security vulnerabilities introduced (if applicable)
- [ ] **Quality Score >= 80**: Code review passes threshold

#### Quality Gate

**Threshold**:
- **Score >= 80**: ✅ Proceed to Step 4 (Deployment)
- **Score 70-79**: ⚠️ Minor issues, user decides (proceed or fix)
- **Score < 70**: ❌ Request changes (return to Step 2)

**For P0 (Critical)**: Lower threshold to >= 70 (speed is critical)

---

### Step 4: Deployment

**Agent**: `release-manager`, `cicd-manager` (Pod 4)
**Duration**: 15-45 minutes
**Execution Mode**: Sequential (release-manager → cicd-manager)

#### Input
- Approved bug fix (score >= 80)
- Fixed source code
- Regression test

#### Deployment Strategy by Severity

##### P0 (Critical) - Hotfix Process
```
1. Create hotfix branch: hotfix/bug-[id]
2. Build production artifacts (Docker, binaries)
3. Deploy to staging → Run smoke tests (5 minutes)
4. Deploy to production (immediate, no canary)
5. Monitor intensively (30 minutes)
6. If stable: Merge to main, tag release (vX.Y.Z+1 patch)
7. If unstable: Rollback immediately
```

**Hotfix Version**: Increment PATCH version (e.g., v1.2.3 → v1.2.4)

##### P1 (High) - Urgent Fix
```
1. Create fix branch: fix/bug-[id]
2. Build production artifacts
3. Deploy to staging → Run full test suite (10-15 minutes)
4. Deploy to production (blue-green)
5. Monitor (15 minutes)
6. Merge to main, tag release (vX.Y.Z+1)
```

##### P2/P3 (Medium/Low) - Standard Fix
```
1. Create fix branch: fix/bug-[id]
2. Merge to develop branch (not main)
3. Include in next scheduled release (no immediate deployment)
4. Follow normal release process
```

#### Tasks (P0/P1)

##### 4a. Pre-Deployment Checks (`release-manager`)

1. **Verify Quality Gates Passed**
   - Code review score >= 80
   - All tests pass (including regression test)
   - No security vulnerabilities

2. **Create Release Notes**
   - Document bug fix in CHANGELOG.md
   - Format:
     ```markdown
     ## [v1.2.4] - 2025-11-04 (Hotfix)

     ### Fixed
     - Fixed critical null pointer error in user service (Bug #123)
     - Added regression test to prevent recurrence
     ```

3. **Tag Release**
   - Git tag: `v1.2.4` (hotfix)
   - Or `v1.3.0` (if bundled with other fixes)

4. **Prepare Rollback Plan**
   - Document how to rollback to previous version
   - Verify rollback script works

5. **Notify Stakeholders**
   - Slack: "Hotfix v1.2.4 deploying to production"
   - Include: Bug description, fix summary, ETA

##### 4b. Deployment Execution (`cicd-manager`)

1. **Build Artifacts**
   ```bash
   docker build -t myapp:v1.2.4 .
   docker push myapp:v1.2.4
   ```

2. **Deploy to Staging**
   ```bash
   kubectl set image deployment/myapp myapp=myapp:v1.2.4 --namespace=staging
   ```

3. **Run Smoke Tests on Staging**
   - Verify regression test passes
   - Verify critical user flows work
   - Expected duration: 5-10 minutes

4. **Deploy to Production**
   - **P0 (Critical)**: Direct deployment (no gradual rollout)
     ```bash
     kubectl set image deployment/myapp myapp=myapp:v1.2.4 --namespace=production
     ```
   - **P1 (High)**: Blue-green deployment
     ```bash
     # Deploy to green environment
     kubectl apply -f k8s/deployment-green.yaml

     # Switch load balancer after verification
     kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'
     ```

5. **Run Production Smoke Tests**
   - Verify bug is fixed (reproduce original steps → should work now)
   - Verify no regressions (check critical flows)
   - Expected duration: 5 minutes

6. **Monitor Health Checks**
   - **P0**: Monitor intensively for 30 minutes
     - Error rate (should return to baseline)
     - Latency (should improve if performance bug)
     - CPU/Memory (no spikes)
     - User reports (no new complaints)
   - **P1**: Monitor for 15 minutes

#### Output Artifacts

- **`deployment-log-v1.2.4.txt`**: Deployment execution log
- **`health-check-results.md`**: Health check status
  ```markdown
  # Deployment Health Check: v1.2.4 (Hotfix)

  ## Deployment Time
  - Started: 2025-11-04 14:00:00 UTC
  - Completed: 2025-11-04 14:15:00 UTC
  - Duration: 15 minutes

  ## Health Checks (30 min post-deployment)
  - ✅ API health: 200 OK
  - ✅ Error rate: 0.1% (baseline: 0.1%, no increase)
  - ✅ P95 latency: 120ms (baseline: 125ms, improved!)
  - ✅ CPU usage: 30% (baseline: 35%, improved)
  - ✅ Memory usage: 50% (baseline: 50%, stable)
  - ✅ No new error logs
  - ✅ User reports: 0 new complaints

  ## Regression Test Verification
  - ✅ Regression test passes in production
  - ✅ Original bug reproduction steps no longer trigger error

  ## Status: ✅ STABLE
  ```

- **`incident-report-final.md`**: Final incident report (P0/P1 only)

#### Handoff Validation Checklist

- [ ] **Staging Tests Pass**: Smoke tests successful on staging
- [ ] **Production Deployment Successful**: No deployment errors
- [ ] **Health Checks Green**: All health endpoints return 200 OK
- [ ] **Bug Verified Fixed**: Original reproduction steps no longer trigger bug
- [ ] **No Regressions**: Critical user flows still work
- [ ] **Monitoring Active**: Dashboards show metrics returning to normal
- [ ] **No New Errors**: No new error logs in first 30 minutes (P0) or 15 minutes (P1)

#### Quality Gate

**Automated Health Checks**:

**Health Check Criteria** (P0/P1):
```
Bug Fixed:
- Original reproduction steps no longer trigger bug ✅

Error Rate:
- Error rate <= baseline + 0.5% ✅
- No new error types introduced ✅

Performance:
- P95 latency <= baseline + 10% ✅
- (or improved, if performance bug)

Resource Usage:
- CPU usage <= baseline + 10% ✅
- Memory usage <= baseline + 10% ✅

User Impact:
- No new user complaints (first 30 minutes) ✅
```

**Threshold**:
- **All health checks pass**: ✅ Bug fix deployment complete
- **Any health check fails**: ❌ Automatic rollback (trigger rollback plan)

**Rollback Triggers** (monitored for 30 minutes post-deployment):
```
- Error rate increases > 1% above baseline
- P95 latency increases > 50% above baseline
- New critical errors appear in logs
- CPU/Memory usage spikes > 90%
- User reports of new issues (> 3 reports)
```

**Automatic Rollback Procedure**:
```bash
# Step 1: Immediate rollback
kubectl set image deployment/myapp myapp=myapp:v1.2.3  # Previous version

# Step 2: Verify health checks
curl https://api.example.com/health  # Should return 200 OK

# Step 3: Notify team
echo "ROLLBACK: Hotfix v1.2.4 rolled back due to health check failure" | slack-notify

# Step 4: Return to Step 1 (Re-investigate)
# Reason: Fix introduced new issue, need deeper RCA
```

---

### Step 5: Post-Deployment Verification & Post-Mortem

**Agent**: `incident-responder` (Pod 4)
**Duration**: 30 minutes - 1 hour (P0/P1 only)
**Execution Mode**: Direct

**Note**: P2/P3 bugs skip this step (no post-mortem needed).

#### Input
- Deployment results from Step 4
- RCA document from Step 1
- Health check results

#### Tasks

1. **Verify Bug is Fixed (Production)**
   - Reproduce original bug steps in production → Should work now
   - Check monitoring dashboards (error rate back to baseline)
   - Verify no user complaints (Slack, support tickets)

2. **Regression Testing (Production)**
   - Test related functionality (ensure no side effects)
   - Run critical user flows (login, checkout, etc.)
   - Check edge cases (if applicable)

3. **Document Lessons Learned**
   - What went well?
   - What could be improved?
   - How to prevent similar bugs in future?

4. **Create Post-Mortem Report** (P0/P1)
   ```markdown
   # Post-Mortem: Bug [ID]

   ## Incident Summary
   - Severity: P0 (Critical)
   - Duration: 3 hours (from detection to resolution)
   - User impact: 1000 users unable to login
   - Revenue impact: $5000 estimated loss

   ## Timeline
   - 10:00 UTC: Bug detected (monitoring alert)
   - 10:05 UTC: Triage completed (P0 confirmed)
   - 10:15 UTC: Temporary mitigation (rollback to v1.2.2)
   - 10:45 UTC: Root cause identified (null pointer in auth service)
   - 11:30 UTC: Fix implemented and tested
   - 12:15 UTC: Hotfix v1.2.4 deployed to production
   - 13:00 UTC: Verification complete (bug fixed, stable)

   ## Root Cause
   [Technical explanation]

   ## Resolution
   [Fix description]

   ## What Went Well
   - Fast triage (5 minutes)
   - Temporary rollback prevented further user impact
   - Clear RCA led to correct fix on first attempt

   ## What Could Be Improved
   - Missing input validation (should have been caught in code review)
   - Insufficient test coverage (edge case not tested)
   - Monitoring alert was delayed (10-minute lag)

   ## Action Items
   - [ ] Add input validation to all similar functions (owner: backend-developer, due: 2025-11-05)
   - [ ] Add regression tests for all null pointer edge cases (owner: test-generator, due: 2025-11-05)
   - [ ] Improve monitoring alert latency (owner: monitoring-specialist, due: 2025-11-06)
   - [ ] Add pre-deployment validation for input checks (owner: cicd-manager, due: 2025-11-07)

   ## Prevention Strategy
   - Implement stricter code review checklist (verify input validation)
   - Increase test coverage requirement to 85%
   - Add static analysis to CI pipeline (detect null pointer risks)
   ```

5. **Update Knowledge Base**
   - Add RCA to knowledge base (searchable)
   - Tag with keywords (null pointer, auth service, etc.)
   - Link to similar past incidents

6. **Track Action Items**
   - Create follow-up tasks in project management tool
   - Assign owners and due dates
   - Monitor completion

#### Output Artifacts

- **`post-mortem-bug-[id].md`**: Post-mortem report
- **`action-items-bug-[id].md`**: Follow-up action items
- Knowledge base entry (searchable documentation)

#### Handoff Validation Checklist

- [ ] **Bug Verified Fixed**: Production testing confirms bug is resolved
- [ ] **No Regressions**: Related functionality still works
- [ ] **Post-Mortem Complete**: Lessons learned documented
- [ ] **Action Items Created**: Follow-up tasks assigned with owners and due dates
- [ ] **Knowledge Base Updated**: RCA added to searchable documentation

---

## Error Handling

This section defines recovery procedures when steps fail.

### Triage Fails (Step 0)

**Symptoms**:
- Unable to confirm severity
- Cannot reproduce bug
- Insufficient information

**Recovery Procedure**:
```
1. Request more information from bug reporter:
   - Exact steps to reproduce
   - Environment (browser, OS, version)
   - Screenshots/screen recording
   - Error messages
2. Attempt to reproduce in different environments
3. Check if bug is intermittent (try multiple times)
4. If still cannot reproduce after 30 minutes:
   - Downgrade severity to P2 (not urgent)
   - Request user to provide more details when bug recurs
```

---

### Investigation Fails (Step 1)

**Symptoms**:
- Root cause unclear after 2 hours (P1/P2) or 1 hour (P0)
- Bug is not reproducible
- Multiple potential root causes

**Recovery Procedure**:

#### Root Cause Unclear
```
1. Escalate to system-architect for architectural review:
   - Provide all gathered evidence (logs, metrics, timelines)
   - system-architect analyzes architecture for design issues
2. If still unclear:
   - Escalate to senior-developer or team lead
   - Schedule pair programming session
   - Consider adding more instrumentation (logging, metrics)
3. For P0: Apply temporary workaround (even if root cause unclear)
   - Example: Increase timeout, add retry logic, route around broken component
```

#### Bug Not Reproducible
```
1. Gather more data:
   - Production logs (larger time window)
   - Monitoring data (correlate with deployments, traffic patterns)
   - User-specific data (is bug user-specific or global?)
2. Try reproducing in production-like environment:
   - Use production data snapshot
   - Use same infrastructure (Kubernetes, load balancer, etc.)
3. If still not reproducible:
   - Add extensive logging/instrumentation
   - Wait for bug to recur with better monitoring
   - Consider bug is resolved (race condition that self-healed)
```

---

### Implementation Fails (Step 2)

**Symptoms**:
- Tests fail after fix
- Fix doesn't resolve bug
- Fix introduces regressions

**Recovery Procedure**:

#### Tests Fail After Fix
```
1. Determine if test failure is expected:
   - If test was wrong (bug in test, not code) → Fix test
   - If test reveals regression → Refine fix
2. Debug failing test:
   - Check if fix changed behavior (intentional or not)
   - Verify fix didn't break existing functionality
3. Iterate on fix until all tests pass
```

#### Fix Doesn't Resolve Bug
```
1. Re-verify root cause:
   - Did we identify the correct root cause?
   - Is there another contributing factor?
2. Return to Step 1 (Investigation):
   - Gather more evidence
   - Re-analyze with new information
3. Try alternative fix strategy:
   - If first approach didn't work, try different approach
```

#### Fix Introduces Regressions
```
1. Identify regression:
   - Which functionality broke?
   - Is it related to the fix?
2. Refine fix to avoid regression:
   - Add conditional logic (only apply fix in specific scenario)
   - Refactor to minimize side effects
3. If regression is unavoidable:
   - Escalate to user (trade-off decision)
   - Consider alternative fix strategy
```

---

### Code Review Fails (Step 3)

**Symptoms**:
- Quality score < 80 (or < 70 for P0)
- Security vulnerabilities introduced
- Performance degradation

**Recovery Procedure**:

#### Quality Score < Threshold
```
1. code-reviewer provides detailed feedback
2. bug-fixer refines fix based on feedback
3. Re-run code review (Step 3)
4. Repeat until score >= threshold (max 3 iterations)
5. If score < threshold after 3 iterations:
   - For P0: Accept lower quality (speed is critical), schedule follow-up refactor
   - For P1/P2: Escalate to refactor-specialist for cleaner solution
```

#### Security Vulnerabilities
```
1. security-tester identifies vulnerability
2. bug-fixer refines fix to address security issue
3. Re-run security scan
4. Repeat until 0 P0/P1 vulnerabilities
```

---

### Deployment Fails (Step 4)

**Symptoms**:
- Health checks fail
- Error rate increases
- Bug still occurs in production

**Recovery Procedure**:

#### Health Checks Fail
```
1. Immediate rollback to previous version:
   kubectl set image deployment/myapp myapp=myapp:v1.2.3  # Previous version

2. Verify rollback successful:
   - Health checks pass
   - Error rate returns to baseline

3. Return to Step 1 (Re-investigate):
   - Fix introduced new issue
   - Need deeper RCA
```

#### Bug Still Occurs
```
1. Verify fix was actually deployed:
   - Check deployed version (kubectl get pods)
   - Check if code change is present (log deployed commit hash)

2. If fix is deployed but bug persists:
   - Root cause was incorrect
   - Return to Step 1 (Re-investigate with new evidence)

3. If fix is not deployed:
   - Investigate deployment failure
   - Re-deploy fix
```

---

### Escalation Paths

When recovery procedures don't resolve issues after N iterations:

#### Escalation Matrix

| Issue Type | Max Iterations | Escalation Action |
|-----------|----------------|-------------------|
| Root cause unclear | 2 (P1/P2), 1 (P0) | Escalate to system-architect or senior-developer |
| Bug not reproducible | 2 | Add instrumentation, wait for recurrence |
| Fix doesn't work | 3 | Escalate to refactor-specialist for alternative approach |
| Quality score < threshold | 3 | Accept lower quality (P0) or escalate to refactor-specialist (P1/P2) |
| Deployment fails | 2 | Escalate to devops-engineer for infrastructure review |

---

## Success Metrics

Track these metrics to measure bug fix SOP effectiveness:

### Primary Metrics

#### Mean Time to Resolution (MTTR)
```
P0 (Critical): < 4 hours (target)
P1 (High): < 24 hours (target)
P2 (Medium): < 1 week (target)
P3 (Low): < 2 weeks (target)

Measurement:
- Time from bug detection to production fix deployed and verified
```

#### Fix Success Rate
```
Target: > 95% (fix resolves bug on first deployment)

Measurement:
- Count bugs that required rollback or re-deployment
- Calculate: (successful_fixes / total_fixes) * 100
```

#### Regression Rate
```
Baseline (without SOP): ~25% (1 in 4 fixes introduces new bug)
Target (with SOP): < 5% (1 in 20 fixes introduces new bug)

Measurement:
- Count bugs where fix introduced new issue (found in post-deployment)
- Calculate: (regressions / total_fixes) * 100
```

#### Recurrence Rate
```
Target: < 10% (same bug doesn't recur within 3 months)

Measurement:
- Track if same root cause triggers bug again within 3 months
- Calculate: (recurrences / total_fixes) * 100
```

### Secondary Metrics

#### Root Cause Identification Rate
```
Target: > 90% (9 in 10 bugs have clear RCA)

Measurement:
- Count bugs with documented RCA
- Calculate: (bugs_with_rca / total_bugs) * 100
```

#### Regression Test Coverage
```
Target: 100% (every bug has regression test)

Measurement:
- Count bugs with regression test
- Calculate: (bugs_with_test / total_bugs) * 100
```

#### Rollback Rate
```
Target: < 5% (fewer than 1 in 20 deployments need rollback)

Measurement:
- Count bug fixes that required rollback
- Calculate: (rollbacks / total_deployments) * 100
```

### Tracking Dashboard

**Example Metrics Dashboard** (update weekly):

```yaml
week: 2025-W45
bugs_fixed: 18

mttr:
  p0: 2.5 hours (3 bugs, target < 4 hours) ✅
  p1: 18 hours (7 bugs, target < 24 hours) ✅
  p2: 4 days (8 bugs, target < 7 days) ✅

fix_success_rate:
  value: 94.4%  # 17 of 18 fixes succeeded on first deployment
  target: 95%
  status: ⚠️ Slightly below target (1 rollback occurred)

regression_rate:
  value: 5.6%  # 1 of 18 fixes introduced regression
  target: 5%
  status: ⚠️ At target threshold

recurrence_rate:
  value: 0%  # No bugs recurred (within 3-month window)
  target: 10%
  status: ✅ Excellent

rca_rate:
  value: 100%  # All 18 bugs have RCA documented
  target: 90%
  status: ✅ Above target

regression_test_coverage:
  value: 100%  # All 18 bugs have regression tests
  target: 100%
  status: ✅ Meeting target

rollback_rate:
  value: 5.6%  # 1 of 18 deployments rolled back
  target: 5%
  status: ⚠️ At target threshold

insights:
  - "MTTR for P0 bugs improved 50% this week (last week: 5 hours avg)"
  - "1 rollback due to performance regression (fix added N+1 query)"
  - "Regression test coverage at 100% for 4 consecutive weeks"
  - "Consider stricter pre-deployment performance testing to prevent regressions"
```

---

## Compliance Checklist

Use this checklist to verify SOP compliance after each bug fix:

### Triage Phase (Step 0, P0/P1 only)
- [ ] Severity confirmed (P0/P1/P2/P3)
- [ ] Immediate mitigation applied (P0 only)
- [ ] Context gathered (logs, metrics, deployment history)
- [ ] Stakeholders notified (incident ticket, Slack)
- [ ] incident-report-draft.md created

### Investigation Phase (Step 1)
- [ ] Bug reproduced in local/staging environment
- [ ] Root cause identified and documented
- [ ] Fix strategy defined
- [ ] Affected code identified (file, line number)
- [ ] rca-[bug-id].md created

### Implementation Phase (Step 2)
- [ ] Fix implemented (addresses root cause)
- [ ] Regression test created (prevents recurrence)
- [ ] All tests pass (including regression test)
- [ ] Manual testing completed (bug fixed, no side effects)
- [ ] fix-summary.md created

### Code Review Phase (Step 3)
- [ ] Code review completed (quality score >= 80)
- [ ] Regression test reviewed (comprehensive, deterministic)
- [ ] Security verified (no vulnerabilities introduced)
- [ ] code-review-bug-[id].md created

### Deployment Phase (Step 4)
- [ ] Staging tests pass
- [ ] Production deployment successful
- [ ] Health checks green (all pass)
- [ ] Bug verified fixed (original steps no longer trigger bug)
- [ ] No regressions (critical flows still work)
- [ ] CHANGELOG.md updated
- [ ] Git tag created (for P0/P1)

### Post-Deployment Phase (Step 5, P0/P1 only)
- [ ] Production verification complete (bug fixed)
- [ ] Post-mortem completed (lessons learned)
- [ ] Action items created (owners and due dates)
- [ ] Knowledge base updated (RCA searchable)

---

## Example Walkthrough

Let's walk through a complete bug fix using this SOP.

### Bug Report

**Issue ID**: BUG-456
**Severity**: P1 (High)
**Title**: "Users cannot login - 500 Internal Server Error"
**Reporter**: Support team (via Slack)
**Affected Users**: ~500 users (estimated, based on support tickets)
**Environment**: Production

**Description**:
```
Users report getting "500 Internal Server Error" when attempting to login.
Error started occurring at approximately 10:00 UTC this morning.

Steps to reproduce:
1. Go to https://app.example.com/login
2. Enter email: user@example.com
3. Enter password: (valid password)
4. Click "Login" button
5. Observe: 500 Internal Server Error

Expected: User should be logged in and redirected to dashboard

Error message (from browser console):
"Failed to fetch user data after login"
```

---

### Step 0: Triage (15 minutes)

**Agent**: `incident-responder`

**Actions**:

1. **Confirm Severity**:
   - Check error rate dashboard: 12% of login attempts failing (normally 0.5%)
   - User impact: ~500 users unable to login (high impact)
   - Business impact: Users cannot access app (revenue loss)
   - **Severity confirmed: P1 (High)** - Major functionality broken

2. **Gather Context**:
   - Check deployment history: v1.5.2 deployed at 09:45 UTC (15 min before issue started)
   - Check error logs:
     ```
     [ERROR] 2025-11-04 10:02:15 - TypeError: Cannot read property 'id' of null
         at getUserById (src/services/user.service.ts:45)
         at login (src/controllers/auth.controller.ts:78)
     ```
   - Check monitoring: CPU/Memory usage normal, database connection healthy
   - **Root cause hypothesis**: Deployment v1.5.2 introduced bug (null pointer)

3. **Immediate Mitigation** (not applied for P1):
   - For P1, no immediate rollback (can wait for proper fix)
   - If this were P0, would rollback to v1.5.1 now

4. **Create Incident Ticket**:
   - Ticket ID: INC-2025-045
   - Assigned to: bug-fixer
   - Notified: #engineering-alerts Slack channel

**Output**: `incident-report-draft.md`

```markdown
# Incident Report: INC-2025-045

## Severity: P1 (High)

## Affected Systems
- Authentication service (login endpoint)

## User Impact
- ~500 users unable to login (12% failure rate)
- Started: 2025-11-04 10:00 UTC
- Duration: 15 minutes (ongoing)

## Error Logs
```
[ERROR] TypeError: Cannot read property 'id' of null
    at getUserById (src/services/user.service.ts:45)
```

## Deployment History
- v1.5.2 deployed at 09:45 UTC (15 min before issue)

## Hypothesis
- Deployment v1.5.2 introduced null pointer bug in user service

## Temporary Mitigation
- None (P1, waiting for proper fix)

## Next Steps
- Proceed to Investigation (Step 1)
- Assigned to: bug-fixer
```

**Result**: ✅ Proceed to Step 1

---

### Step 1: Investigation (45 minutes)

**Agent**: `bug-fixer`

**Actions**:

1. **Reproduce Bug**:
   - Follow reproduction steps in staging environment
   - Result: ✅ Bug reproduced! Same error occurs

2. **Analyze Error Logs**:
   ```typescript
   // src/services/user.service.ts:45
   function getUserById(userId: string) {
     const user = database.findUserById(userId);  // Returns null if not found
     return user.id;  // ERROR: Cannot read property 'id' of null
   }
   ```
   - **Immediate issue**: Missing null check

3. **Identify Root Cause**:
   - Check recent changes in v1.5.2 deployment:
     ```diff
     // BEFORE (v1.5.1):
     function getUserById(userId: string) {
       const user = database.findUserById(userId);
       if (!user) {
         throw new Error('User not found');
       }
       return user.id;
     }

     // AFTER (v1.5.2):
     function getUserById(userId: string) {
       const user = database.findUserById(userId);
       return user.id;  // ❌ Removed null check during refactor!
     }
     ```
   - **Root cause**: Developer accidentally removed null check during refactoring
   - **Why it happens**: When `userId` is invalid or user doesn't exist, `findUserById` returns `null`, causing `user.id` to throw TypeError

4. **Determine Fix Strategy**:
   - **Quick fix**: Re-add null check (restore previous behavior)
   - **Proper fix**: Same as quick fix (this is the correct solution)

**Output**: `rca-BUG-456.md`

```markdown
# Root Cause Analysis: BUG-456

## Symptom
Users get 500 Internal Server Error when attempting to login

## Root Cause
Null check was accidentally removed from `getUserById()` function during refactoring in v1.5.2.

When `findUserById()` returns `null` (user not found or invalid ID), the code attempts to access `user.id`, causing:
```
TypeError: Cannot read property 'id' of null
```

## Contributing Factors
1. **Insufficient test coverage**: No unit test for "user not found" scenario
2. **Code review missed issue**: Null check removal wasn't flagged
3. **No integration test**: E2E tests didn't cover invalid user ID case

## Fix Strategy
Re-add null check to `getUserById()` function:

```typescript
function getUserById(userId: string) {
  const user = database.findUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  return user.id;
}
```

## Regression Prevention
1. Add unit test for "user not found" scenario
2. Add integration test for invalid user ID
3. Update code review checklist to verify null checks

## Affected Code
- File: `src/services/user.service.ts`
- Line: 45
- Function: `getUserById()`
```

**Result**: ✅ Proceed to Step 2

---

### Step 2: Implementation & Testing (60 minutes)

**Agent**: `bug-fixer`

**Actions**:

1. **Implement Fix**:
   ```typescript
   // src/services/user.service.ts:45
   function getUserById(userId: string) {
     const user = database.findUserById(userId);

     if (!user) {
       throw new Error('User not found');
     }

     return user.id;
   }
   ```

2. **Write Regression Test**:
   ```typescript
   // tests/regression/bug-456.test.ts
   describe('Bug 456: TypeError when user not found', () => {
     it('should throw error when user not found', () => {
       const invalidUserId = 'non-existent-id';

       expect(() => {
         getUserById(invalidUserId);
       }).toThrow('User not found');
     });

     it('should return user ID when user exists', () => {
       const validUserId = 'user-123';
       mockDatabase.findUserById.mockReturnValue({ id: 'user-123', email: 'user@example.com' });

       const result = getUserById(validUserId);

       expect(result).toBe('user-123');
     });
   });
   ```

3. **Run Tests**:
   ```
   Regression test: ✅ PASS (2 tests)
   Full test suite: ✅ PASS (250 tests, 0 failures)
   Coverage: 85% (increased from 84% due to new tests)
   ```

4. **Manual Testing**:
   - Test in staging environment
   - Follow original reproduction steps → ✅ Bug fixed! Login works
   - Test invalid user ID → ✅ Proper error handling (no 500 error)

**Output**: `fix-summary.md`

```markdown
# Bug Fix Summary: BUG-456

## Files Changed
- `src/services/user.service.ts` (3 lines added: null check)
- `tests/regression/bug-456.test.ts` (new file, 30 lines)

## Changes
1. Re-added null check for `user` object (line 45-47)
2. Added regression test with 2 scenarios:
   - User not found → throws error
   - User found → returns user ID

## Testing
- Regression test: ✅ PASS (2 tests)
- Full test suite: ✅ PASS (250 tests, 0 failures)
- Manual testing: ✅ Bug fixed, no side effects
- Coverage: 85% (increased from 84%)

## Performance Impact
- No performance impact (null check is O(1))
```

**Quality Gate**: code-reviewer quick review score: 95/100 ✅

**Result**: ✅ Proceed to Step 3

---

### Step 3: Code Review (20 minutes)

**Agent**: `code-reviewer`

**Output**: `code-review-bug-456.md`

```yaml
quality_score: 95

strengths:
  - "Root cause properly addressed (null check restored)"
  - "Comprehensive regression test (2 scenarios: found + not found)"
  - "Clear error message (helpful for debugging)"
  - "No side effects (all 250 tests pass)"

issues: []

recommendation: APPROVE

notes:
  - "Consider adding similar null checks to related functions (preventive)"
  - "Update code review checklist to include null check verification"
```

**Result**: ✅ Proceed to Step 4

---

### Step 4: Deployment (30 minutes)

**Agents**: `release-manager`, `cicd-manager`

**Actions**:

1. **Pre-Deployment** (`release-manager`):
   - Create hotfix branch: `hotfix/bug-456`
   - Update CHANGELOG.md:
     ```markdown
     ## [v1.5.3] - 2025-11-04 (Hotfix)

     ### Fixed
     - Fixed TypeError in getUserById when user not found (Bug #456)
     - Added regression test to prevent recurrence
     ```
   - Tag release: `v1.5.3`
   - Notify Slack: "Deploying hotfix v1.5.3 to fix login issue (ETA: 15 min)"

2. **Build & Deploy** (`cicd-manager`):
   ```bash
   # Build
   docker build -t myapp:v1.5.3 .

   # Deploy to staging
   kubectl set image deployment/myapp myapp=myapp:v1.5.3 --namespace=staging

   # Smoke tests on staging
   curl https://staging.example.com/auth/login -X POST -d '{"email":"test@example.com","password":"test123"}'
   # Result: ✅ 200 OK (login successful)

   # Deploy to production (blue-green)
   kubectl apply -f k8s/deployment-green.yaml  # Deploy v1.5.3 to green
   kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'  # Switch traffic

   # Smoke tests on production
   curl https://api.example.com/health
   # Result: ✅ 200 OK

   curl https://api.example.com/auth/login -X POST -d '{"email":"user@example.com","password":"correct-password"}'
   # Result: ✅ 200 OK (login successful)
   ```

3. **Monitor Health Checks** (15 minutes):
   ```yaml
   health_checks:
     - api_health: ✅ 200 OK
     - error_rate: ✅ 0.5% (baseline: 0.5%, returned to normal!)
     - p95_latency: ✅ 120ms (baseline: 125ms)
     - cpu_usage: ✅ 30%
     - memory_usage: ✅ 50%
     - user_reports: ✅ 0 new complaints (users can login now)
   ```

**Output**: `health-check-results.md`

```markdown
# Deployment Health Check: v1.5.3 (Hotfix)

## Deployment Time
- Started: 2025-11-04 11:00:00 UTC
- Completed: 2025-11-04 11:15:00 UTC
- Duration: 15 minutes

## Health Checks (15 min post-deployment)
- ✅ API health: 200 OK
- ✅ Error rate: 0.5% (baseline: 0.5%, FIXED! Was 12% before hotfix)
- ✅ P95 latency: 120ms (baseline: 125ms)
- ✅ CPU usage: 30%
- ✅ Memory usage: 50%
- ✅ No new error logs
- ✅ User reports: Support tickets stopped (no new login issues)

## Bug Verification
- ✅ Original reproduction steps no longer trigger error
- ✅ Users can successfully login
- ✅ Invalid user ID now returns proper error (not 500)

## Status: ✅ STABLE

## Incident Resolved
- Duration: 1 hour 15 minutes (from detection at 10:00 to fix deployed at 11:15)
- MTTR: 1.25 hours (P1 target: < 24 hours) ✅
```

**Result**: ✅ Deployment successful, proceed to Step 5

---

### Step 5: Post-Mortem (30 minutes)

**Agent**: `incident-responder`

**Output**: `post-mortem-bug-456.md`

```markdown
# Post-Mortem: BUG-456 - Login 500 Error

## Incident Summary
- **Severity**: P1 (High)
- **Duration**: 1 hour 15 minutes (10:00 - 11:15 UTC)
- **User Impact**: ~500 users unable to login (12% failure rate)
- **Revenue Impact**: $2000 estimated loss (based on average revenue per hour)
- **Resolution**: Hotfix v1.5.3 deployed

## Timeline
- **09:45 UTC**: v1.5.2 deployed (introduced bug)
- **10:00 UTC**: Bug detected (support tickets, monitoring alert)
- **10:05 UTC**: Triage completed (P1 confirmed)
- **10:15 UTC**: Investigation started
- **10:45 UTC**: Root cause identified (null check removed)
- **11:00 UTC**: Fix implemented and tested
- **11:15 UTC**: Hotfix v1.5.3 deployed to production
- **11:30 UTC**: Verification complete (bug fixed, stable)

## Root Cause
Null check was accidentally removed from `getUserById()` function during refactoring in v1.5.2.

Technical details:
```typescript
// Code attempted to access property of null object
const user = database.findUserById(userId);  // Can return null
return user.id;  // TypeError if user is null
```

## Resolution
Re-added null check and error handling:
```typescript
if (!user) {
  throw new Error('User not found');
}
```

## What Went Well ✅
1. **Fast detection** (< 5 minutes from deployment to alert)
2. **Quick triage** (5 minutes to confirm P1 severity)
3. **Accurate RCA** (root cause identified correctly on first attempt)
4. **Fast fix** (fix implemented and tested in 45 minutes)
5. **Smooth deployment** (hotfix deployed without issues)
6. **No rollback needed** (fix worked on first deployment)

## What Could Be Improved ⚠️
1. **Prevention**: Missing null check should have been caught earlier:
   - Code review didn't flag removal of null check
   - No unit test for "user not found" scenario
   - No integration test for invalid user ID
2. **Monitoring**: Error alert was delayed by ~5 minutes
   - Should have alerted immediately when error rate spiked
3. **Pre-deployment validation**: No automated check for null pointer risks

## Action Items
- [ ] **Add null check verification to code review checklist** (owner: code-reviewer, due: 2025-11-05)
  - Checklist item: "Verify all database queries have null checks"
- [ ] **Increase test coverage for edge cases** (owner: test-generator, due: 2025-11-05)
  - Add unit tests for all "not found" scenarios
  - Target coverage: 85% → 90%
- [ ] **Improve error alerting latency** (owner: monitoring-specialist, due: 2025-11-06)
  - Reduce alert delay from 5 minutes to < 1 minute
  - Add error rate spike alerts (threshold: > 2% increase)
- [ ] **Add static analysis to CI pipeline** (owner: cicd-manager, due: 2025-11-07)
  - Use ESLint plugin to detect potential null pointer dereferences
  - Add pre-commit hook to run static analysis

## Prevention Strategy
1. **Stricter code review**: Update checklist to verify null checks
2. **Better test coverage**: Require tests for all error scenarios
3. **Static analysis**: Add tools to detect null pointer risks
4. **Faster alerting**: Reduce monitoring alert latency

## Lessons Learned
- Null checks are critical for error handling (don't remove during refactoring!)
- Test coverage for edge cases is essential (not just happy path)
- Code review checklists help catch common issues
- Fast triage and accurate RCA minimize downtime
```

**Action Items Tracked**:
- 4 action items created in project management tool
- All assigned with owners and due dates
- Will monitor completion in next sprint

**Result**: ✅ Post-mortem complete

---

### Total Time: 1 hour 15 minutes

- Step 0 (Triage): 15 min
- Step 1 (Investigation): 45 min
- Step 2 (Implementation): 60 min (but overlapped with Step 3)
- Step 3 (Code Review): 20 min
- Step 4 (Deployment): 30 min (includes 15 min monitoring)
- Step 5 (Post-Mortem): 30 min

**Total MTTR**: 1.25 hours (P1 target: < 24 hours) ✅

---

## References

### Related SOPs
- [feature_development.md](./feature_development.md): SOP for new features (slower, more comprehensive)
- [deployment.md](./deployment.md): Detailed deployment procedures

### Agent Documentation
- `.claude/agents/incident-responder.md`: Incident triage and response
- `.claude/agents/bug-fixer.md`: Bug investigation and fixing
- `.claude/agents/code-reviewer.md`: Code review agent
- `.claude/agents/release-manager.md`: Release management
- `.claude/agents/cicd-manager.md`: CI/CD management

### AIT42 Documentation
- [README.md](../../README.md): AIT42 system overview
- [.claude/memory/README.md](../README.md): Memory system documentation

### Standards & Best Practices
- [Post-Mortem Template](https://sre.google/sre-book/postmortem-culture/)
- [Incident Management](https://www.atlassian.com/incident-management)
- [Root Cause Analysis (5 Whys)](https://en.wikipedia.org/wiki/Five_whys)
- [MTTR Metrics](https://www.atlassian.com/incident-management/kpis/common-metrics)

---

**Document Control**

- **Version**: 1.0.0
- **Approved by**: AIT42 System
- **Next Review Date**: 2025-12-04 (30 days)
- **Change Log**:
  - 2025-11-04: Initial version (v1.0.0)

---

*This SOP is a living document and will be updated based on lessons learned from actual incidents.*
