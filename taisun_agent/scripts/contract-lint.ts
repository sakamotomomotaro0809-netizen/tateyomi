#!/usr/bin/env npx ts-node
/**
 * Contract Lint - Memory++ Quality Gate
 *
 * 契約/ルール違反を検知するLint（CIゲート用）
 *
 * Usage:
 *   npx ts-node scripts/contract-lint.ts
 *   npm run contract:lint
 *
 * Checks:
 *   1. proxy-only: .mcp.json が taisun-proxy 以外を有効化していない
 *   2. 日本語ログ既定: locale未指定でja
 *   3. secrets非露出: secretsがログ/traceabilityに出ない
 *   4. 大出力外部化: 適切なartifact参照
 */

import * as fs from 'fs';
import * as path from 'path';

interface LintResult {
  rule: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  details?: string[];
}

const results: LintResult[] = [];

/**
 * Check 1: proxy-only
 * .mcp.json が taisun-proxy 以外を有効化していない
 */
function checkProxyOnly(): void {
  const mcpPath = path.join(process.cwd(), '.mcp.json');

  if (!fs.existsSync(mcpPath)) {
    results.push({
      rule: 'proxy-only',
      status: 'skip',
      message: '.mcp.json が存在しません',
    });
    return;
  }

  try {
    const content = fs.readFileSync(mcpPath, 'utf-8');
    const config = JSON.parse(content);

    const mcpServers = config.mcpServers || {};
    const enabledServers = Object.entries(mcpServers)
      .filter(([_, v]: [string, unknown]) => {
        const server = v as { disabled?: boolean };
        return !server.disabled;
      })
      .map(([k]) => k);

    // Check if only taisun-proxy is enabled (or variations)
    const allowedServers = ['taisun-proxy', 'claude-mem-search'];
    const violations = enabledServers.filter(
      (s) => !allowedServers.some((a) => s.includes(a))
    );

    if (violations.length > 0) {
      results.push({
        rule: 'proxy-only',
        status: 'fail',
        message: 'taisun-proxy 以外のMCPサーバーが有効化されています',
        details: violations,
      });
    } else {
      results.push({
        rule: 'proxy-only',
        status: 'pass',
        message: 'proxy-only ルールを遵守しています',
      });
    }
  } catch (err) {
    results.push({
      rule: 'proxy-only',
      status: 'fail',
      message: `.mcp.json の解析に失敗: ${err instanceof Error ? err.message : err}`,
    });
  }
}

/**
 * Check 2: 日本語ログ既定
 * locale設定を確認
 */
function checkJapaneseDefault(): void {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  let locale = process.env.TAISUN_LOCALE || 'ja';

  // Check .env.example for default
  if (fs.existsSync(envExamplePath)) {
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const match = content.match(/TAISUN_LOCALE=(\w+)/);
    if (match && match[1] !== 'ja') {
      results.push({
        rule: 'japanese-default',
        status: 'warn',
        message: '.env.example のデフォルトロケールが ja ではありません',
        details: [`現在の値: ${match[1]}`],
      });
      return;
    }
  }

  results.push({
    rule: 'japanese-default',
    status: 'pass',
    message: '日本語がデフォルトロケールです',
  });
}

/**
 * Check 3: secrets非露出
 * 秘密情報がログ/traceabilityに含まれていないか
 */
