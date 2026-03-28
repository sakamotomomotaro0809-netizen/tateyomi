/**
 * Template renderer using Handlebars
 *
 * Renders template files with provided context data
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Simple Handlebars-like template renderer
 * Supports basic variable interpolation and conditionals
 */
export class TemplateRenderer {
  /**
   * Render a template file with context data
   *
   * @param templatePath - Path to template file
   * @param context - Context data for template
   * @returns Rendered content
   */
  render(templatePath: string, context: Record<string, any>): string {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return this.renderString(templateContent, context);
  }

  /**
   * Render a template string with context data
   *
   * @param template - Template string
   * @param context - Context data
   * @returns Rendered content
   */
  renderString(template: string, context: Record<string, any>): string {
    let result = template;

    // Handle {{#each array}}...{{/each}} FIRST (before other replacements)
    result = result.replace(
      /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayName, content) => {
        const array = this.resolveValue(arrayName.trim(), context);
        if (!array || !Array.isArray(array)) {
          // Try to interpret as object
          if (typeof array === 'object') {
            const entries = Object.entries(array);
            // Return empty string for empty objects
            if (entries.length === 0) {
              return '';
            }
            return entries
              .map(([key, value], index, arr) => {
                const itemContext = {
                  ...context,
                  '@key': key,
                  '@value': value,
                  '@index': index,
                  '@first': index === 0,
                  '@last': index === arr.length - 1,
                  this: value
                };
                return this.renderString(content, itemContext);
              })
              .join('');
          }
          return '';
        }
        // Return empty string for empty arrays
        if (array.length === 0) {
          return '';
        }
        return array
          .map((item, index) => {
            const itemContext = {
              ...context,
              '@index': index,
              '@first': index === 0,
              '@last': index === array.length - 1,
              this: item
            };
            return this.renderString(content, itemContext);
          })
          .join('');
      }
    );

    // Handle {{#if condition}}...{{/if}} AFTER each
    result = result.replace(
      /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condition, content) => {
        const value = this.resolveValue(condition.trim(), context);
        return value ? this.renderString(content, context) : '';
      }
    );

    // Handle {{#unless condition}}...{{/unless}}
    result = result.replace(
      /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
      (match, condition, content) => {
        const value = this.resolveValue(condition.trim(), context);
        return !value ? this.renderString(content, context) : '';
      }
    );

    // Replace simple variables {{variable}} LAST
    result = result.replace(/\{\{([^{}#/]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return this.resolveValue(trimmedKey, context) || '';
    });

    return result;
  }

  /**
   * Resolve nested property path (e.g., "user.name")
   */
  private resolveValue(path: string, context: Record<string, any>): any {
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}
