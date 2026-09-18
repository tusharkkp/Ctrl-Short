/**
 * Purpose:
 * Unit tests for Base62 short code generation, collision resistance,
 * custom alias formatting constraints, and reserved system path protection.
 */

import { describe, it, expect } from 'vitest';
import { generateShortCode, validateCustomAlias, RESERVED_WORDS } from '../backend/lib/short-code';

describe('Short Code Generator', () => {
  it('should generate codes of specified length', () => {
    const code6 = generateShortCode(6);
    expect(code6).toHaveLength(6);
    expect(/^[0-9a-zA-Z]{6}$/.test(code6)).toBe(true);

    const code8 = generateShortCode(8);
    expect(code8).toHaveLength(8);
  });

  it('should produce unique codes across successive calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateShortCode(6));
    }
    expect(set.size).toBe(100);
  });
});

describe('Custom Alias Validation', () => {
  it('should accept valid alphanumeric, dash, and underscore aliases', () => {
    expect(validateCustomAlias('my-cool-link').valid).toBe(true);
    expect(validateCustomAlias('project_2026').valid).toBe(true);
    expect(validateCustomAlias('launch').valid).toBe(true);
  });

  it('should reject aliases shorter than 3 or longer than 32 characters', () => {
    expect(validateCustomAlias('ab').valid).toBe(false);
    expect(validateCustomAlias('a'.repeat(33)).valid).toBe(false);
  });

  it('should reject aliases with invalid symbols or spaces', () => {
    expect(validateCustomAlias('hello world').valid).toBe(false);
    expect(validateCustomAlias('link@name').valid).toBe(false);
    expect(validateCustomAlias('bad.alias').valid).toBe(false);
  });

  it('should protect reserved system paths', () => {
    for (const reserved of Array.from(RESERVED_WORDS)) {
      const res = validateCustomAlias(reserved);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('reserved');
    }
  });
});
