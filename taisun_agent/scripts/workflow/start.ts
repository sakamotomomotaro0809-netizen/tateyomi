#!/usr/bin/env tsx
import { startWorkflow } from '../../src/proxy-mcp/workflow/engine';

const args = process.argv.slice(2);
const workflowId = args[0] || 'video_generation_v1';
const strict = args.includes('--strict');

// Parse metadata if provided
let metadata: Record<string, unknown> | undefined;
const metadataIndex = args.indexOf('--metadata');
if (metadataIndex !== -1 && args[metadataIndex + 1]) {
  try {
    metadata = JSON.parse(args[metadataIndex + 1]);
  } catch (error) {
    console.error('❌ Failed to parse metadata JSON:', (error as Error).message);
    process.exit(1);
  }
}

try {
  const state = startWorkflow(workflowId, strict, metadata);
  console.log(`✅ Workflow started: ${state.workflowId}`);
  console.log(`📍 Current phase: ${state.currentPhase}`);
  console.log(`🔒 Strict mode: ${strict ? 'ON' : 'OFF'}`);
  if (metadata) {
    console.log(`📋 Metadata: ${JSON.stringify(metadata)}`);
  }
  console.log('\n次のステップ: npm run workflow:status');
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
  process.exit(1);
}
