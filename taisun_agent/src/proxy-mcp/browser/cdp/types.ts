/**
 * CDP Browser Types
 *
 * Type definitions for Chrome DevTools Protocol integration.
 */

import type { Browser, BrowserContext } from 'playwright-core';

export interface CDPConfig {
  /** CDP endpoint URL (default: http://127.0.0.1:9222) */
  endpointUrl: string;
  /** Connection timeout in ms (default: 10000) */
  timeout: number;
  /** Max retry attempts (default: 3) */
  maxRetries: number;
}

export interface CDPConnection {
  browser: Browser;
  context: BrowserContext;
  isConnected: boolean;
}

export interface CDPActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requireHuman?: boolean;
  humanReason?: string;
}

export interface PageContent {
  url: string;
  title: string;
  content: string;
  /** Truncated for minimal output */
  contentPreview: string;
}

export interface ExtractedLinks {
  url: string;
  title: string;
  links: LinkInfo[];
  /** Total count */
  totalLinks: number;
  /** Truncated list for minimal output */
  linksPreview: LinkInfo[];
}

export interface LinkInfo {
  href: string;
  text: string;
  title?: string;
}

export interface DOMMap {
  url: string;
  title: string;
  /** Structured DOM representation */
  elements: DOMElement[];
  /** Total element count */
  totalElements: number;
  /** Truncated for minimal output */
  elementsPreview: DOMElement[];
}

export interface DOMElement {
  tag: string;
  id?: string;
  classes?: string[];
  text?: string;
  attributes?: Record<string, string>;
  children?: DOMElement[];
}

export interface TabInfo {
  url: string;
  title: string;
  index: number;
}

export interface TabsList {
  tabs: TabInfo[];
  totalTabs: number;
  /** Preview list for minimal output */
  tabsPreview: TabInfo[];
}

/** Patterns that indicate CAPTCHA or login requirements */
export const CAPTCHA_PATTERNS = [
  /captcha/i,
  /verify.*human/i,
  /are.*you.*robot/i,
  /security.*check/i,
  /prove.*not.*bot/i,
  /recaptcha/i,
  /hcaptcha/i,
  /cloudflare.*challenge/i,
  /access.*denied/i,
  /please.*sign.*in/i,
  /login.*required/i,
  /authentication.*required/i,
];

/** Check if content indicates CAPTCHA or login requirement */
export function detectCaptchaOrLogin(
  title: string,
  content: string,
  url: string
): { detected: boolean; reason?: string } {
  const combined = `${title} ${content} ${url}`.toLowerCase();

  for (const pattern of CAPTCHA_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        detected: true,
        reason: `Detected pattern: ${pattern.source}`,
      };
    }
  }

  return { detected: false };
}

export const DEFAULT_CDP_CONFIG: CDPConfig = {
  endpointUrl: 'http://127.0.0.1:9222',
  timeout: 10000,
  maxRetries: 3,
};
