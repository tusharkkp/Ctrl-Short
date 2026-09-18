/**
 * Purpose:
 * Core API client handling HTTP transport, base URL resolution,
 * token persistence in localStorage, authorization header injection,
 * and standardized error parsing.
 */

import type { ApiError, User } from '../../types/api';

const TOKEN_KEY = 'ctrl_short_token';
const USER_KEY = 'ctrl_short_user';

export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000'
).replace(/\/+$/, '');

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function clearAuth(): void {
  setStoredToken(null);
  setStoredUser(null);
}

export class ApiRequestError extends Error {
  public code: string;
  public details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code || 'UNKNOWN_ERROR';
    this.details = error.details;
  }
}

/**
 * Standardized typed HTTP fetch wrapper.
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${cleanEndpoint}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new ApiRequestError({
      code: 'NETWORK_ERROR',
      message: 'Failed to connect to Ctrl Short server. Please check your connection.',
      details: networkError,
    });
  }

  // Handle No Content
  if (response.status === 204) {
    return {} as T;
  }

  let responseData: any = {};
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = {};
    }
  }

  if (!response.ok) {
    const errorPayload: ApiError = responseData.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'An unexpected API error occurred.',
    };
    throw new ApiRequestError(errorPayload);
  }

  return responseData as T;
}
