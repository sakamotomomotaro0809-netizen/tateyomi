#!/usr/bin/env node
/**
 * CLI Init Wizard - Main Entry Point
 *
 * Interactive wizard for initializing new projects
 */

import * as path from 'path';
import { runEnvironmentCheck } from './wizard/steps/environment';
import { loadFrameworks } from './wizard/steps/framework';
import { getCompatibleFeatures } from './wizard/steps/features';
import { FileGenerator } from './generator';

/**
 * Main CLI function
 */
async function main() {
  console.log('\n🚀 TAISUN CLI Init Wizard\n');

  // Step 1: Environment Check
  console.log('Step 1: Environment Check...');
  const envCheck = await runEnvironmentCheck();

  if (!envCheck.passed) {
    console.error('\n❌ Environment check failed:');
    if (!envCheck.checks.node.passed) {
      console.error(`  - Node.js: ${envCheck.checks.node.error}`);
    }
    if (!envCheck.checks.npm.passed) {
      console.error(`  - npm: ${envCheck.checks.npm.error}`);
    }
    if (!envCheck.checks.git.passed) {
      console.error(`  - git: ${envCheck.checks.git.error}`);
    }
    process.exit(1);
  }

  console.log('✓ Environment check passed');
  console.log(`  - Node.js: ${envCheck.checks.node.version}`);
  console.log(`  - npm: ${envCheck.checks.npm.version}`);
  console.log(`  - git: ${envCheck.checks.git.version}`);

  // Step 2-4: Collect project info (would use inquirer in production)
  // For now, use hardcoded example for demonstration
  const projectInfo = {
    projectName: 'my-test-project',
    description: 'A test project created with TAISUN CLI',
    author: 'test@example.com'
  };

  // Step 3: Select framework
  const frameworks = loadFrameworks();
  const selectedFramework = frameworks[1]; // Express for demo

  console.log(`\n✓ Selected framework: ${selectedFramework.name}`);

  // Step 4: Select features
  const compatibleFeatures = getCompatibleFeatures(selectedFramework.language);
  const selectedFeatures = [compatibleFeatures[0], compatibleFeatures[1]]; // First 2 features

  console.log(`✓ Selected features: ${selectedFeatures.map(f => f.name).join(', ')}`);

  // Step 5: Generate files
  console.log('\n🔨 Generating project files...');

  const outputDir = path.join(process.cwd(), projectInfo.projectName);
  const generator = new FileGenerator();

  const results = await generator.generateAll({
    projectName: projectInfo.projectName,
    description: projectInfo.description,
    author: projectInfo.author,
    framework: selectedFramework,
    features: selectedFeatures,
    apiKeys: {},
    outputDir
  });

  // Display results
  console.log('\n📁 Generated files:');
  for (const result of results) {
    if (result.success) {
      console.log(`  ✓ ${path.relative(process.cwd(), result.path)}`);
    } else {
      console.log(`  ✗ ${path.relative(process.cwd(), result.path)} - ${result.error}`);
    }
  }

  console.log('\n✅ CLI Init Wizard completed!\n');
  console.log('Next steps:');
  console.log(`  cd ${projectInfo.projectName}`);
  console.log('  npm install');
  console.log('  npm run dev');
  console.log('');
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

export { main };
