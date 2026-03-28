/**
 * Skillize Types - M5
 *
 * Template-driven skill generation from URLs
 */

/**
 * Template types available for skill generation
 */
export type TemplateType = 'docs' | 'ecommerce' | 'internal-tool';

/**
 * Template definition
 */
export interface SkillTemplate {
  type: TemplateType;
  name: string;
  description: string;
  /** Keywords that indicate this template should be used */
  keywords: string[];
  /** URL patterns that indicate this template */
  urlPatterns: RegExp[];
  /** Generate skill content from URL data */
  generate: (data: UrlAnalysis) => GeneratedSkill;
}

/**
 * URL analysis result
 */
export interface UrlAnalysis {
  url: string;
  title: string;
  description?: string;
  contentType: 'documentation' | 'api' | 'product' | 'article' | 'tool' | 'unknown';
  hostname: string;
  path: string;
  /** Key sections or features detected */
  sections: string[];
  /** Sample content for template */
  sampleContent: string;
  /** Detected API endpoints if any */
  apiEndpoints?: string[];
  /** Detected product info if any */
  productInfo?: {
    name?: string;
    price?: string;
    category?: string;
  };
}

/**
 * Generated skill content
 */
export interface GeneratedSkill {
  /** Skill name (directory name) */
  name: string;
  /** SKILL.md content */
  skillMd: string;
  /** Optional additional files */
  files?: Record<string, string>;
  /** Template used */
  template: TemplateType;
  /** Estimated usage */
  usage: string;
}

/**
 * Skillize options
 */
export interface SkillizeOptions {
  /** Template to use (auto-detect if not specified) */
  template?: TemplateType;
  /** Custom skill name */
  name?: string;
  /** Actually write files (default: false = dry-run) */
  confirmWrite?: boolean;
  /** Memory namespace for storing generated skill */
  namespace?: 'short-term' | 'long-term';
}

/**
 * Skillize result
 */
export interface SkillizeResult {
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Reference ID for stored skill in memory */
  refId?: string;
  /** Summary of generated skill */
  summary?: string;
  /** Detected/used template type */
  template?: TemplateType;
  /** Generated skill data (preview only, full in memory) */
  data?: {
    skillName: string;
    preview: string;
    filesCount: number;
    written: boolean;
    path?: string;
    message: string;
  };
}
