#!/usr/bin/env npx ts-node
/**
 * Session Briefing CLI
 *
 * 新しいセッション開始時に現在の状態を表示
 *
 * Usage:
 *   npx ts-node scripts/session-briefing.ts
 *   npm run briefing
 */

import {
  getSessionBriefing,
  syncDirectivesToMemory,
} from '../src/proxy-mcp/memory/directive-sync';

async function main() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Show briefing
    const briefing = await getSessionBriefing();
    console.log(briefing);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Sync to memory (optional)
    if (process.argv.includes('--sync')) {
      console.log('\n🔄 Syncing directives to memory...');
      const result = await syncDirectivesToMemory();
      console.log(`✅ Synced ${result.synced} entries`);
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.join(', ')}`);
      }
    }
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
