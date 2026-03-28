#!/usr/bin/env npx ts-node
/**
 * Safe Replace - Unicode-safe text replacement CLI
 *
 * UTF-8境界クラッシュを回避するための安全な置換ツール
 *
 * Usage:
 *   npx ts-node scripts/text/safe-replace.ts --file path.ts --from "old" --to "new"
 *   npx ts-node scripts/text/safe-replace.ts --rules rules.json
 *   npm run text:safe-replace -- --file path.ts --from "old" --to "new"
 *
 * Options:
 *   --file <path>      Target file path
 *   --from <string>    String to replace
 *   --to <string>      Replacement string
 *   --rules <path>     JSON file with replacement rules: [{from, to, regex?}]
 *   --regex            Treat --from as regular expression
 *   --dry-run          Show changes without applying
 *   --no-backup        Skip backup creation
 *   --backup-dir <dir> Custom backup directory (default: .claude/backups)
 */

import * as fs from 'fs';
import * as path from 'path';

interface ReplacementRule {
  from: string;
  to: string;
  regex?: boolean;
}

interface ReplaceResult {
  file: string;
  replacements: number;
  backupPath?: string;
  error?: string;
}

interface SafeReplaceOptions {
  files: string[];
  rules: ReplacementRule[];
  dryRun: boolean;
  createBackup: boolean;
  backupDir: string;
}

/**
 * Read file as UTF-8 with fatal decode (throws on invalid UTF-8)
 */
export function readUtf8Fatal(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    return decoder.decode(buffer);
  } catch (error) {
    throw new Error(`Invalid UTF-8 in file: ${filePath}`);
  }
}

/**
 * Check if content contains replacement character (mojibake indicator)
 */
export function hasReplacementChar(content: string): boolean {
  return content.includes('\uFFFD');
}

/**
 * Count replacement character occurrences
 */
export function countReplacementChars(content: string): number {
  return (content.match(/\uFFFD/g) || []).length;
}

/**
 * Create backup of file before modification
 */
