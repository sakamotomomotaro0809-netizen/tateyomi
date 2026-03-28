# ReflectionAgent Quick Reference Guide

## One-Line Summary
Quality-gating agent that scores task results (0-100) and decides Accept/Improve/Reject with automatic retry.

---

## Quick Facts

| Property | Value |
|----------|-------|
| **Agent Name** | reflection-agent |
| **Purpose** | Quality gating & continuous improvement |
| **Model** | sonnet |
| **Tools** | Read, Grep, Glob, Bash |
| **Status** | ✅ Production Ready |

---

## Scoring System

### 4 Dimensions (0-100 each)

```
┌─────────────────┬────────┬──────────────────────┐
│ Dimension       │ Weight │ Evaluates            │
├─────────────────┼────────┼──────────────────────┤
│ Correctness     │  40%   │ Requirements met     │
│ Completeness    │  30%   │ All parts present    │
│ Quality         │  20%   │ Code quality/security│
│ Testing         │  10%   │ Test coverage/quality│
└─────────────────┴────────┴──────────────────────┘

Overall Score = Weighted Average
```

---

## Decision Tree

```
Overall Score
     │
     ├─ ≥ 90 ──→ ACCEPT ✅
     │          (Immediate approval)
     │
     ├─ 70-89 ─→ IMPROVE ⚠️
     │          (Suggest improvements, user choice)
     │
     └─ < 70 ──→ REJECT ❌
                (Auto-retry max 3x)
```

---

## Quick Usage

### From Coordinator
```markdown
Task tool:
  subagent_type: "reflection-agent"
  prompt: |
    評価してください:
    タスクID: [id]
    エージェント: [agent]
    成果物: [files]
    code-reviewerスコア: [score]
```

### Direct Invocation
```markdown
@reflection-agent 以下の実装を評価してください: [details]
```

---

## Scoring Criteria

### Correctness (40%)
- ✅ 100: Perfect, all edge cases
- ✅ 90: Major requirements + most edge cases
- ⚠️ 80: Major requirements, minor gaps
- ⚠️ 70: Partial, important gaps
- ❌ <70: Significant problems

### Completeness (30%)
- ✅ 100: Features + docs + tests + config
- ✅ 90: Nearly complete (1 minor gap)
- ⚠️ 80: Nearly complete (1-2 gaps)
- ⚠️ 70: Important items missing
- ❌ <70: Significantly incomplete

### Quality (20%)
- ✅ 100: code-reviewer 95+
- ✅ 90: code-reviewer 90-94
- ⚠️ 80: code-reviewer 80-89
- ⚠️ 70: code-reviewer 70-79
- ❌ <70: code-reviewer <70

### Testing (10%)
- ✅ 100: Coverage 90%+, all pass, edge cases
- ✅ 90: Coverage 85-89%, all pass
- ⚠️ 80: Coverage 80-84%, all pass
- ⚠️ 70: Coverage 70-79%, all pass
- ❌ <70: Coverage <70% or failures

---

## Auto-Retry Logic

```python
max_retries = 3

while score < 70 and retries < max_retries:
    retries++
    invoke refactor-specialist
    re-evaluate

if score >= 70:
    IMPROVE or ACCEPT
else:
    ESCALATE to user
```

---

## Output Examples

### ACCEPT (Score ≥ 90)
```markdown
✅ 総合スコア: 96/100
タスクを承認します。
```

### IMPROVE (Score 70-89)
```markdown
⚠️ 総合スコア: 82/100

改善推奨:
- テストカバレッジ向上 (72% → 80%)
- エラーハンドリング追加

選択肢:
A) 現状で承認
B) 改善後に承認（推奨）
```

### REJECT (Score < 70)
```markdown
❌ 総合スコア: 58/100

重大な問題:
- SQL injection vulnerability
- テストカバレッジ45%

自動リトライ開始...
```

---

## Memory Storage

### Task Evaluation
```yaml
# .claude/memory/tasks/[task-id].yaml
reflection:
  overall_score: 85
  decision: "IMPROVE"
  dimensions:
    correctness: 90
    completeness: 75
    quality: 88
    testing: 70
```

### Agent Statistics
```yaml
# .claude/memory/agents/[agent]-stats.yaml
quality_metrics:
  avg_quality_score: 87.3
  distribution:
    excellent_90_plus: 72
    good_80_89: 38
    acceptable_70_79: 10
```

---

## Common Scenarios

### Scenario 1: Perfect Implementation
**Input**: All requirements met, 95% test coverage, excellent code quality
**Score**: 96/100
**Decision**: ACCEPT ✅
**Action**: Immediate approval

### Scenario 2: Good Implementation with Minor Gaps
**Input**: Main features done, 73% coverage, 2 failing tests
**Score**: 81/100
**Decision**: IMPROVE ⚠️
**Action**: Offer improvement or accept

### Scenario 3: Poor Implementation
**Input**: Security issues, 45% coverage, missing features
**Score**: 58/100
**Decision**: REJECT ❌
**Action**: Auto-retry with refactor-specialist

---

## Integration Points

```
User Request
     ↓
Coordinator ─→ backend-developer
     ↓
reflection-agent (quality gate)
     ↓
     ├─ ACCEPT → User
     ├─ IMPROVE → User choice
     └─ REJECT → refactor-specialist
                      ↓
                reflection-agent (re-evaluate)
```

---

## Key Benefits

✅ **Objective**: Quantitative scoring (no bias)
✅ **Automatic**: Auto-retry for low scores
✅ **Actionable**: Specific improvement suggestions
✅ **Transparent**: Clear score breakdown
✅ **Safe**: Max 3 retries, escalation
✅ **Learning**: Memory-based improvement tracking

---

## When to Use

| Use Case | Invoke ReflectionAgent? |
|----------|------------------------|
| After backend-developer task | ✅ Yes |
| After frontend-developer task | ✅ Yes |
| After refactor-specialist task | ⚠️ Optional |
| After code-reviewer task | ❌ No (duplicate) |
| During design phase | ❌ No (implementation only) |

---

## Troubleshooting

### "Score too low despite good implementation"
- Check if tests are passing
- Verify test coverage ≥ 80%
- Ensure all features implemented
- Review code-reviewer feedback

### "Retry not improving score"
- May need manual intervention
- Check if requirements are clear
- Consider architectural issues
- Escalate after 3 retries

### "Memory not updating"
- Verify `.claude/memory/` directory exists
- Check file permissions
- Ensure task-id is valid

---

## Files & Locations

```
.claude/agents/
├── reflection-agent.md                      # Main implementation (2,902 lines)
├── reflection-agent-tests.md                # Test scenarios
├── reflection-agent-IMPLEMENTATION-SUMMARY.md # Full documentation
└── reflection-agent-QUICK-REFERENCE.md      # This file
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | 2025-11-04 | Initial implementation |

---

## Support & Documentation

- **Full Documentation**: `reflection-agent-IMPLEMENTATION-SUMMARY.md`
- **Test Scenarios**: `reflection-agent-tests.md`
- **Agent Definition**: `reflection-agent.md`

---

## Quick Checklist for Invocation

Before invoking ReflectionAgent, ensure:
- [ ] Task is completed by implementation agent
- [ ] All deliverable files exist
- [ ] Tests have been run (if applicable)
- [ ] code-reviewer has run (optional but recommended)
- [ ] Task-id is available

---

**Last Updated**: 2025-11-04
**Status**: Production Ready
**Maintainer**: AIT42 Implementation Team

---

*Quick Reference Guide - Keep this handy for fast lookups!*
