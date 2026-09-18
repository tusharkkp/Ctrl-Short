/**
 * Purpose:
 * Validates incoming URLs, protocols, lengths, dangerous destinations,
 * loopback/metadata IPs, and link expiration timestamps.
 */

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS EC2 / ECS metadata endpoint
  'metadata.google.internal',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Validates that an original URL is safe, conforms to allowed schemes,
 * does not target local/internal loopback services, and is within size limits.
 */
export function validateUrl(rawUrl: unknown): ValidationResult {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, error: 'URL is required and cannot be empty.' };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL exceeds maximum allowable length of ${MAX_URL_LENGTH} characters.`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Please provide a well-formed web address including protocol.',
    };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      valid: false,
      error: `Protocol '${parsed.protocol}' is not allowed. Only HTTP and HTTPS URLs are permitted.`,
    };
  }

  // Block loopback, internal IPs and cloud metadata addresses
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.localhost') || hostname.startsWith('127.')) {
    return {
      valid: false,
      error: 'URLs targeting loopback or internal infrastructure addresses are strictly forbidden.',
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
  };
}

/**
 * Validates link expiration timestamp (in seconds).
 * Must be in the future.
 */
export function validateExpiration(expiresAt?: number | null): { valid: boolean; error?: string } {
  if (expiresAt === undefined || expiresAt === null) {
    return { valid: true };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (expiresAt <= nowSeconds) {
    return { valid: false, error: 'Expiration date must be in the future.' };
  }

  // Maximum 1 year in the future
  const oneYearSeconds = nowSeconds + 365 * 24 * 60 * 60;
  if (expiresAt > oneYearSeconds) {
    return { valid: false, error: 'Expiration date cannot exceed 1 year from now.' };
  }

  return { valid: true };
}
