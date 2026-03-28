#!/usr/bin/env node
/**
 * List Skills Script
 * Lists all available skills in TAISUN v2
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', '.claude', 'skills');

function getSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    return [];
  }
  return fs.readdirSync(SKILLS_DIR)
    .filter(f => {
      const skillPath = path.join(SKILLS_DIR, f);
      return fs.statSync(skillPath).isDirectory() &&
             fs.existsSync(path.join(skillPath, 'SKILL.md'));
    })
    .map(f => {
      const skillFile = path.join(SKILLS_DIR, f, 'SKILL.md');
      const content = fs.readFileSync(skillFile, 'utf8');
      const titleMatch = content.match(/^#\s*(.+)/m);
      const whenMatch = content.match(/## When to Use[\s\S]*?(?=##|$)/i);
      return {
        name: f,
        title: titleMatch ? titleMatch[1].trim() : f,
        whenToUse: whenMatch ? whenMatch[0].replace(/## When to Use\s*/i, '').trim().split('\n')[0] : ''
      };
    });
}

function categorizeSkills(skills) {
  const categories = {
    marketing: [],
    content: [],
    aiImage: [],
    videoAgent: [],
    infrastructure: [],
    other: []
  };

  for (const skill of skills) {
    const name = skill.name.toLowerCase();
    if (name.includes('lp') || name.includes('sales') || name.includes('copy') ||
        name.includes('step') || name.includes('vsl') || name.includes('launch') ||
        name.includes('mendan') || name.includes('funnel') || name.includes('customer') ||
        name.includes('tommy') || name.includes('education') || name.includes('line-marketing')) {
      categories.marketing.push(skill);
    } else if (name.includes('kindle') || name.includes('note') || name.includes('youtube') ||
               name.includes('manga') || name.includes('anime') || name.includes('diagram') ||
               name.includes('custom-character') || name.includes('sns')) {
      categories.content.push(skill);
    } else if (name.includes('gemini') || name.includes('nanobanana') ||
               name.includes('omnihuman') || name.includes('tts')) {
      categories.aiImage.push(skill);
    } else if (name.includes('video-')) {
      categories.videoAgent.push(skill);
    } else if (name.includes('docker') || name.includes('postgres') || name.includes('notion') ||
               name.includes('security') || name.includes('pdf') || name.includes('doc-convert') ||
               name.includes('workflow') || name.includes('unified') || name.includes('nlq') ||
               name.includes('research')) {
      categories.infrastructure.push(skill);
    } else {
      categories.other.push(skill);
    }
  }

  return categories;
}

function main() {
  const args = process.argv.slice(2);
  const showDetails = args.includes('--details') || args.includes('-d');
  const jsonOutput = args.includes('--json') || args.includes('-j');

  const skills = getSkills();

  if (jsonOutput) {
    console.log(JSON.stringify(skills, null, 2));
    return;
  }

  console.log('=== TAISUN v2 Skills ===\n');
  console.log(`Total: ${skills.length} skills\n`);

  if (showDetails) {
    const categories = categorizeSkills(skills);
    const categoryNames = {
      marketing: 'Marketing & Sales',
      content: 'Content Creation',
      aiImage: 'AI Image & Video',
      videoAgent: 'Video Agent System',
      infrastructure: 'Infrastructure',
      other: 'Other'
    };

    for (const [category, list] of Object.entries(categories)) {
      if (list.length > 0) {
        console.log(`\n## ${categoryNames[category]} (${list.length})`);
        for (const skill of list) {
          console.log(`  - ${skill.name}: ${skill.title}`);
        }
      }
    }
  } else {
    for (const skill of skills) {
      console.log(`  ${skill.name}`);
    }
  }

  console.log('\nUse --details or -d for categorized view');
  console.log('Use --json or -j for JSON output');
}

main();
