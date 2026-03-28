#!/usr/bin/env tsx

/**
 * AIT42 Git Diff Capture Script
 * Captures git diff for regression prevention
 *
 * Purpose: Record code changes to prevent AI from forgetting previous constraints
 * - Captures staged changes (git diff --staged)
 * - Captures unstaged changes (git diff)
 * - Captures recent commits (git log -p)
 */

import { execSync } from 'child_process';
import { Command } from 'commander';

const program = new Command();

program
  .name('capture-git-diff')
  .description('Capture git diff for memory system')
  .option('--staged', 'Capture only staged changes', false)
  .option('--unstaged', 'Capture only unstaged changes', false)
  .option('--commits <count>', 'Include recent commits (default: 0)', '0')
  .option('--files <pattern>', 'Filter by file pattern (e.g., "*.ts")', '')
  .option('--format <format>', 'Output format: text|json', 'text')
  .parse(process.argv);

const options = program.opts();

interface GitDiffResult {
  staged?: string;
  unstaged?: string;
  commits?: string;
  timestamp: string;
  branch: string;
  constraints?: string[];
}

/**
 * Execute git command safely
 */
function execGit(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', cwd: process.cwd() }).trim();
  } catch (error) {
    // Graceful degradation: return empty if git fails
    return '';
  }
}

/**
 * Extract constraints from git diff
 * Detects patterns that indicate changed requirements:
 * - Function signature changes (async, params)
 * - Type changes
 * - Configuration changes
 * - Schema changes
 */
function extractConstraints(diff: string): string[] {
  const constraints: string[] = [];
  const lines = diff.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect async function change
    if (line.includes('- export function') && lines[i + 1]?.includes('+ export async function')) {
      constraints.push('非同期化必須（前回の仕様変更）');
    }

    // Detect type parameter changes
    if (line.match(/- .*<(\w+)>/)) {
      const oldType = line.match(/- .*<(\w+)>/)?.[1];
      const newType = lines[i + 1]?.match(/\+ .*<(\w+)>/)?.[1];
      if (oldType && newType && oldType !== newType) {
        constraints.push(`型変更: ${oldType} → ${newType}`);
      }
    }

    // Detect configuration changes
    if (line.includes('.env') || line.includes('config')) {
      if (line.startsWith('+') || line.startsWith('-')) {
        constraints.push('設定ファイル変更あり（新環境変数or削除に注意）');
      }
    }

    // Detect database schema changes
    if (line.match(/CREATE TABLE|ALTER TABLE|DROP TABLE/i)) {
      constraints.push('DBスキーマ変更あり（マイグレーション必須）');
    }

    // Detect API contract changes
    if (line.match(/interface \w+|type \w+ =/)) {
      if (line.startsWith('-')) {
        constraints.push('API契約変更の可能性（後方互換性チェック必要）');
      }
    }
  }

  return [...new Set(constraints)]; // Remove duplicates
}

/**
 * Main execution
 */
async function main() {
  const result: GitDiffResult = {
    timestamp: new Date().toISOString(),
    branch: execGit('git rev-parse --abbrev-ref HEAD')
  };

  // Capture staged changes
  if (!options.unstaged) {
    const stagedCmd = options.files
      ? `git diff --staged -- "${options.files}"`
      : 'git diff --staged';
    result.staged = execGit(stagedCmd);
  }

  // Capture unstaged changes
  if (options.unstaged || (!options.staged && !options.unstaged)) {
    const unstagedCmd = options.files
      ? `git diff -- "${options.files}"`
      : 'git diff';
    result.unstaged = execGit(unstagedCmd);
  }

  // Capture recent commits
  if (parseInt(options.commits) > 0) {
    const commitsCmd = `git log -p -n ${options.commits}`;
    result.commits = execGit(commitsCmd);
  }

  // Extract constraints from all diffs
  const allDiffs = [result.staged, result.unstaged, result.commits]
    .filter(Boolean)
    .join('\n');

  if (allDiffs) {
    result.constraints = extractConstraints(allDiffs);
  }

  // Output
  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Text format for easy reading
    console.log('=== Git Diff Capture ===');
    console.log(`Branch: ${result.branch}`);
    console.log(`Timestamp: ${result.timestamp}`);

    if (result.constraints && result.constraints.length > 0) {
      console.log('\n🚨 Detected Constraints:');
      result.constraints.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
    }

    if (result.staged) {
      console.log('\n--- Staged Changes ---');
      console.log(result.staged);
    }

    if (result.unstaged) {
      console.log('\n--- Unstaged Changes ---');
      console.log(result.unstaged);
    }

    if (result.commits) {
      console.log('\n--- Recent Commits ---');
      console.log(result.commits);
    }

    if (!result.staged && !result.unstaged && !result.commits) {
      console.log('\n✅ No changes detected (working tree clean)');
    }
  }

  // Return exit code 0 for success
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error capturing git diff:', error.message);
  process.exit(1);
});
