#!/usr/bin/env node
/**
 * MCP Health Check Script (Cross-platform)
 * Checks the status of all configured MCP servers
 *
 * This is a Node.js replacement for mcp-health-check.sh
 * Works on Windows, Mac, and Linux without requiring bash
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

// Paths
const projectRoot = path.resolve(__dirname, '..');
const mcpConfigPath = path.join(projectRoot, '.mcp.json');
const envPath = path.join(projectRoot, '.env');

console.log('==========================================');
console.log('  MCP Server Health Check');
console.log('==========================================');
console.log('');

// Check if .mcp.json exists
if (!fs.existsSync(mcpConfigPath)) {
  console.log(`${colors.red}Error: .mcp.json not found at ${mcpConfigPath}${colors.reset}`);
  process.exit(1);
}

// Load environment variables
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

/**
 * Check if environment variable is configured
 */
function checkEnvVar(varName) {
  const value = process.env[varName];

  if (!value || value.includes('your_') || value.includes('xxxx')) {
    console.log(`${colors.yellow}  ! ENV: ${varName} not configured${colors.reset}`);
    return false;
  } else {
    console.log(`${colors.green}  ✓ ENV: ${varName} configured${colors.reset}`);
    return true;
  }
}

/**
 * Check if Docker is running
 */
function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Parse MCP config
let mcpConfig;
try {
  mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
} catch (error) {
  console.log(`${colors.red}Error: Failed to parse .mcp.json${colors.reset}`);
  console.log(error.message);
  process.exit(1);
}

console.log('Checking MCP Servers...');
console.log('');

const servers = Object.keys(mcpConfig.mcpServers || {});
let total = 0;
let ready = 0;
let missingConfig = 0;

for (const serverName of servers) {
  total++;

  const server = mcpConfig.mcpServers[serverName];
  const type = server.type;
  const description = server.description;
  const category = server.category || 'general';

  console.log(`[${category}] ${colors.green}${serverName}${colors.reset}`);
  console.log(`  Description: ${description}`);
  console.log(`  Type: ${type}`);

  let serverReady = true;

  // Check server-specific requirements
  switch (serverName) {
    case 'notion':
      if (!checkEnvVar('NOTION_API_KEY')) {
        serverReady = false;
      }
      break;

    case 'postgres-ro':
      if (!checkEnvVar('POSTGRES_MCP_DSN')) {
        serverReady = false;
      }
      break;

    case 'postgres-rw':
      if (!checkEnvVar('POSTGRES_MCP_DSN_RW')) {
        serverReady = false;
      }
      break;

    case 'github':
      if (!checkEnvVar('GITHUB_TOKEN')) {
        serverReady = false;
      }
      break;

    case 'slack':
      if (!checkEnvVar('SLACK_BOT_TOKEN')) {
        serverReady = false;
      }
      if (!checkEnvVar('SLACK_TEAM_ID')) {
        serverReady = false;
      }
      break;

    case 'brave-search':
      if (!checkEnvVar('BRAVE_API_KEY')) {
        serverReady = false;
      }
      break;

    case 'docker':
      if (isDockerRunning()) {
        console.log(`${colors.green}  ✓ Docker daemon running${colors.reset}`);
      } else {
        console.log(`${colors.red}  ✗ Docker daemon not running${colors.reset}`);
        serverReady = false;
      }
      break;

    case 'filesystem':
    case 'memory':
    case 'sequential-thinking':
      console.log(`${colors.green}  ✓ No external dependencies${colors.reset}`);
      break;
  }

  if (serverReady) {
    console.log(`  Status: ${colors.green}READY${colors.reset}`);
    ready++;
  } else {
    console.log(`  Status: ${colors.yellow}MISSING CONFIG${colors.reset}`);
    missingConfig++;
  }

  console.log('');
}

console.log('==========================================');
console.log('  Summary');
console.log('==========================================');
console.log(`  Total Servers:    ${total}`);
console.log(`  ${colors.green}Ready:            ${ready}${colors.reset}`);
console.log(`  ${colors.yellow}Missing Config:   ${missingConfig}${colors.reset}`);
console.log('');

if (missingConfig > 0) {
  console.log(`${colors.yellow}Some MCP servers need configuration.${colors.reset}`);
  console.log('See .env.example for required environment variables.');
  process.exit(0);
} else {
  console.log(`${colors.green}All MCP servers are configured!${colors.reset}`);
  process.exit(0);
}
