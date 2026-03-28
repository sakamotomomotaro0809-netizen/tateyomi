/**
 * Project name validator
 *
 * Validates project names according to npm package naming rules:
 * - lowercase letters only
 * - kebab-case (hyphens allowed)
 * - must start with a letter
 * - minimum 3 characters
 * - no special characters except hyphens
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Reserved npm package names that should not be used
const RESERVED_NAMES = [
  'node_modules',
  'favicon.ico',
  'package.json',
  'package-lock.json',
  'npm-debug.log',
  'yarn-error.log',
  'pnpm-debug.log'
];

/**
 * Validate project name
 *
 * @param name - Project name to validate
 * @returns Validation result with error message if invalid
 */
export function validateProjectName(name: string): ValidationResult {
  // Check if empty
  if (!name || name.trim() === '') {
    return {
      valid: false,
      error: 'Project name is required'
    };
  }

  // Check minimum length
  if (name.length < 3) {
    return {
      valid: false,
      error: 'Project name must be at least 3 characters'
    };
  }

  // Check against reserved names first (before format checks)
  if (RESERVED_NAMES.includes(name)) {
    return {
      valid: false,
      error: `"${name}" is a reserved name and cannot be used`
    };
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(name)) {
    return {
      valid: false,
      error: 'Project name must be lowercase'
    };
  }

  // Check for underscores (must be kebab-case)
  if (/_/.test(name)) {
    return {
      valid: false,
      error: 'Project name must use kebab-case (hyphens, not underscores)'
    };
  }

  // Check if starts with a letter
  if (!/^[a-z]/.test(name)) {
    return {
      valid: false,
      error: 'Project name must start with a letter'
    };
  }

  // Check if ends with hyphen
  if (/-$/.test(name)) {
    return {
      valid: false,
      error: 'Project name cannot end with a hyphen'
    };
  }

  // Check for invalid characters (only lowercase letters, numbers, and hyphens)
  if (!/^[a-z0-9-]+$/.test(name)) {
    return {
      valid: false,
      error: 'Project name can only contain lowercase letters, numbers, and hyphens'
    };
  }

  return {
    valid: true
  };
}
