#!/usr/bin/env node
/**
 * Update Memory Stats Script
 * Updates agent memory statistics from execution logs
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const MEMORY_DIR = path.join(__dirname, '..', '.claude', 'memory');
const AGENTS_DIR = path.join(MEMORY_DIR, 'agents');

function getAgentFiles() {
  if (!fs.existsSync(AGENTS_DIR)) {
    console.log('Creating agents directory...');
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
    return [];
  }
  return fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.yaml'));
}

function updateAgentStats(agentFile) {
  const filePath = path.join(AGENTS_DIR, agentFile);
  const content = fs.readFileSync(filePath, 'utf8');
  const stats = yaml.parse(content);

  // Update last_updated timestamp
  stats.last_updated = new Date().toISOString();

  // Increment total_invocations if tracking
  if (typeof stats.total_invocations === 'number') {
    stats.total_invocations += 1;
  }

  fs.writeFileSync(filePath, yaml.stringify(stats));
  return stats;
}

function main() {
  console.log('=== TAISUN Memory Stats Updater ===\n');

  const agentFiles = getAgentFiles();
  console.log(`Found ${agentFiles.length} agent stat files\n`);

  if (agentFiles.length === 0) {
    console.log('No agent stats to update.');
    return;
  }

  let updated = 0;
  for (const file of agentFiles) {
    try {
      updateAgentStats(file);
      updated++;
    } catch (err) {
      console.error(`Error updating ${file}: ${err.message}`);
    }
  }

  console.log(`\nUpdated ${updated}/${agentFiles.length} agent stats`);
}

main();
