#!/usr/bin/env tsx
import { verifyCompletion } from '../../src/proxy-mcp/workflow/engine';

try {
  const result = verifyCompletion();

  if (result.passed) {
    console.log('✅ ワークフロー完了！');
    console.log('すべてのフェーズと検証が完了しました。');
    process.exit(0);
  } else {
    console.error('❌ ワークフローは未完了です\n');
    result.errors.forEach(e => console.error(`  - ${e}`));
    if (result.warnings.length > 0) {
      console.warn('\n⚠️  警告:');
      result.warnings.forEach(w => console.warn(`  - ${w}`));
    }
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
  process.exit(1);
}
