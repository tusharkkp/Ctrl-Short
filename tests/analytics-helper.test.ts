/**
 * Purpose:
 * Unit tests for user-agent device/browser/OS parsing, referrer classification,
 * and non-reversible visitor hash generation.
 */

import { describe, it, expect } from 'vitest';
import {
  generateVisitorHash,
  parseUserAgent,
  normalizeReferrer,
  buildAnalyticsItem,
} from '../backend/lib/analytics-helper';

describe('Analytics Helper', () => {
  it('should generate consistent visitor hashes for identical inputs on the same day', () => {
    const hash1 = generateVisitorHash('192.168.1.1', 'Mozilla/5.0');
    const hash2 = generateVisitorHash('192.168.1.1', 'Mozilla/5.0');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16);
  });

  it('should generate different visitor hashes for different IP addresses', () => {
    const hash1 = generateVisitorHash('10.0.0.1', 'Mozilla/5.0');
    const hash2 = generateVisitorHash('10.0.0.2', 'Mozilla/5.0');
    expect(hash1).not.toBe(hash2);
  });

  it('should accurately categorize desktop and mobile User-Agents', () => {
    const macChrome =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const parsedMac = parseUserAgent(macChrome);
    expect(parsedMac.device).toBe('desktop');
    expect(parsedMac.os).toBe('macOS');
    expect(parsedMac.browser).toBe('Google Chrome');

    const iPhoneSafari =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const parsedPhone = parseUserAgent(iPhoneSafari);
    expect(parsedPhone.device).toBe('mobile');
    expect(parsedPhone.os).toBe('iOS');
    expect(parsedPhone.browser).toBe('Apple Safari');

    const bot = 'Googlebot/2.1 (+http://www.google.com/bot.html)';
    const parsedBot = parseUserAgent(bot);
    expect(parsedBot.device).toBe('bot');
  });

  it('should normalize known referrer domains', () => {
    expect(normalizeReferrer('https://t.co/abc123xyz')).toBe('Twitter / X');
    expect(normalizeReferrer('https://github.com/features')).toBe('GitHub');
    expect(normalizeReferrer('https://www.linkedin.com/feed')).toBe('LinkedIn');
    expect(normalizeReferrer('')).toBe('Direct / None');
  });

  it('should construct a complete AnalyticsItem without exposing raw IP', () => {
    const item = buildAnalyticsItem({
      eventId: 'evt-123',
      shortCode: 'abc123',
      timestamp: '2026-09-18T12:00:00.000Z',
      ip: '203.0.113.195',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
      referrer: 'https://news.ycombinator.com',
      country: 'US',
    });

    expect(item.shortCode).toBe('abc123');
    expect(item.device).toBe('desktop');
    expect(item.os).toBe('Windows 11/10');
    expect(item.referrer).toBe('Hacker News');
    expect(item.country).toBe('US');
    expect(item.visitorHash).toBeDefined();
    // Verify raw IP is NOT stored in the item
    expect(JSON.stringify(item)).not.toContain('203.0.113.195');
  });
});