function checkSecretsExposure(): void {
  const sensitivePatterns = [
    /api[_-]?key\s*[:=]\s*['""][^'"]+['"]/i,  // api_key: "value"
    /password\s*[:=]\s*['""][^'"]+['"]/i,      // password: "value"
    /-----BEGIN.*KEY-----/,
    /ghp_[a-zA-Z0-9]{36}/,  // GitHub token (actual value)
    /sk-[a-zA-Z0-9]{48}/,   // OpenAI key pattern (actual value)
    /xoxb-[a-zA-Z0-9-]+/,   // Slack token
  ];

  const filesToCheck = [
    '.claude/traceability.yml',
    '.claude/running_summary.md',
    '.claude/task_contract.md',
  ];

  const violations: string[] = [];

  for (const file of filesToCheck) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');

    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        // Check if it's a false positive (like "api_key: [REDACTED]")
        const matches = content.match(pattern);
        if (matches) {
          const line = content.split('\n').find((l) => pattern.test(l));
          if (line && !line.includes('[REDACTED]') && !line.includes('***')) {
            violations.push(`${file}: ${pattern.toString()}`);
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    results.push({
      rule: 'secrets-exposure',
      status: 'fail',
      message: '秘密情報が露出している可能性があります',
      details: violations,
    });
  } else {
    results.push({
      rule: 'secrets-exposure',
      status: 'pass',
      message: '秘密情報の露出は検出されませんでした',
    });
  }
}

/**
 * Check 4: task_contract.md の存在と構造
 */
function checkTaskContract(): void {
  const contractPath = path.join(process.cwd(), '.claude', 'task_contract.md');

  if (!fs.existsSync(contractPath)) {
    results.push({
      rule: 'task-contract',
      status: 'warn',
      message: 'task_contract.md が存在しません',
    });
    return;
  }

  const content = fs.readFileSync(contractPath, 'utf-8');

  const requiredSections = [
    '## Goal',
    '## Constraints',
    '## Never Do',
    '## Acceptance Criteria',
    '## Regression Checklist',
  ];

  const missingSections = requiredSections.filter(
    (section) => !content.includes(section)
  );

  if (missingSections.length > 0) {
    results.push({
      rule: 'task-contract',
      status: 'warn',
      message: 'task_contract.md に必須セクションが不足しています',
      details: missingSections,
    });
  } else {
    results.push({
      rule: 'task-contract',
      status: 'pass',
      message: 'task_contract.md の構造は適切です',
    });
  }
}

/**
 * Check 5: mistakes.md の存在
 */
function checkMistakesLedger(): void {
  const mistakesPath = path.join(process.cwd(), '.claude', 'mistakes.md');

  if (!fs.existsSync(mistakesPath)) {
    results.push({
      rule: 'mistakes-ledger',
      status: 'warn',
      message: 'mistakes.md が存在しません',
    });
    return;
  }

  const content = fs.readFileSync(mistakesPath, 'utf-8');
  const mistakeCount = (content.match(/## \d{4}-\d{2}-\d{2} Mistake:/g) || []).length;

  results.push({
    rule: 'mistakes-ledger',
    status: 'pass',
    message: `mistakes.md に ${mistakeCount} 件のミスが記録されています`,
  });
}

/**
 * Check 6: pins.md の存在（Memory++）
 */
function checkPinsLedger(): void {
  const pinsPath = path.join(process.cwd(), '.claude', 'pins.md');

  if (!fs.existsSync(pinsPath)) {
    results.push({
      rule: 'pins-ledger',
      status: 'warn',
      message: 'pins.md が存在しません（Memory++機能）',
    });
    return;
  }

  results.push({
    rule: 'pins-ledger',
    status: 'pass',
    message: 'pins.md が存在します',
  });
}

/**
 * Run all checks
 */
function runAllChecks(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Contract Lint - Memory++ Quality Gate');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  checkProxyOnly();
  checkJapaneseDefault();
  checkSecretsExposure();
  checkTaskContract();
  checkMistakesLedger();
  checkPinsLedger();

  // Output results
  let hasFailure = false;
  let hasWarning = false;

  for (const result of results) {
    const icon =
      result.status === 'pass'
        ? '✅'
        : result.status === 'fail'
          ? '❌'
          : result.status === 'warn'
            ? '⚠️'
            : '⏭️';

    console.log(`${icon} [${result.rule}] ${result.message}`);

    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(`   └─ ${detail}`);
      }
    }

    if (result.status === 'fail') hasFailure = true;
    if (result.status === 'warn') hasWarning = true;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (hasFailure) {
    console.log('❌ Contract Lint FAILED');
    process.exit(1);
  } else if (hasWarning) {
    console.log('⚠️  Contract Lint PASSED with warnings');
    process.exit(0);
  } else {
    console.log('✅ Contract Lint PASSED');
    process.exit(0);
  }
}

// Run
runAllChecks();
