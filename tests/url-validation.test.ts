/**
 * Purpose:
 * Unit tests for URL security verification, protocol restrictions,
 * loopback address prevention, and expiration time boundary checks.
 */

import { describe, it, expect } from 'vitest';
import { validateUrl, validateExpiration } from '../backend/lib/validator';

describe('URL Validation', () => {
  it('should accept valid https and http URLs', () => {
    const res1 = validateUrl('https://google.com');
    expect(res1.valid).toBe(true);
    expect(res1.normalizedUrl).toBe('https://google.com/');

    const res2 = validateUrl('http://example.com/some/path?param=1&other=2#hash');
    expect(res2.valid).toBe(true);
  });

  it('should reject non-HTTP/HTTPS protocols', () => {
    expect(validateUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateUrl('data:text/html,<script>alert(1)</script>').valid).toBe(false);
    expect(validateUrl('ftp://ftp.example.com').valid).toBe(false);
  });

  it('should reject loopback and AWS metadata hosts', () => {
    expect(validateUrl('http://localhost:3000').valid).toBe(false);
    expect(validateUrl('http://127.0.0.1:8080').valid).toBe(false);
    expect(validateUrl('http://169.254.169.254/latest/meta-data/').valid).toBe(false);
    expect(validateUrl('http://sub.localhost').valid).toBe(false);
  });

  it('should reject malformed or empty URLs', () => {
    expect(validateUrl('').valid).toBe(false);
    expect(validateUrl('not-a-url').valid).toBe(false);
    expect(validateUrl(null).valid).toBe(false);
  });

  it('should reject URLs exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2040);
    expect(validateUrl(longUrl).valid).toBe(false);
  });
});

describe('Expiration Validation', () => {
  it('should accept valid future expiration timestamps', () => {
    const future = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
    expect(validateExpiration(future).valid).toBe(true);
    expect(validateExpiration(null).valid).toBe(true);
    expect(validateExpiration(undefined).valid).toBe(true);
  });

  it('should reject past expiration timestamps', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(validateExpiration(past).valid).toBe(false);
  });

  it('should reject expiration timestamps beyond 1 year', () => {
    const tooFar = Math.floor(Date.now() / 1000) + 400 * 24 * 3600;
    expect(validateExpiration(tooFar).valid).toBe(false);
  });
});
