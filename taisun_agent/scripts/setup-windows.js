#!/usr/bin/env node
/**
 * Windows Setup Script
 * Validates Windows environment and provides setup instructions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}==========================================`);
console.log('  TAISUN v2 - Windows Setup');
console.log(`==========================================${colors.reset}\n`);

let hasErrors = false;
let hasWarnings = false;

/**
 * Check if command exists
 */
function commandExists(command) {
  try {
    execSync(`where ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get command version
 */
function getVersion(command, args = '--version') {
  try {
    return execSync(`${command} ${args}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

console.log(`${colors.blue}[1/6] Checking Node.js...${colors.reset}`);
if (commandExists('node')) {
  const version = getVersion('node');
  console.log(`${colors.green}  ✓ Node.js installed: ${version}${colors.reset}`);

  // Check Node.js version
  const nodeVersion = parseInt(version.match(/v(\d+)/)[1]);
  if (nodeVersion < 18) {
    console.log(`${colors.red}  ✗ Node.js 18 or higher required (current: v${nodeVersion})${colors.reset}`);
    hasErrors = true;
  }
} else {
  console.log(`${colors.red}  ✗ Node.js not found${colors.reset}`);
  console.log(`${colors.yellow}    Install from: https://nodejs.org/${colors.reset}`);
  hasErrors = true;
}

console.log(`\n${colors.blue}[2/6] Checking Git...${colors.reset}`);
if (commandExists('git')) {
  const version = getVersion('git');
  console.log(`${colors.green}  ✓ Git installed: ${version}${colors.reset}`);

  // Check Git config
  try {
    const coreAutocrlf = execSync('git config core.autocrlf', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (coreAutocrlf !== 'false') {
      console.log(`${colors.yellow}  ! Warning: core.autocrlf is "${coreAutocrlf}" (recommended: false)${colors.reset}`);
      console.log(`${colors.yellow}    Run: git config --global core.autocrlf false${colors.reset}`);
      hasWarnings = true;
    }
  } catch {
    // No config set, which is okay
  }
} else {
  console.log(`${colors.red}  ✗ Git not found${colors.reset}`);
  console.log(`${colors.yellow}    Install from: https://git-scm.com/download/win${colors.reset}`);
  hasErrors = true;
}

console.log(`\n${colors.blue}[3/6] Checking npm...${colors.reset}`);
if (commandExists('npm')) {
  const version = getVersion('npm');
  console.log(`${colors.green}  ✓ npm installed: ${version}${colors.reset}`);
} else {
  console.log(`${colors.red}  ✗ npm not found (should come with Node.js)${colors.reset}`);
  hasErrors = true;
}

console.log(`\n${colors.blue}[4/6] Checking TypeScript...${colors.reset}`);
if (commandExists('tsc')) {
  const version = getVersion('tsc');
  console.log(`${colors.green}  ✓ TypeScript installed: ${version}${colors.reset}`);
} else {
  console.log(`${colors.yellow}  ! TypeScript not globally installed (will be installed via npm install)${colors.reset}`);
}

console.log(`\n${colors.blue}[5/6] Checking optional dependencies...${colors.reset}`);

// Docker (optional)
if (commandExists('docker')) {
  const version = getVersion('docker');
  console.log(`${colors.green}  ✓ Docker installed: ${version}${colors.reset}`);
  try {
    execSync('docker info', { stdio: 'pipe' });
    console.log(`${colors.green}  ✓ Docker daemon is running${colors.reset}`);
  } catch {
    console.log(`${colors.yellow}  ! Docker is installed but daemon is not running${colors.reset}`);
  }
} else {
  console.log(`${colors.yellow}  - Docker not installed (optional, needed for some MCP servers)${colors.reset}`);
}

// GitHub CLI (optional)
if (commandExists('gh')) {
  const version = getVersion('gh');
  console.log(`${colors.green}  ✓ GitHub CLI installed: ${version}${colors.reset}`);
} else {
  console.log(`${colors.yellow}  - GitHub CLI not installed (optional, needed for supervisor features)${colors.reset}`);
  console.log(`${colors.yellow}    Install from: https://cli.github.com/${colors.reset}`);
}

console.log(`\n${colors.blue}[6/6] Checking project files...${colors.reset}`);
const projectRoot = path.resolve(__dirname, '..');

// Check .env
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  console.log(`${colors.green}  ✓ .env file exists${colors.reset}`);
} else {
  console.log(`${colors.yellow}  ! .env file not found${colors.reset}`);
  console.log(`${colors.yellow}    Copy .env.example to .env and configure${colors.reset}`);
  hasWarnings = true;
}

// Check node_modules
const nodeModulesPath = path.join(projectRoot, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log(`${colors.green}  ✓ node_modules exists${colors.reset}`);
} else {
  console.log(`${colors.yellow}  ! node_modules not found${colors.reset}`);
  console.log(`${colors.yellow}    Run: npm install${colors.reset}`);
  hasWarnings = true;
}

// Check dist folder (build output)
const distPath = path.join(projectRoot, 'dist');
if (fs.existsSync(distPath)) {
  console.log(`${colors.green}  ✓ dist folder exists (TypeScript build successful)${colors.reset}`);
} else {
  console.log(`${colors.yellow}  ! dist folder not found${colors.reset}`);
  console.log(`${colors.yellow}    Run: npm run build:all${colors.reset}`);
  console.log(`${colors.yellow}    If build fails, see docs/WINDOWS_SETUP.md (🚨 Troubleshooting)${colors.reset}`);
  hasWarnings = true;
}

// Summary
console.log(`\n${colors.cyan}==========================================`);
console.log('  Setup Summary');
console.log(`==========================================${colors.reset}\n`);

if (hasErrors) {
  console.log(`${colors.red}❌ Setup incomplete - please fix the errors above${colors.reset}\n`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${colors.yellow}⚠️  Setup complete with warnings${colors.reset}`);
  console.log(`${colors.yellow}Please review the warnings above for optimal experience.${colors.reset}\n`);
  printNextSteps();
  process.exit(0);
} else {
  console.log(`${colors.green}✅ All checks passed!${colors.reset}\n`);
  printNextSteps();
  process.exit(0);
}

function printNextSteps() {
  console.log(`${colors.cyan}Next Steps:${colors.reset}`);
  console.log('  1. Run: npm install');
  console.log('  2. Verify build: ls dist/');
  console.log('     If dist/ is missing, run: npm run build:all');
  console.log('  3. Run tests (with minimal output): npm run test:silent');
  console.log('     Or for summary only: npm run test:summary');
  console.log('  4. Run: npm run mcp:health');
  console.log('  5. Run: claude (start Claude Code)');
  console.log('');
  console.log(`${colors.yellow}⚠️  Important:${colors.reset}`);
  console.log('  - If tests produce massive logs (13万+ characters):');
  console.log('    See docs/WINDOWS_SETUP.md "🚨 Troubleshooting"');
  console.log('  - DO NOT paste large logs into Claude (causes API 400 error)');
  console.log('  - Use: npm run test:summary instead');
  console.log('');
  console.log(`${colors.cyan}Documentation:${colors.reset}`);
  console.log('  - README.md');
  console.log('  - docs/QUICK_START.md');
  console.log('  - docs/WINDOWS_SETUP.md (Windows-specific guide)');
  console.log('');
}
