#!/usr/bin/env bash
# Skill Warehouse Verification Script
# T1.5: Validates T1.1 (descriptions) and T1.2 (disable-model-invocation) results

set -euo pipefail

SKILLS_DIR="$(cd "$(dirname "$0")/../.claude/skills" && pwd)"
PASS=0
FAIL=0
WARN=0

total_skills=0
english_desc=0
japanese_desc=0
short_desc=0
long_desc=0
has_disable=0
no_disable=0
total_chars=0

echo "=== Skill Warehouse Verification Report ==="
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

for skill_dir in "$SKILLS_DIR"/*/; do
    skill_md="$skill_dir/SKILL.md"
    [ -f "$skill_md" ] || continue
    total_skills=$((total_skills + 1))

    # Extract description
    desc=$(awk '/^---$/{n++; next} n==1 && /^description:/{sub(/^description: */, ""); print; exit}' "$skill_md" 2>/dev/null || echo "")

    if [ -n "$desc" ]; then
        char_count=${#desc}
        total_chars=$((total_chars + char_count))

        # Check if English (no Japanese chars)
        if echo "$desc" | grep -qP '[\p{Hiragana}\p{Katakana}\p{Han}]' 2>/dev/null; then
            japanese_desc=$((japanese_desc + 1))
        else
            english_desc=$((english_desc + 1))
        fi

        # Check length
        if [ "$char_count" -le 50 ]; then
            short_desc=$((short_desc + 1))
        else
            long_desc=$((long_desc + 1))
        fi
    fi

    # Check disable-model-invocation
    if grep -q 'disable-model-invocation: true' "$skill_md" 2>/dev/null; then
        has_disable=$((has_disable + 1))
    else
        no_disable=$((no_disable + 1))
    fi
done

avg_chars=0
if [ "$total_skills" -gt 0 ]; then
    avg_chars=$((total_chars / total_skills))
fi

echo "--- Statistics ---"
echo "Total skills: $total_skills"
echo ""
echo "[T1.1] Description Optimization:"
echo "  English descriptions: $english_desc"
echo "  Japanese descriptions: $japanese_desc"
echo "  <=50 chars: $short_desc"
echo "  >50 chars: $long_desc"
echo "  Average chars: $avg_chars"
echo ""
echo "[T1.2] disable-model-invocation:"
echo "  Enabled (true): $has_disable"
echo "  Not set (high-freq): $no_disable"
echo ""

echo "--- Acceptance Tests ---"

# AT-001: 90%+ descriptions in English
if [ "$total_skills" -gt 0 ]; then
    eng_pct=$((english_desc * 100 / total_skills))
else
    eng_pct=0
fi
if [ "$eng_pct" -ge 90 ]; then
    echo "[PASS] AT-001: English descriptions: ${eng_pct}% (>=90%)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] AT-001: English descriptions: ${eng_pct}% (<90%)"
    FAIL=$((FAIL + 1))
fi

# AT-002: Average description <=50 chars
if [ "$avg_chars" -le 50 ]; then
    echo "[PASS] AT-002: Avg description length: ${avg_chars} chars (<=50)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] AT-002: Avg description length: ${avg_chars} chars (>50)"
    FAIL=$((FAIL + 1))
fi

# AT-003: 50%+ skills have disable-model-invocation
if [ "$total_skills" -gt 0 ]; then
    dis_pct=$((has_disable * 100 / total_skills))
else
    dis_pct=0
fi
if [ "$dis_pct" -ge 50 ]; then
    echo "[PASS] AT-003: disable-model-invocation rate: ${dis_pct}% (>=50%)"
    PASS=$((PASS + 1))
else
    echo "[FAIL] AT-003: disable-model-invocation rate: ${dis_pct}% (<50%)"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "--- Summary ---"
echo "PASS: $PASS / FAIL: $FAIL / WARN: $WARN"
if [ "$FAIL" -eq 0 ]; then
    echo "Result: ALL CHECKS PASSED"
    exit 0
else
    echo "Result: SOME CHECKS FAILED"
    exit 1
fi
