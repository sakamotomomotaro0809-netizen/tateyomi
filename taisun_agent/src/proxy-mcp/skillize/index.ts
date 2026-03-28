/**
 * Skillize Module - M5
 *
 * Template-driven skill generation from URLs
 */

export { skillize, listGeneratedSkills } from './skillize';
export { templates, getTemplate, detectTemplate } from './templates';
export type {
  TemplateType,
  SkillTemplate,
  UrlAnalysis,
  GeneratedSkill,
  SkillizeOptions,
  SkillizeResult,
} from './types';
