#!/usr/bin/env python3
"""
Doc Optimizer - CLAUDE.md 3-layer auto-split tool
T1.7: Analyzes CLAUDE.md and validates 3-layer structure
"""

import os
import sys
import json
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
CLAUDE_MD = PROJECT_DIR / ".claude" / "CLAUDE.md"
L2_MD = PROJECT_DIR / ".claude" / "rules" / "CLAUDE-L2.md"
L3_MD = PROJECT_DIR / ".claude" / "rules" / "CLAUDE-L3.md"

# Section importance classification
L1_KEYWORDS = [
    "WORKFLOW FIDELITY", "CONTRACT", "Pre-Flight", "Language",
    "System Overview", "VIOLATION", "Faithful Execution",
    "Respect Existing", "No Unauthorized", "Session Continuity",
    "Skill Compliance"
]

L2_KEYWORDS = [
    "13-Layer", "Defense System", "Skill Auto-Mapping",
    "Guidelines", "Quality Gates", "Context Management",
    "Quick Reference", "Development Principles"
]

L3_KEYWORDS = [
    "Interactive Video", "TTS", "Multimedia Pipeline",
    "Fish Audio", "Remotion", "NanoBanana", "agentic-vision",
    "text_preprocessor", "Japanese Text"
]

MAX_L1_LINES = 100


def count_lines(filepath):
    if not filepath.exists():
        return -1
    return len(filepath.read_text(encoding="utf-8").splitlines())


def check_references(content):
    """Check if L1 has references to L2/L3"""
    has_l2_ref = "CLAUDE-L2" in content or "L2" in content
    has_l3_ref = "CLAUDE-L3" in content or "L3" in content
    return has_l2_ref, has_l3_ref


def check_keyword_placement(l1_content, l2_content, l3_content):
    """Verify keywords are in correct layers"""
    issues = []

    for kw in L3_KEYWORDS:
        if kw.lower() in l1_content.lower():
            issues.append(f"L3 keyword '{kw}' found in L1 (should be in L3)")

    return issues


def validate():
    """Run full validation"""
    results = {
        "pass": 0,
        "fail": 0,
        "checks": []
    }

    # Check 1: L1 exists and line count
    l1_lines = count_lines(CLAUDE_MD)
    if 0 < l1_lines <= MAX_L1_LINES:
        results["checks"].append(f"[PASS] L1 line count: {l1_lines} (<={MAX_L1_LINES})")
        results["pass"] += 1
    else:
        results["checks"].append(f"[FAIL] L1 line count: {l1_lines} (>{MAX_L1_LINES})")
        results["fail"] += 1

    # Check 2: L2 exists
    l2_lines = count_lines(L2_MD)
    if l2_lines > 0:
        results["checks"].append(f"[PASS] L2 exists: {l2_lines} lines")
        results["pass"] += 1
    else:
        results["checks"].append(f"[FAIL] L2 missing or empty")
        results["fail"] += 1

    # Check 3: L3 exists
    l3_lines = count_lines(L3_MD)
    if l3_lines > 0:
        results["checks"].append(f"[PASS] L3 exists: {l3_lines} lines")
        results["pass"] += 1
    else:
        results["checks"].append(f"[FAIL] L3 missing or empty")
        results["fail"] += 1

    # Check 4: References in L1
    l1_content = CLAUDE_MD.read_text(encoding="utf-8") if CLAUDE_MD.exists() else ""
    has_l2, has_l3 = check_references(l1_content)
    if has_l2 and has_l3:
        results["checks"].append("[PASS] L1 has references to L2 and L3")
        results["pass"] += 1
    else:
        results["checks"].append(f"[FAIL] L1 references: L2={has_l2}, L3={has_l3}")
        results["fail"] += 1

    # Check 5: Total content preserved
    total_lines = max(l1_lines, 0) + max(l2_lines, 0) + max(l3_lines, 0)
    if total_lines >= 150:
        results["checks"].append(f"[PASS] Total content: {total_lines} lines (sufficient)")
        results["pass"] += 1
    else:
        results["checks"].append(f"[FAIL] Total content: {total_lines} lines (too low)")
        results["fail"] += 1

    # Check 6: Keyword placement
    l2_content = L2_MD.read_text(encoding="utf-8") if L2_MD.exists() else ""
    l3_content = L3_MD.read_text(encoding="utf-8") if L3_MD.exists() else ""
    issues = check_keyword_placement(l1_content, l2_content, l3_content)
    if not issues:
        results["checks"].append("[PASS] Keyword placement correct (L3 content not in L1)")
        results["pass"] += 1
    else:
        for issue in issues:
            results["checks"].append(f"[WARN] {issue}")
        results["fail"] += 1

    return results


def main():
    print("=== Doc Optimizer Validation Report ===")
    print(f"Date: {os.popen('date').read().strip()}")
    print()

    results = validate()

    print("--- Layer Structure ---")
    print(f"  L1 (CLAUDE.md): {count_lines(CLAUDE_MD)} lines")
    print(f"  L2 (CLAUDE-L2.md): {count_lines(L2_MD)} lines")
    print(f"  L3 (CLAUDE-L3.md): {count_lines(L3_MD)} lines")
    print()

    print("--- Acceptance Tests ---")
    for check in results["checks"]:
        print(check)

    print()
    print(f"--- Summary ---")
    print(f"PASS: {results['pass']} / FAIL: {results['fail']}")
    if results["fail"] == 0:
        print("Result: ALL CHECKS PASSED")
        return 0
    else:
        print("Result: SOME CHECKS FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
