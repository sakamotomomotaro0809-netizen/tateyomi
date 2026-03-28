/**
 * Email validator
 *
 * Validates email addresses using a standard regex pattern.
 * Supports common email formats including:
 * - Standard format: user@domain.com
 * - Subdomains: user@mail.domain.com
 * - Plus signs: user+tag@domain.com
 * - Dots: first.last@domain.com
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Standard email regex pattern
// Matches most common email formats
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate email address
 *
 * @param email - Email address to validate
 * @returns Validation result with error message if invalid
 */
export function validateEmail(email: string): ValidationResult {
  // Check if empty
  if (!email || email.trim() === '') {
    return {
      valid: false,
      error: 'Email is required'
    };
  }

  // Check for spaces
  if (/\s/.test(email)) {
    return {
      valid: false,
      error: 'Email cannot contain spaces'
    };
  }

  // Check basic format
  if (!email.includes('@')) {
    return {
      valid: false,
      error: 'Please enter a valid email address'
    };
  }

  // Check for multiple @ signs
  if ((email.match(/@/g) || []).length > 1) {
    return {
      valid: false,
      error: 'Email cannot contain multiple @ signs'
    };
  }

  // Split email into local and domain parts
  const [local, domain] = email.split('@');

  // Check local part (before @)
  if (!local || local.length === 0) {
    return {
      valid: false,
      error: 'Email must have a local part before @'
    };
  }

  // Check domain part (after @)
  if (!domain || domain.length === 0) {
    return {
      valid: false,
      error: 'Email must have a domain after @'
    };
  }

  // Validate with regex
  if (!EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      error: 'Please enter a valid email address'
    };
  }

  return {
    valid: true
  };
}
