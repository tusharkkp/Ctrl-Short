/**
 * Purpose:
 * Provides cryptographically secure short code generation, Base62 encoding,
 * collision avoidance, custom alias validation, and reserved word enforcement.
 */

import crypto from 'crypto';

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_CODE_LENGTH = 6;

export const RESERVED_WORDS = new Set([
  'login',
  'signup',
  'dashboard',
  'api',
  'docs',
  'analytics',
  'settings',
  'admin',
  'r',
  'urls',
  'auth',
  'health',
  'favicon.ico',
  'status',
  'app',
  'user',
  'static',
  'assets',
  'public',
  'help',
  'support',
  'terms',
  'privacy',
  'root',
  'server',
]);

const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

/**
 * Generates a cryptographically secure random short code of given length.
 * Uses uniform byte rejection to prevent modulo bias.
 */
export function generateShortCode(length: number = DEFAULT_CODE_LENGTH): string {
  let result = '';
  const charsLen = BASE62_CHARS.length;
  // Maximum byte value that is an exact multiple of 62 to avoid bias
  const maxUnbiasedByte = 256 - (256 % charsLen);

  while (result.length < length) {
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte < maxUnbiasedByte) {
        result += BASE62_CHARS[byte % charsLen];
        if (result.length === length) break;
      }
    }
  }

  return result;
}

/**
 * Validates a custom alias for length, allowed characters, and reserved system routes.
 */
export function validateCustomAlias(alias: string): { valid: boolean; error?: string } {
  const trimmed = alias.trim();

  if (!trimmed) {
    return { valid: false, error: 'Custom alias cannot be empty.' };
  }

  if (trimmed.length < 3 || trimmed.length > 32) {
    return {
      valid: false,
      error: 'Custom alias must be between 3 and 32 characters in length.',
    };
  }

  if (!ALIAS_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Custom alias can only contain alphanumeric characters, underscores, and dashes.',
    };
  }

  if (RESERVED_WORDS.has(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: `'${trimmed}' is a reserved system path and cannot be used as a custom alias.`,
    };
  }

  return { valid: true };
}
