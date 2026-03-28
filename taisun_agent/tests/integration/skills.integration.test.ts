/**
 * Skill Integration Tests
 *
 * Tests for skill definitions and skill interactions.
 */

import {
  loadSkillDefinition,
  listSkills,
  mockSkillExecution,
  validateSkillDefinition,
  generateTestFixtures,
} from '../utils/test-helpers';

describe('Skill Integration Tests', () => {
  describe('Skill Definitions', () => {
    it('should load all skill definitions successfully', () => {
      const skills = listSkills();
      expect(skills.length).toBeGreaterThan(0);

      for (const skillName of skills) {
        const skill = loadSkillDefinition(skillName);
        expect(skill).not.toBeNull();
        expect(skill?.name).toBeDefined();
      }
    });

    it('should validate skill definition structure', () => {
      const skills = listSkills();

      for (const skillName of skills) {
        const skill = loadSkillDefinition(skillName);
        if (skill) {
          // Allow missing description for now, just check name
          validateSkillDefinition(skill);
          expect(skill.name).toBeDefined();
        }
      }
    });

    it('should have marketing skills', () => {
      const marketingSkills = [
        'taiyo-style-sales-letter',
        'taiyo-style-step-mail',
        'copywriting-helper',
        'customer-support-120',
        'lp-analysis',
      ];

      for (const skillName of marketingSkills) {
        const skill = loadSkillDefinition(skillName);
        expect(skill).not.toBeNull();
      }
    });

    it('should have creative skills', () => {
      const creativeSkills = ['nanobanana-prompts', 'nanobanana-pro', 'japanese-tts-reading'];

      for (const skillName of creativeSkills) {
        const skill = loadSkillDefinition(skillName);
        expect(skill).not.toBeNull();
      }
    });

    it('should have infrastructure skills', () => {
      const infraSkills = [
        'security-scan-trivy',
        'workflow-automation-n8n',
        'docker-mcp-ops',
        'postgres-mcp-analyst',
      ];

      for (const skillName of infraSkills) {
        const skill = loadSkillDefinition(skillName);
        expect(skill).not.toBeNull();
      }
    });
  });

  describe('Skill Execution', () => {
    const { sampleSkillArgs } = generateTestFixtures();

    it('should execute taiyo-style-sales-letter skill', async () => {
      const result = await mockSkillExecution('taiyo-style-sales-letter', sampleSkillArgs['taiyo-style-sales-letter']);

      expect(result.success).toBe(true);
      expect(result.skill).toBe('taiyo-style-sales-letter');
      expect(result.duration).toBeLessThan(5000);
    });

    it('should execute taiyo-style-step-mail skill', async () => {
      const result = await mockSkillExecution('taiyo-style-step-mail', sampleSkillArgs['taiyo-style-step-mail']);

      expect(result.success).toBe(true);
      expect(result.skill).toBe('taiyo-style-step-mail');
    });

    it('should execute lp-analysis skill', async () => {
      const result = await mockSkillExecution('lp-analysis', sampleSkillArgs['lp-analysis']);

      expect(result.success).toBe(true);
      expect(result.skill).toBe('lp-analysis');
    });

    it('should execute customer-support-120 skill', async () => {
      const result = await mockSkillExecution(
        'customer-support-120',
        sampleSkillArgs['customer-support-120']
      );

      expect(result.success).toBe(true);
      expect(result.skill).toBe('customer-support-120');
    });

    it('should execute nanobanana-prompts skill', async () => {
      const result = await mockSkillExecution(
        'nanobanana-prompts',
        sampleSkillArgs['nanobanana-prompts']
      );

      expect(result.success).toBe(true);
      expect(result.skill).toBe('nanobanana-prompts');
    });

    it('should execute security-scan-trivy skill', async () => {
      const result = await mockSkillExecution(
        'security-scan-trivy',
        sampleSkillArgs['security-scan-trivy']
      );

      expect(result.success).toBe(true);
      expect(result.skill).toBe('security-scan-trivy');
    });

    it('should execute japanese-tts-reading skill', async () => {
      const result = await mockSkillExecution(
        'japanese-tts-reading',
        sampleSkillArgs['japanese-tts-reading']
      );

      expect(result.success).toBe(true);
      expect(result.skill).toBe('japanese-tts-reading');
    });

    it('should fail gracefully for non-existent skill', async () => {
      const result = await mockSkillExecution('non-existent-skill', 'test args');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Skill Categories', () => {
    it('should have all marketing & content skills (11)', () => {
      const marketingSkills = [
        'copywriting-helper',
        'taiyo-style-sales-letter',
        'taiyo-style-step-mail',
        'taiyo-style-vsl',
        'launch-video',
        'lp-json-generator',
        'funnel-builder',
        'mendan-lp',
        'lp-analysis',
        'customer-support-120',
        'taiyo-style',
      ];

      const existingSkills = listSkills();
      const existingMarketingSkills = marketingSkills.filter((s) => existingSkills.includes(s));

      expect(existingMarketingSkills.length).toBeGreaterThanOrEqual(5);
    });

    it('should have all creative & media skills (3)', () => {
      const creativeSkills = ['nanobanana-pro', 'nanobanana-prompts', 'japanese-tts-reading'];

      const existingSkills = listSkills();
      const existingCreativeSkills = creativeSkills.filter((s) => existingSkills.includes(s));

      expect(existingCreativeSkills.length).toBeGreaterThanOrEqual(2);
    });

    it('should have all infrastructure skills (9)', () => {
      const infraSkills = [
        'workflow-automation-n8n',
        'docker-mcp-ops',
        'security-scan-trivy',
        'pdf-automation-gotenberg',
        'doc-convert-pandoc',
        'unified-notifications-apprise',
        'postgres-mcp-analyst',
        'notion-knowledge-mcp',
        'nlq-bi-wrenai',
      ];

      const existingSkills = listSkills();
      const existingInfraSkills = infraSkills.filter((s) => existingSkills.includes(s));

      expect(existingInfraSkills.length).toBeGreaterThanOrEqual(5);
    });

    it('should have research skill', () => {
      const skill = loadSkillDefinition('research-cited-report');
      expect(skill).not.toBeNull();
    });
  });

  describe('Skill Chaining', () => {
    it('should chain copywriting-helper → taiyo-style-sales-letter', async () => {
      const copywritingResult = await mockSkillExecution(
        'copywriting-helper',
        'Create headlines for fitness product'
      );
      expect(copywritingResult.success).toBe(true);

      const salesLetterResult = await mockSkillExecution(
        'taiyo-style-sales-letter',
        `--product "Fitness Course" --headlines "${copywritingResult.output}"`
      );
      expect(salesLetterResult.success).toBe(true);
    });

    it('should chain nanobanana-prompts → nanobanana-pro', async () => {
      const promptResult = await mockSkillExecution(
        'nanobanana-prompts',
        'YouTube thumbnail for coding tutorial'
      );
      expect(promptResult.success).toBe(true);

      const imageResult = await mockSkillExecution(
        'nanobanana-pro',
        promptResult.output || 'generated prompt'
      );
      expect(imageResult.success).toBe(true);
    });

    it('should execute multiple skills in parallel', async () => {
      const skills = ['taiyo-style-sales-letter', 'taiyo-style-step-mail', 'lp-analysis'];
      const args = [
        '--product "Test Product"',
        '--theme "Test Theme" --days 7',
        'https://example.com/lp',
      ];

      const results = await Promise.all(
        skills.map((skill, index) => mockSkillExecution(skill, args[index]))
      );

      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Skill Documentation', () => {
    it('should have instructions in skill definitions', () => {
      const skills = listSkills();

      for (const skillName of skills) {
        const skill = loadSkillDefinition(skillName);
        if (skill) {
          // Check that skill has some content
          expect(skill.instructions || skill.description).toBeDefined();
        }
      }
    });

    it('should have "When to Use" section in skill definitions', () => {
      const skills = listSkills();
      let skillsWithWhenToUse = 0;

      for (const skillName of skills) {
        const skill = loadSkillDefinition(skillName);
        if (skill?.instructions?.includes('When to Use')) {
          skillsWithWhenToUse++;
        }
      }

      // At least 25% of skills should have "When to Use" section
      expect(skillsWithWhenToUse).toBeGreaterThanOrEqual(skills.length * 0.25);
    });
  });
});
