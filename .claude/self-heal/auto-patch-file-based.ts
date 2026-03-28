#!/usr/bin/env tsx
/**
 * AIT42 v2.0.0 - AutoPatch (File-Based for Claude Code)
 *
 * Purpose: Automatic bug fixing WITHOUT ChromaDB dependency
 *
 * Architecture:
 * - Uses existing .claude/memory/tasks/*.yaml for incident history
 * - Simple text similarity matching (no vector embeddings)
 * - Integrates with refactor-specialist agent via Task tool
 * - Works in Claude Code without external dependencies
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TASKS_DIR = path.join(__dirname, '../memory/tasks');
const SIMILARITY_THRESHOLD = 0.6; // Lower than vector similarity (simpler algorithm)
const MAX_SIMILAR_INCIDENTS = 3;

interface TaskRecord {
  task_id: string;
  description: string;
  success: boolean;
  quality_score?: number;
  errors?: string[];
  lessons_learned?: string[];
  technical_stack?: string[];
  // AutoPatch specific
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Text Similarity (Simple Implementation)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  );
}

function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Incident Search (File-Based)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchSimilarIncidents(errorLog: string): Promise<TaskRecord[]> {
  const taskFiles = fs.readdirSync(TASKS_DIR)
    .filter(file => file.endsWith('.yaml'))
    .map(file => path.join(TASKS_DIR, file));

  const incidents: Array<{ task: TaskRecord; similarity: number }> = [];

  for (const file of taskFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const task: TaskRecord = yaml.parse(content);

      // Only consider tasks with incident data
      if (!task.incident?.error_log) continue;

      // Calculate similarity
      const similarity = jaccardSimilarity(errorLog, task.incident.error_log);

      if (similarity >= SIMILARITY_THRESHOLD) {
        incidents.push({ task, similarity });
      }
    } catch (error) {
      // Skip invalid YAML files
      continue;
    }
  }

  // Sort by similarity (descending)
  incidents.sort((a, b) => b.similarity - a.similarity);

  return incidents
    .slice(0, MAX_SIMILAR_INCIDENTS)
    .map(item => item.task);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Patch Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generatePatchPrompt(
  currentError: string,
  similarIncidents: TaskRecord[]
): string {
  let prompt = `# AutoPatch: Automatic Bug Fix Request

## Current Error
\`\`\`
${currentError}
\`\`\`

## Similar Past Incidents (${similarIncidents.length} found)

`;

  similarIncidents.forEach((incident, idx) => {
    prompt += `### Incident ${idx + 1}: ${incident.task_id}
- **Root Cause**: ${incident.incident?.root_cause || 'Unknown'}
- **Error Code**: ${incident.incident?.error_code || 'N/A'}
- **Resolution Success**: ${incident.incident?.applied_patch?.success ? 'Yes' : 'No'}

`;

    if (incident.incident?.applied_patch?.diff) {
      prompt += `**Applied Patch**:
\`\`\`diff
${incident.incident.applied_patch.diff}
\`\`\`

`;
    }

    if (incident.lessons_learned && incident.lessons_learned.length > 0) {
      prompt += `**Lessons Learned**:
${incident.lessons_learned.map(lesson => `- ${lesson}`).join('\n')}

`;
    }
  });

  prompt += `## Task
Based on the similar incidents above, generate a patch to fix the current error.

Requirements:
1. Identify the root cause
2. Propose code changes (provide full file diff)
3. Explain why this fix works
4. Add error handling to prevent recurrence
5. Follow patterns from successful past patches

Output format:
- Root cause analysis
- Files to modify
- Complete diff for each file
- Testing recommendations
`;

  return prompt;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main AutoPatch Function (Claude Code Compatible)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function autoPatch(errorLog: string): Promise<void> {
  console.log('🔧 AIT42 AutoPatch - File-Based (Claude Code Compatible)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Step 1: Search for similar incidents
  console.log('🔍 Step 1: Searching for similar past incidents...\n');
  const similarIncidents = await searchSimilarIncidents(errorLog);

  if (similarIncidents.length === 0) {
    console.log('⚠️ No similar incidents found in task history');
    console.log('💡 Recommendation: Invoke refactor-specialist directly');
    console.log('');
    console.log('Suggested command:');
    console.log('  "refactor-specialistで、以下のエラーを修正して"');
    console.log('');
    return;
  }

  console.log(`✅ Found ${similarIncidents.length} similar incidents:\n`);
  similarIncidents.forEach((incident, idx) => {
    console.log(`   ${idx + 1}. ${incident.task_id}`);
    console.log(`      Root Cause: ${incident.incident?.root_cause || 'Unknown'}`);
    console.log(`      Success: ${incident.incident?.applied_patch?.success ? 'Yes' : 'No'}`);
    console.log('');
  });

  // Step 2: Generate patch prompt for refactor-specialist
  console.log('🧠 Step 2: Generating patch prompt for refactor-specialist...\n');
  const patchPrompt = generatePatchPrompt(errorLog, similarIncidents);

  // Save prompt to file
  const promptFile = path.join(__dirname, '../memory/autopatch-prompt.md');
  fs.writeFileSync(promptFile, patchPrompt);
  console.log(`✅ Patch prompt saved to: ${promptFile}`);
  console.log('');

  // Step 3: Instructions for Claude Code
  console.log('📋 Step 3: Next Steps (Manual in Claude Code)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('1. Read the generated prompt:');
  console.log(`   cat ${promptFile}`);
  console.log('');
  console.log('2. Invoke refactor-specialist with the prompt:');
  console.log('   "refactor-specialistで、.claude/memory/autopatch-prompt.mdの内容を実行して"');
  console.log('');
  console.log('3. After successful fix, record the incident:');
  console.log('   npx tsx .claude/memory/scripts/record-task.ts \\');
  console.log('     --description "AutoPatch fix for [error]" \\');
  console.log('     --agents refactor-specialist \\');
  console.log('     --success true \\');
  console.log('     --incident-error-log "[error log]" \\');
  console.log('     --incident-patch-diff "[git diff]"');
  console.log('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (require.main === module) {
  const errorLogPath = process.argv[2];

  if (!errorLogPath) {
    console.error('Usage: npx tsx auto-patch-file-based.ts <error_log_file>');
    process.exit(1);
  }

  if (!fs.existsSync(errorLogPath)) {
    console.error(`Error log file not found: ${errorLogPath}`);
    process.exit(1);
  }

  const errorLog = fs.readFileSync(errorLogPath, 'utf-8');

  autoPatch(errorLog).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
