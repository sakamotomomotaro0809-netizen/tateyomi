# System Patterns (Success Patterns)

## Pattern: Text Summarization
**Context**: Input text needs to be summarized with validation

**Steps**:
1. Load input text into artifact
2. Generate summary (LLM or rule-based)
3. Validate summary (schema + length + non-empty)
4. Save validated summary

**Success Criteria**:
- Output passes JSON schema validation
- Length is within bounds
- Content is not empty

---

## Pattern: Multi-Step Workflow
**Context**: Complex task requiring multiple dependent steps

**Steps**:
1. Initialize job workdir
2. Reset active context
3. For each step:
   - Check if outputs are validated (skip if yes)
   - Execute step
   - Validate outputs (gate)
   - Register artifacts in manifest
   - Retry up to 3 times on failure
4. Generate distill proposal

**Success Criteria**:
- All steps pass validation
- Manifest contains validated artifacts
- Failure report generated if max retries exceeded

---

(Add more patterns as they emerge from successful executions)
