# Project Brief (Constitution)

## Purpose
Build a deterministic, auditable agent execution platform that eliminates:
- Context drift (no reliance on chat history)
- Apology loops (hard stop at 3 failures)
- Non-reproducible outputs (validated artifacts are reused)

## Quality Standards
- Every step MUST have a validator (gate)
- Validation failures MUST NOT proceed to next step
- Artifacts MUST be version-controlled (sha256)
- Memory MUST be externalized (not in chat)

## Prohibitions
- Never skip validation
- Never proceed after 3 failures
- Never rely on conversation history for state
- Never auto-apply memory updates without approval
- Never mix artifacts from different jobs
