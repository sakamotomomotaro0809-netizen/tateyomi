#!/usr/bin/env tsx
/**
 * AIT42 v2.0.0 - SpecSynth (File-Based, Claude Code Compatible)
 *
 * Purpose: Automatic regression test generation after bug fixes
 *
 * Workflow:
 * 1. Analyze root cause from patch diff + error log
 * 2. Generate test specification prompt for test-generator agent
 * 3. Human invokes test-generator with generated prompt
 * 4. Record test generation in Memory System
 *
 * IMPORTANT: This is a Claude Code compatible version that doesn't require ChromaDB.
 * For production with ChromaDB, use spec-synth.ts instead.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TASKS_DIR = path.join(__dirname, '../memory/tasks');
const OUTPUT_PROMPT_PATH = path.join(__dirname, '../memory/specsynth-prompt.md');
const TEST_FRAMEWORK = process.env.SPECSYNTH_TEST_FRAMEWORK || 'jest';

interface TaskRecord {
  task_id: string;
  timestamp: string;
  description: string;
  agents_used: string[];
  success: boolean;
  quality_score?: number;
  incident?: {
    error_log: string;
    error_code?: string;
    root_cause?: string;
    applied_patch?: {
      files_modified: string[];
      diff: string;
      success: boolean;
    };
  };
}

interface RootCauseAnalysis {
  category: string;
  description: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  lessons_learned: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Core Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Analyze root cause from patch diff and error log
 */
function analyzeRootCause(patchDiff: string, errorLog: string, manualRootCause?: string): RootCauseAnalysis {
  // Use manual root cause if provided, otherwise analyze from diff/error
  if (manualRootCause) {
    return {
      category: categorizeError(errorLog),
      description: manualRootCause,
      risk_level: assessRiskLevel(errorLog, patchDiff),
      lessons_learned: extractLessonsLearned(patchDiff, manualRootCause)
    };
  }

  // Simple pattern-based analysis
  const category = categorizeError(errorLog);
  const description = inferRootCause(patchDiff, errorLog);
  const risk_level = assessRiskLevel(errorLog, patchDiff);
  const lessons_learned = extractLessonsLearned(patchDiff, description);

  return {
    category,
    description,
    risk_level,
    lessons_learned
  };
}

/**
 * Categorize error type from error log
 */
function categorizeError(errorLog: string): string {
  const patterns = [
    { pattern: /TypeError|ReferenceError|SyntaxError/i, category: 'JavaScript Runtime Error' },
    { pattern: /NullPointerException|NPE/i, category: 'Null Reference Error' },
    { pattern: /ENOENT|EACCES|ENOTDIR/i, category: 'File System Error' },
    { pattern: /ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i, category: 'Network Error' },
    { pattern: /ValidationError|Schema/i, category: 'Data Validation Error' },
    { pattern: /UnauthorizedError|Forbidden|401|403/i, category: 'Authentication/Authorization Error' },
    { pattern: /TS\d+:|Type .* is not assignable/i, category: 'TypeScript Type Error' },
    { pattern: /Test.*failed|Assertion.*failed/i, category: 'Test Failure' }
  ];

  for (const { pattern, category } of patterns) {
    if (pattern.test(errorLog)) {
      return category;
    }
  }

  return 'Unknown Error Type';
}

/**
 * Infer root cause from patch diff and error log
 */
