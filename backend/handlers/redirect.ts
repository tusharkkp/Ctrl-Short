/**
 * Purpose:
 * High-speed URL redirect Lambda handler that performs sub-millisecond DynamoDB lookups,
 * evaluates active/expiration states, asynchronously enqueues analytics to SQS,
 * and issues HTTP 302/404/410 responses.
 */

import crypto from 'crypto';
import { getUrlByShortCode } from '../lib/dynamodb';
import { queueClickEvent } from '../lib/sqs';
import { ClickEvent } from '../types';

interface APIGatewayEvent {
  rawPath?: string;
  pathParameters?: { shortCode?: string; proxy?: string };
  headers?: Record<string, string | undefined>;
  requestContext?: {
    http?: {
      sourceIp?: string;
      userAgent?: string;
    };
  };
}

export async function handler(event: APIGatewayEvent) {
  const shortCode =
    event.pathParameters?.shortCode ||
    event.pathParameters?.proxy?.replace(/^\/?r\//, '').replace(/^\//, '') ||
    '';

  if (!shortCode) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'URL_NOT_FOUND', message: 'Short code was not specified.' },
      }),
    };
  }

  const urlItem = await getUrlByShortCode(shortCode);

  if (!urlItem) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'URL_NOT_FOUND', message: 'The requested short URL does not exist.' },
      }),
    };
  }

  // Check active status
  if (!urlItem.isActive) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'URL_DISABLED', message: 'This link has been disabled by its owner.' },
      }),
    };
  }

  // Check expiration
  if (urlItem.expiresAt) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds > urlItem.expiresAt) {
      return {
        statusCode: 410,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: { code: 'URL_EXPIRED', message: 'This short link has expired.' },
        }),
      };
    }
  }

  // Queue click analytics asynchronously without delaying redirect
  const headers = event.headers || {};
  const ip =
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.requestContext?.http?.sourceIp ||
    '';
  const userAgent = headers['user-agent'] || event.requestContext?.http?.userAgent || '';
  const referrer = headers['referer'] || headers['referrer'] || '';
  const country = headers['cloudfront-viewer-country'] || '';

  const clickEvent: ClickEvent = {
    eventId: crypto.randomUUID(),
    shortCode: urlItem.shortCode,
    timestamp: new Date().toISOString(),
    ip,
    userAgent,
    referrer,
    country,
  };

  // Enqueue event (non-blocking)
  await queueClickEvent(clickEvent);

  // Return HTTP 302 Found redirect
  return {
    statusCode: 302,
    headers: {
      Location: urlItem.originalUrl,
      'Cache-Control': 'private, max-age=90',
    },
    body: '',
  };
}
