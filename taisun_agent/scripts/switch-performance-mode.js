#!/usr/bin/env node
/**
 * Performance Mode Switcher
 *
 * Claude Codeのフック設定を切り替えて、パフォーマンスを最適化
 *
 * Usage:
 *   node scripts/switch-performance-mode.js fast      # 高速モード（フック最小化）
 *   node scripts/switch-performance-mode.js normal    # 通常モード（全フック有効）
 *   node scripts/switch-performance-mode.js strict    # 厳格モード（全ガード有効）
 *   node scripts/switch-performance-mode.js status    # 現在の状態を表示
 */

const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '..', '.claude', 'settings.json');
const BACKUP_PATH = path.join(__dirname, '..', '.claude', 'settings.backup.json');
const PERFORMANCE_PATH = path.join(__dirname, '..', '.claude', 'settings.performance.json');
const NORMAL_PATH = path.join(__dirname, '..', '.claude', 'settings.normal.json');

const mode = process.argv[2] || 'status';

function main() {
  console.log('=== TAISUN Performance Mode Switcher ===\n');

  switch (mode) {
    case 'fast':
      switchToFastMode();
      break;
    case 'normal':
      switchToNormalMode();
      break;
    case 'strict':
      switchToStrictMode();
      break;
    case 'status':
      showStatus();
      break;
    default:
      console.log('Usage:');
      console.log('  node scripts/switch-performance-mode.js fast    # 高速モード');
      console.log('  node scripts/switch-performance-mode.js normal  # 通常モード');
      console.log('  node scripts/switch-performance-mode.js strict  # 厳格モード');
      console.log('  node scripts/switch-performance-mode.js status  # 状態表示');
  }
}

function switchToFastMode() {
  console.log('[*] 高速モードに切り替え中...\n');

  // バックアップを作成
  if (fs.existsSync(SETTINGS_PATH)) {
    const currentSettings = fs.readFileSync(SETTINGS_PATH, 'utf8');

    // 通常モード設定を保存（まだなければ）
    if (!fs.existsSync(NORMAL_PATH)) {
      fs.writeFileSync(NORMAL_PATH, currentSettings);
      console.log('[+] 現在の設定を settings.normal.json に保存しました');
    }

    // バックアップ
    fs.writeFileSync(BACKUP_PATH, currentSettings);
  }

  // パフォーマンス設定をコピー
  if (fs.existsSync(PERFORMANCE_PATH)) {
    const perfSettings = fs.readFileSync(PERFORMANCE_PATH, 'utf8');
    fs.writeFileSync(SETTINGS_PATH, perfSettings);
    console.log('[+] settings.performance.json を settings.json にコピーしました');
  } else {
    console.error('[!] settings.performance.json が見つかりません');
    process.exit(1);
  }

  console.log('\n=== 高速モード有効 ===');
  console.log('フック数: 6 → 4 (33%削減)');
  console.log('最大タイムアウト: 83秒 → 16秒 (81%削減)');
  console.log('\n通常モードに戻すには:');
  console.log('  node scripts/switch-performance-mode.js normal');
}

function switchToNormalMode() {
  console.log('[*] 通常モードに切り替え中...\n');

  if (fs.existsSync(NORMAL_PATH)) {
    const normalSettings = fs.readFileSync(NORMAL_PATH, 'utf8');
    fs.writeFileSync(SETTINGS_PATH, normalSettings);
    console.log('[+] settings.normal.json を settings.json にコピーしました');
  } else if (fs.existsSync(BACKUP_PATH)) {
    const backupSettings = fs.readFileSync(BACKUP_PATH, 'utf8');
    fs.writeFileSync(SETTINGS_PATH, backupSettings);
    console.log('[+] settings.backup.json を settings.json にコピーしました');
  } else {
    console.error('[!] バックアップ設定が見つかりません');
    process.exit(1);
  }

  console.log('\n=== 通常モード有効 ===');
  console.log('全ての防御フックが有効になりました');
}

function switchToStrictMode() {
  console.log('[*] 厳格モードに切り替え中...\n');

  // まず通常モードに戻す
  switchToNormalMode();

  // strictフラグを追加（ワークフロー用）
  console.log('\n=== 厳格モード有効 ===');
  console.log('厳格モードでワークフローを開始するには:');
  console.log('  npm run workflow:start -- <workflow_id> --strict');
}

function showStatus() {
  console.log('現在の設定状態:\n');

  if (!fs.existsSync(SETTINGS_PATH)) {
    console.log('[!] settings.json が見つかりません');
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    const hooks = settings.hooks || {};

    let totalHooks = 0;
    let totalTimeout = 0;

    console.log('=== フック一覧 ===\n');

    for (const [event, matchers] of Object.entries(hooks)) {
      if (Array.isArray(matchers)) {
        for (const matcher of matchers) {
          const hookList = matcher.hooks || [];
          for (const hook of hookList) {
            totalHooks++;
            totalTimeout += hook.timeout || 10;
            console.log(`  ${event} [${matcher.matcher || '*'}]: ${hook.command.split('/').pop()} (${hook.timeout}s)`);
          }
        }
      }
    }

    console.log('\n=== サマリー ===');
    console.log(`  フック総数: ${totalHooks}`);
    console.log(`  最大タイムアウト: ${totalTimeout}秒`);

    // パフォーマンス判定
    if (totalHooks <= 5) {
      console.log('\n  [状態] 高速モード');
    } else if (totalHooks <= 15) {
      console.log('\n  [状態] 通常モード');
    } else {
      console.log('\n  [状態] 厳格モード');
    }

  } catch (e) {
    console.error('[!] 設定ファイルの解析に失敗:', e.message);
  }
}

main();