function inferRootCause(patchDiff: string, errorLog: string): string {
  const causes: string[] = [];

  // Check for null/undefined checks added
  if (/if\s*\(!|if\s*\(.*===\s*null|if\s*\(.*===\s*undefined|\|\|\s*\{\}|\?\?/.test(patchDiff)) {
    causes.push('Missing null/undefined validation');
  }

  // Check for import statements added
  if (/^\+\s*import.*from/m.test(patchDiff)) {
    causes.push('Missing import statement');
  }

  // Check for type annotations added
  if (/:\s*\w+(\[\])?(\s*\||\s*&)/m.test(patchDiff)) {
    causes.push('Missing or incorrect type annotations');
  }

  // Check for error handling added
  if (/try\s*\{|catch\s*\(|\.catch\(/m.test(patchDiff)) {
    causes.push('Missing error handling');
  }

  // Check for async/await fixes
  if (/\+\s*await\s+/m.test(patchDiff)) {
    causes.push('Missing await keyword for async operation');
  }

  // Check for default values added
  if (/=\s*.+\|\|\s*/m.test(patchDiff)) {
    causes.push('Missing default value');
  }

  if (causes.length === 0) {
    return 'Logic error or code quality improvement';
  }

  return causes.join('; ');
}

/**
 * Assess risk level from error log and patch
 */
function assessRiskLevel(errorLog: string, patchDiff: string): 'critical' | 'high' | 'medium' | 'low' {
  // Critical: Security issues, data loss
  if (/SQL injection|XSS|CSRF|unauthorized|authentication|password|secret|key/i.test(errorLog) ||
      /SQL injection|XSS|CSRF|unauthorized|authentication/i.test(patchDiff)) {
    return 'critical';
  }

  // High: Runtime crashes, data corruption
  if (/crash|exception|fatal|segfault|core dump/i.test(errorLog) ||
      patchDiff.split('\n').filter(line => line.startsWith('+')).length > 20) {
    return 'high';
  }

  // Medium: Functional issues
  if (/error|failed|invalid/i.test(errorLog)) {
    return 'medium';
  }

  // Low: Minor issues, improvements
  return 'low';
}

/**
 * Extract lessons learned from patch
 */
function extractLessonsLearned(patchDiff: string, rootCause: string): string[] {
  const lessons: string[] = [];

  if (rootCause.includes('null') || rootCause.includes('undefined')) {
    lessons.push('Always validate input parameters before use');
    lessons.push('Use TypeScript strict mode to catch null/undefined issues');
  }

  if (rootCause.includes('import')) {
    lessons.push('Verify all dependencies are imported before use');
    lessons.push('Use auto-import features in IDE to prevent missing imports');
  }

  if (rootCause.includes('type')) {
    lessons.push('Use strict TypeScript configuration');
    lessons.push('Add comprehensive type definitions for all functions');
  }

  if (rootCause.includes('error handling')) {
    lessons.push('Wrap async operations in try-catch blocks');
    lessons.push('Implement proper error logging and monitoring');
  }

  if (rootCause.includes('await')) {
    lessons.push('Always await async functions');
    lessons.push('Use ESLint rules to enforce await on promises');
  }

  if (lessons.length === 0) {
    lessons.push('Follow coding best practices and style guides');
    lessons.push('Implement comprehensive test coverage');
  }

  return lessons;
}

/**
 * Search for similar past incidents that added regression tests
 */
function searchSimilarTestPatterns(errorCategory: string): Array<{ task: TaskRecord; test_pattern: string }> {
  if (!fs.existsSync(TASKS_DIR)) {
    return [];
  }

  const taskFiles = fs.readdirSync(TASKS_DIR)
    .filter(file => file.endsWith('.yaml'))
    .map(file => path.join(TASKS_DIR, file));

  const patterns: Array<{ task: TaskRecord; test_pattern: string }> = [];

  for (const file of taskFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const task: TaskRecord = yaml.parse(content);

      // Look for tasks that used test-generator and succeeded
      if (task.success &&
          task.agents_used?.includes('test-generator') &&
          task.description) {

        // Extract test pattern from description (simple heuristic)
        let test_pattern = 'Unit test for edge cases';

        if (task.description.toLowerCase().includes('null') || task.description.toLowerCase().includes('undefined')) {
          test_pattern = 'Null/undefined validation test';
        } else if (task.description.toLowerCase().includes('type')) {
          test_pattern = 'Type safety test';
        } else if (task.description.toLowerCase().includes('error')) {
          test_pattern = 'Error handling test';
        } else if (task.description.toLowerCase().includes('async')) {
          test_pattern = 'Async operation test';
        }

        patterns.push({ task, test_pattern });
      }
    } catch (error) {
      // Skip invalid files
      continue;
    }
  }

  return patterns.slice(0, 3); // Return top 3
}

/**
 * Generate test specification prompt for test-generator agent
 */
function generateTestPrompt(
  rootCause: RootCauseAnalysis,
  patchDiff: string,
  errorLog: string,
  filesModified: string[]
): string {
  const similarPatterns = searchSimilarTestPatterns(rootCause.category);

  let prompt = `# Regression Test Generation Request

## Context

A bug was fixed in the following files:
${filesModified.map(file => `- \`${file}\``).join('\n')}

## Root Cause Analysis

**Category**: ${rootCause.category}
**Description**: ${rootCause.description}
**Risk Level**: ${rootCause.risk_level.toUpperCase()}

## Original Error

\`\`\`
${errorLog.trim()}
\`\`\`

## Applied Patch

\`\`\`diff
${patchDiff.trim()}
\`\`\`

## Lessons Learned

${rootCause.lessons_learned.map((lesson, idx) => `${idx + 1}. ${lesson}`).join('\n')}

## Test Requirements

Please generate **regression tests** using **${TEST_FRAMEWORK}** to prevent this bug from recurring.

### Test Coverage Requirements

1. **Reproduce the original error** (test should fail without the patch)
2. **Verify the fix** (test should pass with the patch)
3. **Cover edge cases** related to the root cause
4. **Add negative test cases** (invalid inputs, error conditions)

### Test Structure

\`\`\`typescript
describe('Regression: ${rootCause.description}', () => {
  it('should handle [specific case that caused the bug]', () => {
    // Test implementation
  });

  it('should handle edge cases (null, undefined, empty)', () => {
    // Edge case tests
  });

  it('should throw appropriate errors for invalid inputs', () => {
    // Negative test cases
  });
});
\`\`\`

`;

  if (similarPatterns.length > 0) {
    prompt += `## Similar Test Patterns from Past Fixes

We found ${similarPatterns.length} similar incidents that added regression tests:

`;

    similarPatterns.forEach((pattern, idx) => {
      prompt += `### ${idx + 1}. ${pattern.task.description}
- **Test Pattern**: ${pattern.test_pattern}
- **Date**: ${pattern.task.timestamp}
- **Quality Score**: ${pattern.task.quality_score || 'N/A'}

`;
    });
  }

  prompt += `## Output Format

Please provide:
1. **Test file path** (e.g., \`src/__tests__/regression/auth-null-check.test.ts\`)
2. **Complete test code** with ${TEST_FRAMEWORK} syntax
3. **Test description** explaining what each test case validates

---

**IMPORTANT**: Focus on preventing recurrence of **${rootCause.description}**. The tests should fail without the patch and pass with it.
`;

  return prompt;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main SpecSynth Function
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function specSynth(
  patchDiff: string,
  errorLog: string,
  filesModified: string[],
  manualRootCause?: string
): Promise<void> {
  console.log('🧪 AIT42 SpecSynth - Regression Test Generation (Claude Code Compatible)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Step 1: Analyze root cause
  console.log('🔍 Step 1: Analyzing root cause...\n');
  const rootCause = analyzeRootCause(patchDiff, errorLog, manualRootCause);

  console.log(`   Category: ${rootCause.category}`);
  console.log(`   Description: ${rootCause.description}`);
  console.log(`   Risk Level: ${rootCause.risk_level.toUpperCase()}`);
  console.log('');

  // Step 2: Generate test specification prompt
  console.log('📝 Step 2: Generating test specification prompt...\n');
  const testPrompt = generateTestPrompt(rootCause, patchDiff, errorLog, filesModified);

  // Save prompt to file
  fs.writeFileSync(OUTPUT_PROMPT_PATH, testPrompt, 'utf-8');
  console.log(`✅ Test specification saved to: ${OUTPUT_PROMPT_PATH}`);
  console.log('');

  // Step 3: Instructions for manual execution
  console.log('📋 Step 3: Next Steps (Manual in Claude Code)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('1. Read the generated test specification:');
  console.log(`   cat ${OUTPUT_PROMPT_PATH}`);
  console.log('');
  console.log('2. Invoke test-generator with the specification:');
  console.log(`   "test-generatorで、${OUTPUT_PROMPT_PATH}の内容を実行して"`);
  console.log('');
  console.log('3. Run the generated tests to verify:');
  console.log('   npm test');
  console.log('');
  console.log('4. After successful test generation, record the task:');
  console.log('   npx tsx .claude/memory/scripts/record-task.ts \\');
  console.log(`     --description "Regression test for ${rootCause.description}" \\`);
  console.log('     --agents test-generator \\');
  console.log('     --success true \\');
  console.log('     --quality-score 90');
  console.log('');

  console.log('💡 Lessons Learned:');
  rootCause.lessons_learned.forEach((lesson, idx) => {
    console.log(`   ${idx + 1}. ${lesson}`);
  });
  console.log('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (require.main === module) {
  const patchDiffPath = process.argv[2];
  const errorLogPath = process.argv[3];
  const filesModified = process.argv.slice(4);
  const manualRootCause = process.env.ROOT_CAUSE;

  if (!patchDiffPath || !errorLogPath) {
    console.error('Usage: npx tsx spec-synth-file-based.ts <patch_diff_file> <error_log_file> [files_modified...]');
    console.error('');
    console.error('Example:');
    console.error('  npx tsx spec-synth-file-based.ts patch.diff error.log src/auth.controller.ts');
    console.error('');
    console.error('Optional: Set ROOT_CAUSE env var for manual root cause:');
    console.error('  ROOT_CAUSE="Missing null check" npx tsx spec-synth-file-based.ts ...');
    process.exit(1);
  }

  if (!fs.existsSync(patchDiffPath)) {
    console.error(`Patch diff file not found: ${patchDiffPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(errorLogPath)) {
    console.error(`Error log file not found: ${errorLogPath}`);
    process.exit(1);
  }

  const patchDiff = fs.readFileSync(patchDiffPath, 'utf-8');
  const errorLog = fs.readFileSync(errorLogPath, 'utf-8');

  specSynth(patchDiff, errorLog, filesModified, manualRootCause)
    .then(() => {
      console.log('✅ SpecSynth completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ SpecSynth failed:', error.message);
      process.exit(1);
    });
}
