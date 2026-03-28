#!/usr/bin/env tsx
import { getStatus } from '../../src/proxy-mcp/workflow/engine';

const status = getStatus();

if (!status.active) {
  console.log('⚠️  No active workflow');
  console.log('開始方法: npm run workflow:start -- <workflowId> [--strict]');
  process.exit(0);
}

console.log(`\n=== Workflow Status ===\n`);
console.log(`Workflow: ${status.state!.workflowId}`);
console.log(`Progress: ${status.progress}`);
console.log(`Strict: ${status.state!.strict ? 'ON' : 'OFF'}`);
console.log(`\n現在のフェーズ:`);
console.log(`  📍 ${status.currentPhase!.id}: ${status.currentPhase!.name}`);
if (status.currentPhase!.description) {
  console.log(`     ${status.currentPhase!.description}`);
}

if (status.currentPhase!.requiredArtifacts && status.currentPhase!.requiredArtifacts.length > 0) {
  console.log(`\n必須成果物:`);
  status.currentPhase!.requiredArtifacts.forEach(a => console.log(`  - ${a}`));
}

if (status.nextPhase) {
  console.log(`\n次のフェーズ:`);
  console.log(`  ➡️  ${status.nextPhase.id}: ${status.nextPhase.name}`);
}

console.log(`\n次のステップ: npm run workflow:next`);
