/**
 * Purpose:
 * Standalone local development HTTP server that mounts API Gateway Lambda controllers,
 * wires the asynchronous SQS queue listener in-memory, and provides local mock
 * authentication endpoints for zero-cloud local testing.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { handler as apiHandler } from './handlers/api';
import { handler as redirectHandler } from './handlers/redirect';
import { registerLocalQueueListener } from './lib/sqs';
import { buildAnalyticsItem } from './lib/analytics-helper';
import { incrementUrlClicks, saveAnalyticsItem } from './lib/dynamodb';
import { ClickEvent } from './types';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Register local asynchronous queue listener to simulate SQS + Analytics Worker
registerLocalQueueListener(async (event: ClickEvent) => {
  const item = buildAnalyticsItem(event);
  await saveAnalyticsItem(item);
  await incrementUrlClicks(event.shortCode);
});

// Helper to convert Express Request into APIGateway-like Event
function toApiGatewayEvent(req: Request) {
  return {
    rawPath: req.path,
    path: req.path,
    httpMethod: req.method,
    headers: req.headers as Record<string, string | undefined>,
    body: req.body ? JSON.stringify(req.body) : undefined,
    requestContext: {
      http: {
        method: req.method,
        path: req.path,
        sourceIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
      },
    },
  };
}

// Local Mock Authentication Endpoints for easy zero-config testing
const mockUsers = new Map<string, { email: string; passwordHash: string; confirmed: boolean }>();

app.post('/auth/signup', (req: Request, res: Response): void => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 8) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Email and password (min 8 chars) required.' },
    });
    return;
  }

  const normalized = email.toLowerCase().trim();
  if (mockUsers.has(normalized)) {
    res.status(409).json({
      error: { code: 'USER_EXISTS', message: 'An account with this email already exists.' },
    });
    return;
  }

  mockUsers.set(normalized, { email: normalized, passwordHash: password, confirmed: true });
  const token = `dev-token-${normalized}`;
  res.status(201).json({
    token,
    user: {
      userId: `usr_${normalized.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: normalized,
    },
    message: 'User registered successfully (auto-confirmed in local dev mode).',
  });
});

app.post('/auth/signin', (req: Request, res: Response): void => {
  const { email, password } = req.body || {};
  const normalized = (email || '').toLowerCase().trim();
  const existing = mockUsers.get(normalized);

  if (!existing || existing.passwordHash !== password) {
    // In local mode, if developer hasn't signed up yet, auto-provision
    mockUsers.set(normalized, { email: normalized, passwordHash: password || 'password123', confirmed: true });
  }

  const token = `dev-token-${normalized}`;
  res.json({
    token,
    user: {
      userId: `usr_${normalized.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: normalized,
    },
  });
});

// Public Redirect Route: /r/:shortCode
app.get('/r/:shortCode', async (req: Request, res: Response): Promise<void> => {
  const event = {
    ...toApiGatewayEvent(req),
    pathParameters: { shortCode: req.params.shortCode },
  };

  const response = await redirectHandler(event);

  if (response.statusCode === 302 && response.headers?.Location) {
    res.redirect(302, response.headers.Location);
    return;
  }

  res.status(response.statusCode).set(response.headers || {}).send(response.body);
});

// REST API Endpoints: /urls, /urls/:id, /urls/:id/analytics
app.all(/^\/urls(\/.*)?$/, async (req: Request, res: Response): Promise<void> => {
  const event = toApiGatewayEvent(req);
  const response = await apiHandler(event);

  res.status(response.statusCode).set(response.headers || {}).send(response.body);
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Ctrl Short Backend (Local)', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'test') {
  const portNumber = Number(PORT) || 4000;
  app.listen(portNumber, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`⚡ Ctrl Short Backend running on http://localhost:${PORT}`);
    console.log(`   - URLs API:     http://localhost:${PORT}/urls`);
    console.log(`   - Redirects:    http://localhost:${PORT}/r/:shortCode`);
    console.log(`   - Mock Auth:    http://localhost:${PORT}/auth/signin`);
    console.log(`======================================================\n`);
  });
}

export default app;
