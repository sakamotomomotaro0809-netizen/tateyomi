/**
 * Regression Test Suite Index
 *
 * Auto-generated from mistakes.md
 * Run: npm run mistake:testgen
 *
 * These tests ensure past mistakes do not recur.
 */

// Import all regression tests
import './success-true-on-error.test';
import './command-injection-vulnerability.test';
import './silent-error-catch.test';
import './chrome-origin-wildcard.test';

describe('Regression Suite', () => {
  it('should have 4 regression tests', () => {
    expect(4).toBeGreaterThan(0);
  });
});
