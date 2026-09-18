/**
 * Purpose:
 * Authentication API module managing user registration, credentials sign-in,
 * session storage, and sign-out flows.
 */

import { apiFetch, clearAuth, setStoredToken, setStoredUser, getStoredUser, getStoredToken } from './client';
import type { AuthSession, User } from '../../types/api';

export { getStoredUser, getStoredToken };

export interface SignUpResponse {
  message: string;
  token?: string;
  user?: User;
}

/**
 * Registers a new user account with email and password.
 */
export async function signUp(email: string, password: string): Promise<SignUpResponse> {
  const result = await apiFetch<SignUpResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.token && result.user) {
    setStoredToken(result.token);
    setStoredUser(result.user);
  }

  return result;
}

/**
 * Signs in an existing user and stores the authentication session.
 */
export async function signIn(email: string, password: string): Promise<AuthSession> {
  const session = await apiFetch<AuthSession>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setStoredToken(session.token);
  setStoredUser(session.user);
  return session;
}

/**
 * Signs out the current user and purges stored authentication tokens.
 */
export function signOut(): void {
  clearAuth();
}
