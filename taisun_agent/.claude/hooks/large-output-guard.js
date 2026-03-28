#!/usr/bin/env node
/**
 * Large Output Guard - 大きな出力のmemory_add強制
 *
 * PostToolUse (Write/Edit/Bash) 時に実行され、
 * 大きな出力をmemory_addに保存するよう強制します。
 *
 * しきい値:
 * - 6000文字以上
 * - 120行以上
 *
 * 防止する問題:
 * - コンテキストウィンドウの無駄遣い
 * - 重要な出力の紛失
 * - セッション間での情報喪失
 */

const fs = require('fs');
const path = require('path');

// 設定
const CONFIG = {
  charThreshold: 6000,    // 文字数しきい値
  lineThreshold: 120,     // 行数しきい値
  excludePatterns: [      // 除外パターン
    /node_modules/,
    /\.git\//,
    /\.lock$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
  ],
  targetFileExtensions: [ // 対象拡張子
    '.md',
    '.txt',
    '.json',
    '.yaml',
    '.yml',
    '.ts',
    '.js',
    '.py',
    '.sh',
  ],
};

async function main() {
  let input = {};

  try {
    const stdinData = await readStdin();
    if (stdinData) {
      input = JSON.parse(stdinData);
    }
  } catch (e) {
    process.exit(0);
    return;
  }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const toolResult = input.tool_result || {};

  // Write/Edit/Bash ツールのみチェック
  if (!['Write', 'Edit', 'Bash'].includes(toolName)) {
    process.exit(0);
    return;
  }

  let content = '';
  let source = '';

  if (toolName === 'Write') {
    content = toolInput.content || '';
    source = `Write: ${toolInput.file_path || 'unknown'}`;
  } else if (toolName === 'Edit') {
    content = toolInput.new_string || '';
    source = `Edit: ${toolInput.file_path || 'unknown'}`;
  } else if (toolName === 'Bash') {
    // Bash出力のチェック
    content = toolResult.stdout || toolResult.output || '';
    source = `Bash: ${(toolInput.command || '').substring(0, 50)}...`;
  }

  if (!content) {
    process.exit(0);
    return;
  }

  // 除外パターンチェック
  const filePath = toolInput.file_path || '';
  const shouldExclude = CONFIG.excludePatterns.some(pattern =>
    pattern.test(filePath)
  );

  if (shouldExclude) {
    process.exit(0);
    return;
  }

  // サイズチェック
  const charCount = content.length;
  const lineCount = content.split('\n').length;

  const exceedsCharThreshold = charCount >= CONFIG.charThreshold;
  const exceedsLineThreshold = lineCount >= CONFIG.lineThreshold;

  if (!exceedsCharThreshold && !exceedsLineThreshold) {
    process.exit(0);
    return;
  }

  // 警告を出力
  console.log('');
  console.log('=== LARGE OUTPUT GUARD ===');
  console.log('');
  console.log('**大きな出力が検出されました**');
  console.log('');
  console.log(`ソース: ${source}`);
  console.log(`文字数: ${charCount.toLocaleString()} 文字`);
  console.log(`行数: ${lineCount.toLocaleString()} 行`);
  console.log('');

  if (exceedsCharThreshold) {
    console.log(`⚠ 文字数しきい値超過: ${charCount} >= ${CONFIG.charThreshold}`);
  }
  if (exceedsLineThreshold) {
    console.log(`⚠ 行数しきい値超過: ${lineCount} >= ${CONFIG.lineThreshold}`);
  }

  console.log('');
  console.log('**推奨アクション:**');
  console.log('');
  console.log('1. memory_add を使用して出力を保存してください:');
  console.log('   ```');
  console.log('   MCPSearch → select:mcp__taisun-proxy__memory_add');
  console.log('   mcp__taisun-proxy__memory_add({');
  console.log('     title: "出力のタイトル",');
  console.log('     content: "出力内容の要約",');
  console.log('     type: "discovery" | "change" | "decision"');
  console.log('   })');
  console.log('   ```');
  console.log('');
  console.log('2. または、要約を作成してからコンテキストに含めてください');
  console.log('');
  console.log('**理由:**');
  console.log('- コンテキストウィンドウを効率的に使用するため');
  console.log('- 重要な情報をセッション間で保持するため');
  console.log('- 後で参照できるよう記録を残すため');
  console.log('');
  console.log('=== END LARGE OUTPUT GUARD ===');
  console.log('');

  // 警告のみ（ブロックしない）
  process.exit(0);
}

function readStdin(timeout = 1000) {
  return new Promise((resolve) => {
    let data = '';
    let resolved = false;

    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve(data);
      }
    };

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', finish);
    setTimeout(finish, timeout);

    if (process.stdin.isTTY) finish();
  });
}

main().catch(() => process.exit(0));
