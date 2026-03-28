# Policies (Invariant Rules)

## TDO (Test-Driven Operations)
- Every step MUST have validation
- Validation MUST run before marking artifact as validated
- Unvalidated artifacts MUST NOT be reused

## Circuit Breaker (3-Strike Rule)
- Maximum 3 retry attempts per step
- After 3 failures, MUST stop and generate failure report
- Failure report MUST list:
  - Which gate failed
  - Log location
  - Required user actions

## Deterministic Replay
- Validated artifacts MUST be reused
- Regeneration MUST NOT occur if artifact exists and is validated
- Hash verification MUST occur before reuse

## Memory Management
- activeContext.md MUST be reset at every job start
- systemPatterns.md updates MUST be proposals only (no auto-apply)
- progress.md MUST record job_id and artifact locations

## Job Isolation
- Each job MUST have isolated workdir
- Artifacts MUST NOT be shared across jobs
- Manifest MUST record job_id, input_hash, spec_hash
