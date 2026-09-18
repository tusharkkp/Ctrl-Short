/**
 * Purpose:
 * Provides Cognito JWT verification and claims extraction for API Gateway
 * and Lambda handlers, with local development bypass support.
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';

export interface AuthenticatedUser {
  userId: string; // Cognito 'sub'
  email: string;
  username?: string;
}

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '';

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

if (USER_POOL_ID && CLIENT_ID) {
  try {
    verifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: 'id', // or 'access'
      clientId: CLIENT_ID,
    });
  } catch (err) {
    console.warn('[Auth] Could not initialize CognitoJwtVerifier:', err);
  }
}

/**
 * Extracts and verifies the authenticated user from an authorization header
 * or API Gateway requestContext.
 */
export async function authenticateRequest(
  authHeader?: string,
  requestContextClaims?: Record<string, unknown>
): Promise<AuthenticatedUser | null> {
  // 1. If API Gateway Cognito authorizer claims are present
  if (requestContextClaims && requestContextClaims.sub) {
    return {
      userId: String(requestContextClaims.sub),
      email: String(requestContextClaims.email || ''),
      username: String(requestContextClaims['cognito:username'] || requestContextClaims.sub),
    };
  }

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // 2. Local development mock token support
  if (token.startsWith('mock-user-') || token.startsWith('dev-token-')) {
    const email = token.replace(/^(mock-user-|dev-token-)/, '');
    return {
      userId: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: email.includes('@') ? email : `${email}@ctrlshort.dev`,
      username: email,
    };
  }

  // 3. Verify real Cognito JWT token if configured
  if (verifier) {
    try {
      const payload = await verifier.verify(token);
      return {
        userId: payload.sub,
        email: String(payload.email || ''),
        username: String(payload['cognito:username'] || payload.sub),
      };
    } catch (err) {
      console.error('[Auth] Token verification failed:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  // Fallback for local testing without Cognito setup
  return {
    userId: 'usr_local_default',
    email: 'developer@ctrlshort.dev',
    username: 'developer',
  };
}
