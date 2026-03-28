/**
 * API key validator
 *
 * Validates API keys for different providers:
 * - OpenAI: sk-proj-... or sk-...
 * - Anthropic: sk-ant-...
 * - Generic: any non-empty string
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ValidationOptions {
  optional?: boolean;
}

/**
 * Validate API key based on provider
 *
 * @param key - API key to validate
 * @param provider - Provider name (openai, anthropic, custom, etc.)
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 */
export function validateApiKey(
  key: string,
  provider: string,
  options: ValidationOptions = {}
): ValidationResult {
  // Check if empty
  if (!key || key.trim() === '') {
    if (options.optional) {
      return { valid: true };
    }
    return {
      valid: false,
      error: 'API key is required'
    };
  }

  // Normalize provider name
  const normalizedProvider = provider.toLowerCase();

  // Provider-specific validation
  switch (normalizedProvider) {
    case 'openai':
      return validateOpenAIKey(key);

    case 'anthropic':
      return validateAnthropicKey(key);

    default:
      // Generic validation: just check non-empty
      return {
        valid: true
      };
  }
}

/**
 * Validate OpenAI API key
 *
 * Format: sk-proj-... or sk-... (legacy)
 * Minimum length: 20 characters
 */
function validateOpenAIKey(key: string): ValidationResult {
  // Check prefix
  if (!key.startsWith('sk-')) {
    return {
      valid: false,
      error: 'OpenAI API key must start with sk-'
    };
  }

  // Check minimum length
  if (key.length < 20) {
    return {
      valid: false,
      error: 'OpenAI API key is too short (minimum length: 20 characters)'
    };
  }

  return {
    valid: true
  };
}

/**
 * Validate Anthropic API key
 *
 * Format: sk-ant-...
 * Minimum length: 20 characters
 */
function validateAnthropicKey(key: string): ValidationResult {
  // Check prefix
  if (!key.startsWith('sk-ant-')) {
    return {
      valid: false,
      error: 'Anthropic API key must start with sk-ant-'
    };
  }

  // Check minimum length
  if (key.length < 20) {
    return {
      valid: false,
      error: 'Anthropic API key is too short (minimum length: 20 characters)'
    };
  }

  return {
    valid: true
  };
}
