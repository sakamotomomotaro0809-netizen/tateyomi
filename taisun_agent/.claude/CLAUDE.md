# TAISUN v2 - Ultimate Unified System

## WORKFLOW FIDELITY CONTRACT

### 1. Faithful Execution
When user says "same workflow" or "use XX skill", it is a **contract**.
- No shortcuts, simplifications, or substitutions
- Deviations require **explicit pre-approval**

### 2. Respect Existing Artifacts
- **Never create new scripts without Reading existing ones first**
- **Always Read before modifying any file**
- **Baseline-registered files are immutable**

### 3. No Unauthorized Actions
- Deviations MUST be confirmed: "This action is not in the instructions. May I proceed?"
- **Never deviate without explicit user approval**

### 4. Session Continuity
- Check `.workflow_state.json` (auto-injected)
- Read `SESSION_HANDOFF.md` if present
- Never contradict current phase

### 5. Skill Compliance
When "use XX skill" is specified: **MUST use Skill tool**. Manual implementation is PROHIBITED.

## System Overview

| Component | Count | Reference |
|-----------|-------|-----------|
| Agents | 14 | `/agent-catalog` |
| Skills | 60 | `/skill-catalog` |
| Commands | 82 | Shortcut commands |
| MCP Servers | 8 | Core servers |

## Pre-Flight Checks

Before starting work:
- [ ] Skill instruction? -> Use Skill tool
- [ ] "Same workflow"? -> Read existing files first
- [ ] SESSION_HANDOFF.md exists? -> Read it
- [ ] Summary ratio specified? -> Follow exactly

**VIOLATION = CRITICAL ERROR** -> Stop -> Apologize -> Record in `.claude/hooks/mistakes.md` -> Re-execute correctly

## Language
- Japanese priority
- Technical terms in English OK
- Use marketing terminology appropriately

## Detailed References

For detailed rules, mappings, and expert workflows:
- **L2** (defense layers, skill mapping, guidelines): `.claude/references/CLAUDE-L2.md`
- **L3** (specialized workflows, audio preprocessing): `.claude/references/CLAUDE-L3.md`
