/**
 * i18n - Internationalization for Issue Logs
 *
 * Provides localized templates for GitHub Issue logs.
 * Default locale is Japanese (ja).
 *
 * Usage:
 *   import { t, getLocale, setLocale } from '../i18n';
 *   const message = t('supervisor.runlog.title', { runId: '123' });
 */
export type Locale = 'ja' | 'en';
/**
 * Get current locale from environment or config
 */
export declare function getLocale(): Locale;
/**
 * Set current locale
 */
export declare function setLocale(locale: Locale): void;
/**
 * Template strings for Japanese
 */
declare const jaTemplates: Record<string, string>;
/**
 * Template strings for English
 */
declare const enTemplates: Record<string, string>;
/**
 * Translate a template key with parameters
 */
export declare function t(key: string, params?: Record<string, string | number>): string;
/**
 * Get status emoji for progress
 */
export declare function getStatusEmoji(status: 'in_progress' | 'completed' | 'failed'): string;
/**
 * Format step list for approval issue
 */
export declare function formatSteps(steps: Array<{
    action: string;
    risk: string;
    target?: string;
}>): string;
/**
 * Create progress bar
 */
export declare function createProgressBar(completed: number, total: number): string;
export { jaTemplates, enTemplates };
