/**
 * Debug script for CLI generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileGenerator } from '../cli/generator';
import { getFrameworkById } from '../cli/wizard/steps/framework';

async function main() {
  const outputDir = '/tmp/test-cli-debug';

  // Clean up
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const generator = new FileGenerator();
  const express = getFrameworkById('express');

  if (!express) {
    console.error('Express framework not found');
    process.exit(1);
  }

  const results = await generator.generateAll({
    projectName: 'test-debug',
    description: 'Debug test',
    author: 'test@example.com',
    framework: express,
    features: [],
    apiKeys: {},
    outputDir
  });

  const pkgPath = path.join(outputDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const content = fs.readFileSync(pkgPath, 'utf8');
    console.log('=== GENERATED package.json ===');
    console.log(content);
    console.log('=== END ===');

    // Try to parse JSON
    try {
      JSON.parse(content);
      console.log('\n✅ Valid JSON');
    } catch (error: any) {
      console.log('\n❌ Invalid JSON:', error.message);
    }
  } else {
    console.error('package.json not found');
  }
}

main().catch(console.error);