export function createBackup(filePath: string, backupDir: string): string {
  const absolutePath = path.resolve(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const basename = path.basename(filePath);
  const backupPath = path.join(backupDir, `${basename}.${timestamp}.bak`);

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(absolutePath, backupPath);
  return backupPath;
}

/**
 * Write file atomically (write to temp, then rename)
 */
export function writeAtomic(filePath: string, content: string): void {
  const absolutePath = path.resolve(filePath);
  const tempPath = `${absolutePath}.tmp.${process.pid}`;

  try {
    // Write to temp file
    fs.writeFileSync(tempPath, content, 'utf-8');

    // Atomic rename
    fs.renameSync(tempPath, absolutePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Apply replacement rules to content
 */
export function applyReplacements(
  content: string,
  rules: ReplacementRule[]
): { result: string; totalReplacements: number } {
  let result = content;
  let totalReplacements = 0;

  for (const rule of rules) {
    const beforeLength = result.length;

    if (rule.regex) {
      const regex = new RegExp(rule.from, 'g');
      const matches = result.match(regex);
      if (matches) {
        totalReplacements += matches.length;
        result = result.replace(regex, rule.to);
      }
    } else {
      // String replacement (all occurrences)
      let pos = 0;
      let count = 0;
      while ((pos = result.indexOf(rule.from, pos)) !== -1) {
        count++;
        pos += rule.from.length;
      }
      if (count > 0) {
        totalReplacements += count;
        result = result.split(rule.from).join(rule.to);
      }
    }
  }

  return { result, totalReplacements };
}

/**
 * Process a single file
 */
export function processFile(
  filePath: string,
  rules: ReplacementRule[],
  options: { dryRun: boolean; createBackup: boolean; backupDir: string }
): ReplaceResult {
  const result: ReplaceResult = {
    file: filePath,
    replacements: 0,
  };

  try {
    // Read with fatal UTF-8 decode
    const original = readUtf8Fatal(filePath);
    const originalReplacementChars = countReplacementChars(original);

    // Apply replacements
    const { result: modified, totalReplacements } = applyReplacements(original, rules);
    result.replacements = totalReplacements;

    if (totalReplacements === 0) {
      return result;
    }

    // Check for new replacement characters (sign of corruption)
    const newReplacementChars = countReplacementChars(modified);
    if (newReplacementChars > originalReplacementChars) {
      result.error = `Replacement would introduce ${newReplacementChars - originalReplacementChars} U+FFFD character(s) - aborting`;
      return result;
    }

    if (options.dryRun) {
      return result;
    }

    // Create backup if enabled
    if (options.createBackup) {
      result.backupPath = createBackup(filePath, options.backupDir);
    }

    // Write atomically
    writeAtomic(filePath, modified);

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): SafeReplaceOptions {
  const args = process.argv.slice(2);
  const options: SafeReplaceOptions = {
    files: [],
    rules: [],
    dryRun: false,
    createBackup: true,
    backupDir: path.join(process.cwd(), '.claude', 'backups'),
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '--file':
        options.files.push(args[++i]);
        break;
      case '--from':
        const from = args[++i];
        const to = args[args.indexOf('--to', i) + 1];
        const isRegex = args.includes('--regex');
        if (from && to !== undefined) {
          options.rules.push({ from, to, regex: isRegex });
        }
        break;
      case '--to':
        // Handled with --from
        i++;
        break;
      case '--rules':
        const rulesPath = args[++i];
        if (fs.existsSync(rulesPath)) {
          const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
          const loadedRules = JSON.parse(rulesContent);
          options.rules.push(...loadedRules);
        }
        break;
      case '--regex':
        // Handled with --from
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-backup':
        options.createBackup = false;
        break;
      case '--backup-dir':
        options.backupDir = args[++i];
        break;
      default:
        // Assume it's a file path if it exists
        if (fs.existsSync(arg)) {
          options.files.push(arg);
        }
    }
    i++;
  }

  return options;
}

/**
 * Main entry point
 */
function main(): void {
  const options = parseArgs();

  if (options.files.length === 0) {
    console.error('Error: No files specified');
    console.error('Usage: npx ts-node scripts/text/safe-replace.ts --file <path> --from <old> --to <new>');
    process.exit(1);
  }

  if (options.rules.length === 0) {
    console.error('Error: No replacement rules specified');
    console.error('Use --from <old> --to <new> or --rules <rules.json>');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔒 Safe Replace - Unicode-safe text replacement');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log(`📋 Rules (${options.rules.length}):`);
  for (const rule of options.rules) {
    const preview = rule.from.length > 30 ? rule.from.substring(0, 30) + '...' : rule.from;
    console.log(`   "${preview}" → "${rule.to}"${rule.regex ? ' (regex)' : ''}`);
  }
  console.log('');

  let totalReplacements = 0;
  let hasErrors = false;

  for (const file of options.files) {
    const result = processFile(file, options.rules, {
      dryRun: options.dryRun,
      createBackup: options.createBackup,
      backupDir: options.backupDir,
    });

    if (result.error) {
      console.log(`❌ ${result.file}: ${result.error}`);
      hasErrors = true;
    } else if (result.replacements === 0) {
      console.log(`⏭️  ${result.file}: No matches found`);
    } else {
      const action = options.dryRun ? 'would replace' : 'replaced';
      console.log(`✅ ${result.file}: ${action} ${result.replacements} occurrence(s)`);
      if (result.backupPath) {
        console.log(`   └─ Backup: ${result.backupPath}`);
      }
      totalReplacements += result.replacements;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (hasErrors) {
    console.log('❌ Completed with errors');
    process.exit(1);
  } else if (options.dryRun) {
    console.log(`✅ Dry run complete: ${totalReplacements} replacement(s) would be made`);
  } else {
    console.log(`✅ Complete: ${totalReplacements} replacement(s) made`);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
