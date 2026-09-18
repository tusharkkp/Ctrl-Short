/**
 * Purpose:
 * Frontend TypeScript definitions for URL models, analytics charts,
 * authentication payloads, and standardized API error formats.
 */

export interface User {
  userId: string;
  email: string;
  username?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface UrlModel {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  expiresAt?: number | null;
  customAlias?: string;
  totalClicks: number;
  uniqueVisitors?: number;
}

export interface CreateUrlInput {
  originalUrl: string;
  customAlias?: string;
  expiresInSeconds?: number;
  expiresAt?: number;
}

export interface UpdateUrlInput {
  isActive?: boolean;
  expiresAt?: number | null;
}

export interface BreakdownStat {
  name: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesStat {
  date: string;
  clicks: number;
}

export interface AnalyticsData {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksOverTime: TimeSeriesStat[];
  devices: BreakdownStat[];
  browsers: BreakdownStat[];
  operatingSystems: BreakdownStat[];
  referrers: BreakdownStat[];
  countries: BreakdownStat[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
