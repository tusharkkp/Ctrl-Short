/**
 * Purpose:
 * Parses User-Agent headers, infers device/browser/OS categories,
 * and generates privacy-preserving visitor hashes without persisting raw IP addresses.
 */

import crypto from 'crypto';
import { AnalyticsItem, ClickEvent } from '../types';

const RETENTION_DAYS = 90;

/**
 * Generates a privacy-preserving non-reversible visitor hash.
 * Combines an IP address (or fallback identifier), daily rotating salt, and user agent.
 * Raw IP addresses are NEVER persisted.
 *
 * Limitation Notice:
 * Unique visitor estimation is approximate: users behind corporate NATs or dynamic IPs
 * may share hashes or register multiple hashes across days.
 */
export function generateVisitorHash(ip: string = '', userAgent: string = ''): string {
  // Rotate salt daily to prevent permanent cross-day correlation
  const dateStr = new Date().toISOString().slice(0, 10);
  const secretSalt = process.env.ANALYTICS_SALT || 'ctrl-short-privacy-salt-default';
  return crypto
    .createHash('sha256')
    .update(`${ip}:${dateStr}:${userAgent}:${secretSalt}`)
    .digest('hex')
    .slice(0, 16); // 16 characters is sufficient for uniqueness estimation
}

/**
 * Parses user agent string into device type, browser name, and operating system.
 */
export function parseUserAgent(uaString: string = ''): {
  device: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  browser: string;
  os: string;
} {
  const ua = uaString.toLowerCase();

  // 1. Bot check
  if (
    ua.includes('bot') ||
    ua.includes('crawler') ||
    ua.includes('spider') ||
    ua.includes('crawling') ||
    ua.includes('headless')
  ) {
    return { device: 'bot', browser: 'Bot / Crawler', os: 'Unknown' };
  }

  // 2. Device determination
  let device: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown' = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    device = 'tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|phone/i.test(ua)) {
    device = 'mobile';
  }

  // 3. Operating System
  let os = 'Unknown';
  if (/windows nt 10\.0|windows nt 11\.0/i.test(ua)) os = 'Windows 11/10';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'ChromeOS';

  // 4. Browser
  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer';

  return { device, browser, os };
}

/**
 * Normalizes referrer domain for clean analytics categorization.
 */
export function normalizeReferrer(rawReferrer: string = ''): string {
  if (!rawReferrer || !rawReferrer.trim()) return 'Direct / None';

  try {
    const url = new URL(rawReferrer);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host.includes('twitter.com') || host.includes('t.co') || host.includes('x.com')) return 'Twitter / X';
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('linkedin.com') || host.includes('lnkd.in')) return 'LinkedIn';
    if (host.includes('reddit.com')) return 'Reddit';
    if (host.includes('google.com')) return 'Google';
    if (host.includes('facebook.com')) return 'Facebook';
    if (host.includes('youtube.com')) return 'YouTube';
    if (host.includes('news.ycombinator.com')) return 'Hacker News';

    return host;
  } catch {
    return 'Other';
  }
}

/**
 * Converts a raw click event into a structured, privacy-preserving AnalyticsItem.
 */
export function buildAnalyticsItem(event: ClickEvent): AnalyticsItem {
  const { device, browser, os } = parseUserAgent(event.userAgent);
  const visitorHash = generateVisitorHash(event.ip, event.userAgent);
  const referrer = normalizeReferrer(event.referrer);
  const country = (event.country || 'Unknown').toUpperCase().slice(0, 2);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttl = nowSeconds + RETENTION_DAYS * 24 * 60 * 60;

  return {
    shortCode: event.shortCode,
    timestampEvent: `${event.timestamp}#${event.eventId}`,
    timestamp: event.timestamp,
    visitorHash,
    device,
    browser,
    os,
    referrer,
    country,
    ttl,
  };
}
