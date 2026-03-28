/**
 * Browser Module Types
 */

export interface CaptchaGuardrails {
  detectPatterns: string[];
  action: 'require_human' | 'deny';
  message: string;
}

export interface PageContent {
  url: string;
  title: string;
  text: string;
  html?: string;
}

export interface PageLink {
  href: string;
  text: string;
  title?: string;
}

export interface DomComponent {
  type: 'header' | 'nav' | 'main' | 'article' | 'section' | 'form' | 'list' | 'card' | 'footer' | 'unknown';
  selector: string;
  text?: string;
  children?: number;
}

export interface DomMap {
  url: string;
  title: string;
  components: DomComponent[];
}

export interface WebSkillResult {
  success: boolean;
  action?: 'allow' | 'require_human' | 'deny';
  reason?: string;
  refId?: string;
  summary?: string;
  data?: Record<string, unknown>;
  error?: string;
}
