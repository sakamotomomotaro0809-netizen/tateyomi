/**
 * Skill Templates - M5
 *
 * Template definitions for docs, ecommerce, and internal-tool
 */

import { SkillTemplate, UrlAnalysis, GeneratedSkill } from './types';

/**
 * Documentation template
 *
 * For API docs, library docs, technical documentation
 */
export const docsTemplate: SkillTemplate = {
  type: 'docs',
  name: 'Documentation Skill',
  description: 'Generate skills for documentation sites (API docs, library docs, guides)',
  keywords: [
    'documentation',
    'docs',
    'api',
    'reference',
    'guide',
    'tutorial',
    'readme',
    'getting started',
    'installation',
    'usage',
  ],
  urlPatterns: [
    /docs?\./i,
    /\/docs?\//i,
    /\/api\//i,
    /\/reference\//i,
    /\/guide/i,
    /readme/i,
    /github\.com.*#readme/i,
    /\.io\/docs/i,
  ],
  generate: (data: UrlAnalysis): GeneratedSkill => {
    const skillName = sanitizeName(data.title || data.hostname);
    const sections = data.sections.slice(0, 10).map((s) => `- ${s}`).join('\n');

    const skillMd = `# ${data.title || skillName} Documentation Skill

## Overview

Skill for accessing ${data.hostname} documentation.

**Source URL:** ${data.url}

## Available Sections

${sections || '- (No sections detected)'}

## Usage

\`\`\`typescript
// Search documentation
skill.run('${skillName}', { mode: 'search', query: 'your query' });

// Get specific section
skill.run('${skillName}', { mode: 'section', name: 'section-name' });
\`\`\`

## Sample Content

${data.sampleContent.substring(0, 500)}${data.sampleContent.length > 500 ? '...' : ''}

## Auto-generated

This skill was auto-generated from ${data.url}.
Template: docs
`;

    return {
      name: skillName,
      skillMd,
      template: 'docs',
      usage: `skill.run('${skillName}', { mode: 'search', query: '...' })`,
    };
  },
};

/**
 * E-commerce template
 *
 * For product pages, shopping sites, marketplaces
 */
export const ecommerceTemplate: SkillTemplate = {
  type: 'ecommerce',
  name: 'E-commerce Skill',
  description: 'Generate skills for e-commerce sites (product pages, catalogs)',
  keywords: [
    'product',
    'price',
    'buy',
    'cart',
    'shop',
    'store',
    'checkout',
    'add to cart',
    'order',
    'shipping',
    'sale',
    'discount',
  ],
  urlPatterns: [
    /\/product/i,
    /\/item/i,
    /\/shop/i,
    /\/store/i,
    /amazon\./i,
    /ebay\./i,
    /shopify\./i,
    /\/cart/i,
    /\/checkout/i,
  ],
  generate: (data: UrlAnalysis): GeneratedSkill => {
    const skillName = sanitizeName(data.title || data.hostname);
    const productInfo = data.productInfo || {};

    const skillMd = `# ${data.title || skillName} E-commerce Skill

## Overview

Skill for accessing ${data.hostname} product information.

**Source URL:** ${data.url}

## Product Information

${productInfo.name ? `- **Name:** ${productInfo.name}` : ''}
${productInfo.price ? `- **Price:** ${productInfo.price}` : ''}
${productInfo.category ? `- **Category:** ${productInfo.category}` : ''}

## Usage

\`\`\`typescript
// Get product info
skill.run('${skillName}', { mode: 'info' });

// Search products
skill.run('${skillName}', { mode: 'search', query: 'product query' });

// Get price
skill.run('${skillName}', { mode: 'price' });
\`\`\`

## Sample Content

${data.sampleContent.substring(0, 500)}${data.sampleContent.length > 500 ? '...' : ''}

## Auto-generated

This skill was auto-generated from ${data.url}.
Template: ecommerce
`;

    return {
      name: skillName,
      skillMd,
      template: 'ecommerce',
      usage: `skill.run('${skillName}', { mode: 'info' })`,
    };
  },
};

/**
 * Internal tool template
 *
 * For internal tools, dashboards, admin panels
 */
export const internalToolTemplate: SkillTemplate = {
  type: 'internal-tool',
  name: 'Internal Tool Skill',
  description: 'Generate skills for internal tools (dashboards, admin panels, utilities)',
  keywords: [
    'dashboard',
    'admin',
    'panel',
    'console',
    'management',
    'settings',
    'configuration',
    'internal',
    'tool',
    'utility',
  ],
  urlPatterns: [
    /\/admin/i,
    /\/dashboard/i,
    /\/console/i,
    /\/panel/i,
    /\/settings/i,
    /\/config/i,
    /internal\./i,
    /localhost/i,
    /127\.0\.0\.1/i,
  ],
  generate: (data: UrlAnalysis): GeneratedSkill => {
    const skillName = sanitizeName(data.title || data.hostname);
    const sections = data.sections.slice(0, 10).map((s) => `- ${s}`).join('\n');

    const skillMd = `# ${data.title || skillName} Internal Tool Skill

## Overview

Skill for ${data.hostname} internal tool/dashboard.

**Source URL:** ${data.url}

## Available Features

${sections || '- (No features detected)'}

## Usage

\`\`\`typescript
// Get tool status
skill.run('${skillName}', { mode: 'status' });

// Execute action
skill.run('${skillName}', { mode: 'action', name: 'action-name' });

// Get configuration
skill.run('${skillName}', { mode: 'config' });
\`\`\`

## Sample Content

${data.sampleContent.substring(0, 500)}${data.sampleContent.length > 500 ? '...' : ''}

## Auto-generated

This skill was auto-generated from ${data.url}.
Template: internal-tool

## Security Note

This skill accesses internal tools. Use with caution.
`;

    return {
      name: skillName,
      skillMd,
      template: 'internal-tool',
      usage: `skill.run('${skillName}', { mode: 'status' })`,
    };
  },
};

/**
 * All available templates
 */
export const templates: SkillTemplate[] = [
  docsTemplate,
  ecommerceTemplate,
  internalToolTemplate,
];

/**
 * Get template by type
 */
export function getTemplate(type: string): SkillTemplate | undefined {
  return templates.find((t) => t.type === type);
}

/**
 * Detect best template for URL analysis
 */
export function detectTemplate(analysis: UrlAnalysis): SkillTemplate {
  let bestMatch: { template: SkillTemplate; score: number } | null = null;

  for (const template of templates) {
    let score = 0;

    // Check URL patterns
    for (const pattern of template.urlPatterns) {
      if (pattern.test(analysis.url)) {
        score += 3;
        break;
      }
    }

    // Check content keywords
    const contentLower = analysis.sampleContent.toLowerCase();
    for (const keyword of template.keywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    // Check content type match
    if (
      (template.type === 'docs' && (analysis.contentType === 'documentation' || analysis.contentType === 'api')) ||
      (template.type === 'ecommerce' && analysis.contentType === 'product') ||
      (template.type === 'internal-tool' && analysis.contentType === 'tool')
    ) {
      score += 5;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { template, score };
    }
  }

  // Default to docs if no strong match
  return bestMatch?.template || docsTemplate;
}

/**
 * Sanitize string for use as skill name
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || 'unnamed-skill';
}
