/**
 * Purpose:
 * API Gateway Lambda controller handling authenticated REST operations for URL creation,
 * collision retry loops, link listings, status updates, deletions, and analytics reports.
 */

import crypto from 'crypto';
import {
  createUrlRecord,
  deleteUrlRecord,
  getAnalyticsSummary,
  getUrlByShortCode,
  listUrlsByUser,
  updateUrlRecord,
} from '../lib/dynamodb';
import { generateShortCode, validateCustomAlias } from '../lib/short-code';
import { validateExpiration, validateUrl } from '../lib/validator';
import { authenticateRequest } from '../lib/auth';
import { CreateUrlRequest, UpdateUrlRequest, UrlItem } from '../types';

interface APIGatewayEvent {
  rawPath?: string;
  routeKey?: string;
  httpMethod?: string;
  path?: string;
  headers?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  body?: string;
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
    };
    authorizer?: {
      jwt?: {
        claims?: Record<string, unknown>;
      };
    };
  };
}

function getDomainBase(event: APIGatewayEvent): string {
  // If explicitly configured for production domain
  if (process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')) {
    return process.env.BASE_URL;
  }

  // Dynamically resolve from incoming request host headers
  const host =
    event.headers?.['x-forwarded-host'] ||
    event.headers?.host ||
    event.headers?.Host;

  if (host) {
    const proto =
      event.headers?.['x-forwarded-proto'] ||
      (host.includes('localhost') || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  return process.env.BASE_URL || 'http://localhost:5173';
}

function jsonResponse(statusCode: number, data: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(data),
  };
}

export async function handler(event: APIGatewayEvent) {
  const method = (
    event.requestContext?.http?.method ||
    event.httpMethod ||
    'GET'
  ).toUpperCase();
  const path = event.rawPath || event.path || '';
  const domainBase = getDomainBase(event);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  // 1. Authenticate Request
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const authorizerClaims = event.requestContext?.authorizer?.jwt?.claims;
  const user = await authenticateRequest(authHeader, authorizerClaims);

  if (!user) {
    return jsonResponse(401, {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing, invalid, or expired.',
      },
    });
  }

  try {
    // 2. Route Dispatcher
    // POST /urls
    if (method === 'POST' && (path === '/urls' || path.endsWith('/urls'))) {
      let body: CreateUrlRequest;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return jsonResponse(400, {
          error: { code: 'BAD_REQUEST', message: 'Malformed JSON payload.' },
        });
      }

      // Validate Original URL
      const urlValidation = validateUrl(body.originalUrl);
      if (!urlValidation.valid || !urlValidation.normalizedUrl) {
        return jsonResponse(400, {
          error: { code: 'INVALID_URL', message: urlValidation.error || 'Invalid URL.' },
        });
      }

      // Calculate Expiration
      let expiresAt: number | null = null;
      if (body.expiresAt) {
        expiresAt = body.expiresAt;
      } else if (body.expiresInSeconds && body.expiresInSeconds > 0) {
        expiresAt = Math.floor(Date.now() / 1000) + body.expiresInSeconds;
      }

      const expValidation = validateExpiration(expiresAt);
      if (!expValidation.valid) {
        return jsonResponse(400, {
          error: { code: 'BAD_REQUEST', message: expValidation.error || 'Invalid expiration.' },
        });
      }

      const now = new Date().toISOString();

      // Custom Alias Path
      if (body.customAlias && body.customAlias.trim()) {
        const aliasValidation = validateCustomAlias(body.customAlias.trim());
        if (!aliasValidation.valid) {
          return jsonResponse(400, {
            error: {
              code: 'INVALID_ALIAS',
              message: aliasValidation.error || 'Invalid custom alias.',
            },
          });
        }

        const shortCode = body.customAlias.trim();
        const newUrl: UrlItem = {
          id: crypto.randomUUID(),
          shortCode,
          originalUrl: urlValidation.normalizedUrl,
          userId: user.userId,
          createdAt: now,
          updatedAt: now,
          isActive: true,
          expiresAt,
          customAlias: shortCode,
          totalClicks: 0,
        };

        try {
          await createUrlRecord(newUrl);
          return jsonResponse(201, {
            ...newUrl,
            shortUrl: `${domainBase}/r/${newUrl.shortCode}`,
          });
        } catch (err: unknown) {
          if ((err as { code?: string }).code === 'COLLISION') {
            return jsonResponse(409, {
              error: {
                code: 'ALIAS_ALREADY_EXISTS',
                message: `Custom alias '${shortCode}' is already taken. Please choose another.`,
              },
            });
          }
          throw err;
        }
      }

      // Generated Short Code with Collision-Resistant Retry Loop
      let attempts = 0;
      const maxAttempts = 3;
      let createdItem: UrlItem | null = null;

      while (attempts < maxAttempts) {
        attempts += 1;
        const codeLength = attempts > 2 ? 7 : 6;
        const shortCode = generateShortCode(codeLength);

        const newUrl: UrlItem = {
          id: crypto.randomUUID(),
          shortCode,
          originalUrl: urlValidation.normalizedUrl,
          userId: user.userId,
          createdAt: now,
          updatedAt: now,
          isActive: true,
          expiresAt,
          totalClicks: 0,
        };

        try {
          await createUrlRecord(newUrl);
          createdItem = newUrl;
          break;
        } catch (err: unknown) {
          if ((err as { code?: string }).code === 'COLLISION') {
            // Collision occurred, retry next iteration
            continue;
          }
          throw err;
        }
      }

      if (!createdItem) {
        return jsonResponse(500, {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to generate a unique short code after multiple attempts. Please retry.',
          },
        });
      }

      return jsonResponse(201, {
        ...createdItem,
        shortUrl: `${domainBase}/r/${createdItem.shortCode}`,
      });
    }

    // GET /urls (List user URLs)
    if (method === 'GET' && (path === '/urls' || path.endsWith('/urls'))) {
      const urls = await listUrlsByUser(user.userId);
      const enriched = urls.map((u) => ({
        ...u,
        shortUrl: `${domainBase}/r/${u.shortCode}`,
      }));
      return jsonResponse(200, { urls: enriched });
    }

    // URL ID based paths: /urls/{id} and /urls/{id}/analytics
    const urlIdMatch = path.match(/\/urls\/([^/]+)(\/analytics)?$/);
    if (urlIdMatch) {
      const targetId = urlIdMatch[1];
      const isAnalyticsPath = Boolean(urlIdMatch[2]);

      // GET /urls/{id}/analytics
      if (isAnalyticsPath && method === 'GET') {
        const urlItem = await getUrlByShortCode(targetId);
        if (!urlItem) {
          return jsonResponse(404, {
            error: { code: 'URL_NOT_FOUND', message: 'Short URL not found.' },
          });
        }
        if (urlItem.userId !== user.userId) {
          return jsonResponse(403, {
            error: { code: 'FORBIDDEN', message: 'You do not have permission to view analytics for this URL.' },
          });
        }

        const analytics = await getAnalyticsSummary(targetId);
        return jsonResponse(200, analytics || {
          shortCode: targetId,
          originalUrl: urlItem.originalUrl,
          totalClicks: 0,
          uniqueVisitors: 0,
          clicksOverTime: [],
          devices: [],
          browsers: [],
          operatingSystems: [],
          referrers: [],
          countries: [],
        });
      }

      // GET /urls/{id}
      if (method === 'GET') {
        const urlItem = await getUrlByShortCode(targetId);
        if (!urlItem) {
          return jsonResponse(404, {
            error: { code: 'URL_NOT_FOUND', message: 'Short URL not found.' },
          });
        }
        if (urlItem.userId !== user.userId) {
          return jsonResponse(403, {
            error: { code: 'FORBIDDEN', message: 'You do not have access to this link.' },
          });
        }
        return jsonResponse(200, {
          ...urlItem,
          shortUrl: `${domainBase}/r/${urlItem.shortCode}`,
        });
      }

      // PATCH /urls/{id}
      if (method === 'PATCH') {
        let updates: UpdateUrlRequest;
        try {
          updates = JSON.parse(event.body || '{}');
        } catch {
          return jsonResponse(400, {
            error: { code: 'BAD_REQUEST', message: 'Malformed JSON payload.' },
          });
        }

        if (updates.expiresAt !== undefined) {
          const expValidation = validateExpiration(updates.expiresAt);
          if (!expValidation.valid) {
            return jsonResponse(400, {
              error: { code: 'BAD_REQUEST', message: expValidation.error },
            });
          }
        }

        try {
          const updated = await updateUrlRecord(targetId, user.userId, {
            isActive: updates.isActive,
            expiresAt: updates.expiresAt,
          });
          return jsonResponse(200, {
            ...updated,
            shortUrl: `${domainBase}/r/${updated.shortCode}`,
          });
        } catch (err: unknown) {
          if ((err as { code?: string }).code === 'NOT_FOUND_OR_FORBIDDEN') {
            return jsonResponse(404, {
              error: { code: 'URL_NOT_FOUND', message: 'URL not found or not owned by user.' },
            });
          }
          throw err;
        }
      }

      // DELETE /urls/{id}
      if (method === 'DELETE') {
        const deleted = await deleteUrlRecord(targetId, user.userId);
        if (!deleted) {
          return jsonResponse(404, {
            error: { code: 'URL_NOT_FOUND', message: 'URL not found or unauthorized.' },
          });
        }
        return jsonResponse(200, {
          success: true,
          message: `Short URL '${targetId}' successfully deleted.`,
        });
      }
    }

    return jsonResponse(404, {
      error: { code: 'BAD_REQUEST', message: `Route '${method} ${path}' not recognized.` },
    });
  } catch (error) {
    console.error('[ApiHandler] Unexpected error:', error);
    return jsonResponse(500, {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred.',
      },
    });
  }
}
