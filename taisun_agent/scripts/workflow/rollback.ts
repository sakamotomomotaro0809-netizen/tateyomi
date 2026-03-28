#!/usr/bin/env node
/**
 * Workflow Rollback Command
 * Phase 3: Rollback to a specified phase
 *
 * Usage:
 *   npm run workflow:rollback -- phase_2
 *   npm run workflow:rollback -- phase_2 "Design needs revision"
 */

import { rollbackToPhase } from '../../src/proxy-mcp/workflow/engine.js';

const args = process.argv.slice(2);
const targetPhase = args[0];
const reason = args[1];

if (!targetPhase) {
  console.error('使い方: npm run workflow:rollback -- <phase_id> [reason]');
  console.error('\n例:');
  console.error('  npm run workflow:rollback -- phase_2');
  console.error('  npm run workflow:rollback -- phase_2 "Design needs revision"');
  process.exit(1);
}

try {
  const result = rollbackToPhase(targetPhase, reason);

  console.log(`✅ Phase ${targetPhase} にロールバックしました\n`);
  console.log(`削除された成果物: ${result.deletedArtifacts.length}個`);

  if (result.deletedArtifacts.length > 0) {
    console.log('\n削除されたファイル:');
    result.deletedArtifacts.forEach((file) => console.log(`  - ${file}`));
  }

  if (result.reason) {
    console.log(`\n理由: ${result.reason}`);
  }

  console.log('\n次のステップ: npm run workflow:status');
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
  process.exit(1);
}
