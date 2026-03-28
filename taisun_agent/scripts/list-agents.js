#!/usr/bin/env node
/**
 * List Agents Script
 * Lists all available agents in TAISUN v2
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', '.claude', 'agents');

function getAgents() {
  if (!fs.existsSync(AGENTS_DIR)) {
    return [];
  }
  return fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const name = f.replace('.md', '');
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const descMatch = content.match(/description:\s*(.+)/i) ||
                        content.match(/^#\s*(.+)/m);
      return {
        name,
        description: descMatch ? descMatch[1].trim() : 'No description'
      };
    });
}

function categorizeAgents(agents) {
  const categories = {
    coordinators: [],
    architects: [],
    developers: [],
    testers: [],
    operations: [],
    documentation: [],
    analysis: [],
    specialized: [],
    multiAgent: [],
    taiyou: [],
    other: []
  };

  for (const agent of agents) {
    const name = agent.name.toLowerCase();
    if (name.includes('coordinator')) categories.coordinators.push(agent);
    else if (name.includes('architect') || name.includes('designer')) categories.architects.push(agent);
    else if (name.includes('developer') || name.includes('builder')) categories.developers.push(agent);
    else if (name.includes('test') || name.includes('qa') || name.includes('validator')) categories.testers.push(agent);
    else if (name.includes('devops') || name.includes('cicd') || name.includes('monitor') ||
             name.includes('incident') || name.includes('backup') || name.includes('container') ||
             name.includes('config') || name.includes('release')) categories.operations.push(agent);
    else if (name.includes('doc') || name.includes('writer') || name.includes('knowledge')) categories.documentation.push(agent);
    else if (name.includes('analy') || name.includes('scout') || name.includes('learning')) categories.analysis.push(agent);
    else if (name.includes('multi-agent') || name.includes('reflection') || name.includes('ensemble')) categories.multiAgent.push(agent);
    else if (name.includes('taiyou')) categories.taiyou.push(agent);
    else if (name.includes('bug') || name.includes('refactor') || name.includes('script') ||
             name.includes('implementation')) categories.specialized.push(agent);
    else categories.other.push(agent);
  }

  return categories;
}

function main() {
  const args = process.argv.slice(2);
  const showDetails = args.includes('--details') || args.includes('-d');
  const jsonOutput = args.includes('--json') || args.includes('-j');

  const agents = getAgents();

  if (jsonOutput) {
    console.log(JSON.stringify(agents, null, 2));
    return;
  }

  console.log('=== TAISUN v2 Agents ===\n');
  console.log(`Total: ${agents.length} agents\n`);

  if (showDetails) {
    const categories = categorizeAgents(agents);
    for (const [category, list] of Object.entries(categories)) {
      if (list.length > 0) {
        console.log(`\n## ${category.charAt(0).toUpperCase() + category.slice(1)} (${list.length})`);
        for (const agent of list) {
          console.log(`  - ${agent.name}`);
        }
      }
    }
  } else {
    for (const agent of agents) {
      console.log(`  ${agent.name}`);
    }
  }

  console.log('\nUse --details or -d for categorized view');
  console.log('Use --json or -j for JSON output');
}

main();
