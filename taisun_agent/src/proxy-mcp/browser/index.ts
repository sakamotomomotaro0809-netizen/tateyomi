/**
 * Browser Module - Chrome/Puppeteer integration for M4
 *
 * Exports:
 * - Web skills (read_url, extract_links, capture_dom_map)
 * - CAPTCHA detection utilities
 * - Types
 */

export * from './types';
export { detectCaptcha, guardCaptcha, checkBlockedPatterns } from './captcha';
export {
  readUrl,
  extractLinks,
  captureDomMap,
  listTabsUrls,
  normalizeUrlBundle,
  getUrlBundleStats,
  batchSkillizeUrlBundle,
  batchSkillizePreview,
  webSkillizeFromTabs,
} from './skills';
