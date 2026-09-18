/**
 * Purpose:
 * Defines core backend TypeScript types, data models, access interfaces,
 * click events, analytics aggregations, and standardized error responses.
 */

export interface UrlItem {
  id: string;
  shortCode: string;
  originalUrl: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  expiresAt?: number | null; // Unix timestamp in seconds for TTL & app check
  customAlias?: string;
  totalClicks: number;
  uniqueVisitors?: number;
}

export interface CreateUrlRequest {
  originalUrl: string;
  customAlias?: string;
  expiresInSeconds?: number;
  expiresAt?: number; // Optional explicit unix timestamp in seconds
}

export interface UpdateUrlRequest {
  isActive?: boolean;
  customAlias?: string;
  expiresAt?: number | null;
}

export interface ClickEvent {
  eventId: string;
  shortCode: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  country?: string;
}

export interface AnalyticsItem {
  shortCode: string; // DynamoDB PK
  timestampEvent: string; // DynamoDB SK: ${timestamp}#${eventId}
  timestamp: string;
  visitorHash: string;
  device: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  browser: string;
  os: string;
  referrer: string;
  country: string;
  ttl: number; // Unix timestamp in seconds for automatic DynamoDB cleanup
}

export interface BreakdownItem {
  name: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  date: string;
  clicks: number;
}

export interface AnalyticsSummary {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksOverTime: TimeSeriesPoint[];
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  operatingSystems: BreakdownItem[];
  referrers: BreakdownItem[];
  countries: BreakdownItem[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ErrorCode =
  | 'INVALID_URL'
  | 'INVALID_ALIAS'
  | 'ALIAS_ALREADY_EXISTS'
  | 'URL_NOT_FOUND'
  | 'URL_EXPIRED'
  | 'URL_DISABLED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR'
  | 'BAD_REQUEST';
