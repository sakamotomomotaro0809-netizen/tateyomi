#!/usr/bin/env tsx
import { transitionToNextPhase } from '../../src/proxy-mcp/workflow/engine';

try {
  const result = transitionToNextPhase();

  if (result.success) {
    console.log(result.message);
    console.log('\n次のステップ: npm run workflow:status');
  } else {
    console.error(`❌ ${result.message}\n`);
    result.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
  process.exit(1);
}
