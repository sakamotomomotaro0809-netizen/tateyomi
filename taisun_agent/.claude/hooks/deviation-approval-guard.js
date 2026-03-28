#!/usr/bin/env node
/**
 * Deviation Approval Guard - 逸脱行為の事前承認ガード (Layer 6)
 *
 * PreToolUse で実行され、指示にない行動（逸脱）を検出してブロックします。
 * ユーザーの明示的な承認がない限り、逸脱は許可されません。
 *
 * exit code:
 * - 0: 許可（指示内の行動）
 * - 2: ブロック（逸脱検出、承認必要）
 */

const fs = require('fs');
const path = require('path');
const { readStdin } = require('./utils/read-stdin');

// 逸脱パターン（指示にない行動）
const DEVIATION_PATTERNS = [
  // 勝手な最適化
  /(?:より)?(?:シンプル|簡潔|効率的)(?:に|化)/gi,
  /(?:最適化|optimize)/gi,
  /(?:改善|improve)/gi,
  
  // 勝手な要約・圧縮
  /(?:\d+)%(?:に)?(?:圧縮|要約|削減)/gi,
  /(?:短縮|省略)(?:し|する)/gi,
  
  // 勝手な置換・変更
  /(?:代わりに|instead)/gi,
  /(?:別の|alternative)(?:方法|手段)/gi,
  /(?:置き換え|replace)/gi,
];

// 承認済みパターン（ユーザーが明示的に許可した表現）
const APPROVED_PATTERNS = [
  /(?:承認|approved|OK|許可)/gi,
  /(?:実行|proceed|go ahead)(?:して)?(?:よい|OK)/gi,
];

async function main() {
  let input = {};

  try {
    const stdinData = await readStdin();
    if (stdinData) {
      input = JSON.parse(stdinData);
    }
  } catch (error) {
    console.error('[deviation-approval-guard] stdin parse error:', error.message);
    process.exit(0); // 非ブロッキング
  }

  // Bootstrap Safe Mode: ワークフロー未開始ならスキップ
  const cwd = input.cwd || process.cwd();
  if (!fs.existsSync(path.join(cwd, '.workflow_state.json'))) {
    process.exit(0);
  }

  const tool = input.tool || '';
  const params = input.params || {};
  
  // Write/Edit/Bashツールのみ対象
  if (!['Write', 'Edit', 'Bash'].includes(tool)) {
    process.exit(0);
  }

  // パラメータから内容を取得
  const content = params.content || params.new_string || params.command || '';
  const description = params.description || '';
  
  // 承認済みパターンがある場合はスキップ
  const isApproved = APPROVED_PATTERNS.some(pattern => 
    pattern.test(content) || pattern.test(description)
  );
  
  if (isApproved) {
    process.exit(0);
  }

  // 逸脱パターンを検出
  const deviations = [];
  for (const pattern of DEVIATION_PATTERNS) {
    const matches = content.match(pattern) || description.match(pattern);
    if (matches) {
      deviations.push(...matches);
    }
  }

  if (deviations.length > 0) {
    console.error('');
    console.error('=== DEVIATION APPROVAL GUARD: BLOCKED ===');
    console.error('');
    console.error('**ERROR**: 指示にない行動（逸脱）が検出されました。');
    console.error('');
    console.error('検出された逸脱パターン:');
    deviations.forEach(d => console.error(`  - ${d}`));
    console.error('');
    console.error('**解決方法**:');
    console.error('1. AskUserQuestion で承認を得てください');
    console.error('2. または、指示された内容のみを実行してください');
    console.error('');
    console.error('=== BLOCKED WITH EXIT CODE 2 ===');
    console.error('');
    process.exit(2);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('[deviation-approval-guard] error:', error.message);
  process.exit(0); // 非ブロッキング
});
