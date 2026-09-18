# Ctrl Short ✳︎

> **High-Performance Serverless URL Shortener & Real-Time Analytics Platform**
> Built around speed, control, and precision developer tooling.

---

## 📑 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Features](#core-features)
- [DynamoDB Schema & Access Patterns](#dynamodb-schema--access-patterns)
- [Local Development Guide](#local-development-guide)
- [Step-by-Step Manual AWS Setup Guide](#step-by-step-manual-aws-setup-guide)
- [Automated Deployment with AWS CDK](#automated-deployment-with-aws-cdk)
- [API Reference](#api-reference)
- [Security & Privacy Architecture](#security--privacy-architecture)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Ctrl Short** is a developer-focused, serverless link management and click analytics platform. It decouples high-speed URL redirection from click analytics processing using an asynchronous message queue architecture.

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, high-contrast monochrome aesthetic.
- **Backend Runtime**: AWS Lambda (Node.js 20.x, TypeScript), Amazon API Gateway.
- **Data & Queue Layer**: Amazon DynamoDB (On-Demand billing, single-digit millisecond latency), Amazon SQS with Dead Letter Queue (DLQ).
- **Identity & Access**: Amazon Cognito User Pools (JWT tokens, self-service registration).
- **Observability**: Amazon CloudWatch (structured logs, alarm metrics).

---

## System Architecture

```text
Visitor
   │
   ▼
Short URL (GET /r/{shortCode})
   │
   ▼
┌─────────────────────────────────┐
│       Amazon API Gateway        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Redirect Lambda Handler     │  ◄── Read URL (Single-digit ms latency)
└───────┬─────────────────┬───────┘
        │                 │
        │ HTTP 302        │ Enqueue ClickEvent (Non-blocking)
        ▼                 ▼
   Target Web     ┌────────────────────────┐
     Address      │ Amazon SQS Event Queue │
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │ Analytics Worker Lambda│
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │   Amazon DynamoDB      │
                  │   CtrlShort-Analytics  │
                  └────────────────────────┘

Developer / User Flow:
──────────────────────
Ctrl Short UI ──► API Gateway ──► ApiHandler Lambda ──► DynamoDB (Urls & Analytics)
   ▲                                      ▲
   │                                      │
Cognito Auth ─────────────────────────────┘ (JWT Verified Server-Side)
```

---

## Core Features

- **Sub-Millisecond Redirection**: Redirect Lambda reads directly from DynamoDB via primary key and returns immediate HTTP `302 Found` with cache headers.
- **Non-Blocking Analytics**: Click events are dispatched to Amazon SQS; database persistence never delays redirects.
- **Collision-Resistant Short Codes**: Cryptographically secure Base62 generator with uniform byte rejection and atomic DynamoDB conditional writes.
- **Custom Aliases & Reserved Words**: Users can claim readable custom slugs (`/my-project`) while protected system paths (`/login`, `/api`, `/docs`, etc.) are enforced.
- **Link Expirations**: Configurable expiration periods (`1 hour`, `24 hours`, `7 days`, or permanent) enforced at application level and cleaned up via DynamoDB TTL.
- **Client-Side QR Code Generation**: Instant SVG and high-resolution PNG downloads without external third-party tracking services.
- **Privacy-First Visitor Analytics**: Raw IP addresses are **never** persisted; unique visitors are approximated using daily-salted SHA-256 hashes.

---

## DynamoDB Schema & Access Patterns

### 1. `CtrlShort-Urls` Table

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `shortCode` **(PK)** | String | Short code or custom alias (e.g. `a8Kx92` or `my-project`) |
| `id` | String | Unique UUID identifier |
| `originalUrl` | String | Validated destination URL |
| `userId` | String | Cognito user ID (`sub`) who owns the link |
| `createdAt` | String | ISO-8601 creation timestamp |
| `updatedAt` | String | ISO-8601 update timestamp |
| `isActive` | Boolean | Link active state (`true`/`false`) |
| `expiresAt` | Number | Unix timestamp in seconds (DynamoDB TTL attribute) |
| `customAlias` | String | Optional custom alias string |
| `totalClicks` | Number | Atomic counter updated via `ADD totalClicks :inc` |

#### Global Secondary Index (GSI): `userId-createdAt-index`
- **Partition Key**: `userId` (String)
- **Sort Key**: `createdAt` (String)
- **Projection**: `ALL`
- **Use Case**: Queries all links owned by a user sorted by creation date descending (`ScanIndexForward: false`).

---

### 2. `CtrlShort-Analytics` Table

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `shortCode` **(PK)** | String | Short code associated with the click |
| `timestampEvent` **(SK)** | String | Composite key: `${ISO-Timestamp}#${UUID}` |
| `timestamp` | String | ISO-8601 event timestamp |
| `visitorHash` | String | 16-character SHA-256 hash (`IP + dailySalt + UA`) |
| `device` | String | Categorized device: `desktop`, `mobile`, `tablet`, `bot` |
| `browser` | String | Browser name: `Google Chrome`, `Apple Safari`, etc. |
| `os` | String | Operating system: `macOS`, `Windows`, `iOS`, `Android` |
| `referrer` | String | Cleaned referrer source (`Twitter / X`, `GitHub`, etc.) |
| `country` | String | 2-letter ISO country code from CloudFront/Edge headers |
| `ttl` | Number | Unix timestamp (retention: 90 days) |

---

## Local Development Guide

You can run the entire platform locally with zero cloud dependencies. The local server provides in-memory DynamoDB simulation, an in-memory SQS worker, and local mock authentication.

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` based on `.env.example`:

```bash
cp .env.example .env
```

Ensure `VITE_API_BASE_URL=http://localhost:4000` is set in `.env`.

### 3. Start Local Backend & Frontend

Open two terminal windows:

**Terminal 1 (Backend Local Server):**
```bash
npm run dev:backend
# Starts Express server on http://localhost:4000
```

**Terminal 2 (Frontend Dev Server):**
```bash
npm run dev
# Starts Vite frontend on http://localhost:5173
```

### 4. Run Unit Tests

```bash
npm test
```

---

## Step-by-Step Manual AWS Setup Guide

Follow this guide to manually configure the AWS infrastructure via the AWS Management Console.

### Step 1: Create Amazon DynamoDB Tables

1. Open the **DynamoDB Console** in your target region (e.g. `us-east-1`).
2. **Create URLs Table**:
   - Table name: `CtrlShort-Urls`
   - Partition key: `shortCode` (String)
   - Table settings: Select **Customize settings**
   - Capacity mode: **On-demand**
   - Click **Create table**.
3. **Add Global Secondary Index (GSI)**:
   - Click on `CtrlShort-Urls` > **Indexes** tab > **Create index**.
   - Partition key: `userId` (String)
   - Sort key: `createdAt` (String)
   - Index name: `userId-createdAt-index`
   - Attribute projections: **All**
   - Click **Create index**.
4. **Enable Time to Live (TTL)**:
   - In `CtrlShort-Urls` > **Additional settings** > **Time to Live (TTL)** > **Turn on**.
   - TTL attribute name: `expiresAt`
   - Click **Turn on TTL**.
5. **Create Analytics Table**:
   - Table name: `CtrlShort-Analytics`
   - Partition key: `shortCode` (String)
   - Sort key: `timestampEvent` (String)
   - Capacity mode: **On-demand**
   - Enable TTL with attribute: `ttl`
   - Click **Create table**.

---

### Step 2: Create Amazon SQS Queues

1. Open the **Amazon SQS Console**.
2. **Create Dead Letter Queue (DLQ)**:
   - Type: **Standard**
   - Name: `CtrlShort-AnalyticsDLQ`
   - Message retention period: `14 days`
   - Click **Create queue**.
3. **Create Click Analytics Queue**:
   - Type: **Standard**
   - Name: `CtrlShort-AnalyticsQueue`
   - Visibility timeout: `30 seconds`
   - In **Dead-letter queue** section:
     - Enable **Dead-letter queue**
     - Select `CtrlShort-AnalyticsDLQ`
     - Maximum receives: `5`
   - Click **Create queue**.
   - **Copy the Queue URL** (e.g. `https://sqs.us-east-1.amazonaws.com/123456789012/CtrlShort-AnalyticsQueue`).

---

### Step 3: Create Amazon Cognito User Pool

1. Open the **Amazon Cognito Console**.
2. Click **Create user pool**.
3. **Step 1: Configure sign-in experience**:
   - Select **Email**.
   - Click **Next**.
4. **Step 2: Configure security requirements**:
   - Password policy: Minimum 8 characters, require uppercase, lowercase, and numbers.
   - MFA: Optional (select **No MFA** for simple developer testing).
   - Click **Next**.
5. **Step 3: Configure sign-up experience**:
   - Verification message: Send email verification code.
   - Click **Next**.
6. **Step 4: Configure message delivery**:
   - Select **Send email with Cognito** (default).
7. **Step 5: Integrate your app**:
   - User pool name: `CtrlShort-UserPool`
   - Initial app client name: `CtrlShort-WebClient`
   - Client type: **Public client** (Generate client secret: **Don't generate a client secret**).
   - Authentication flows: Ensure `ALLOW_USER_SRP_AUTH` and `ALLOW_USER_PASSWORD_AUTH` are checked.
8. Click **Next** and **Create user pool**.
9. **Save IDs**:
   - Copy the **User Pool ID** (`us-east-1_xxxxxxxxx`).
   - Copy the **App Client ID** (`xxxxxxxxxxxxxxxxxxxxxxxxxx`).

---

### Step 4: Create IAM Roles for Lambda

Create three execution roles in the **IAM Console** with least-privilege policies:

1. **`CtrlShort-RedirectLambdaRole`**:
   - AWSLambdaBasicExecutionRole
   - Inline policy granting:
     - `dynamodb:GetItem` on `arn:aws:dynamodb:*:*:table/CtrlShort-Urls`
     - `sqs:SendMessage` on `arn:aws:sqs:*:*:CtrlShort-AnalyticsQueue`

2. **`CtrlShort-ApiLambdaRole`**:
   - AWSLambdaBasicExecutionRole
   - Inline policy granting:
     - `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem` on `arn:aws:dynamodb:*:*:table/CtrlShort-Urls`
     - `dynamodb:Query` on `arn:aws:dynamodb:*:*:table/CtrlShort-Urls/index/userId-createdAt-index`
     - `dynamodb:Query`, `dynamodb:GetItem` on `arn:aws:dynamodb:*:*:table/CtrlShort-Analytics`

3. **`CtrlShort-AnalyticsWorkerRole`**:
   - AWSLambdaBasicExecutionRole
   - Inline policy granting:
     - `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` on `arn:aws:sqs:*:*:CtrlShort-AnalyticsQueue`
     - `dynamodb:PutItem` on `arn:aws:dynamodb:*:*:table/CtrlShort-Analytics`
     - `dynamodb:UpdateItem` on `arn:aws:dynamodb:*:*:table/CtrlShort-Urls`

---

### Step 5: Deploy Lambda Functions

Build or bundle the backend TypeScript code and create the three functions in the **AWS Lambda Console**:

1. **`CtrlShort-RedirectHandler`**:
   - Runtime: `Node.js 20.x`
   - Architecture: `x86_64` or `arm64`
   - Execution role: `CtrlShort-RedirectLambdaRole`
   - Handler: `handlers/redirect.handler`
   - Memory: `256 MB`, Timeout: `5 seconds`
   - Environment variables:
     - `URLS_TABLE_NAME`: `CtrlShort-Urls`
     - `ANALYTICS_QUEUE_URL`: *(Queue URL from Step 2)*

2. **`CtrlShort-ApiHandler`**:
   - Runtime: `Node.js 20.x`
   - Execution role: `CtrlShort-ApiLambdaRole`
   - Handler: `handlers/api.handler`
   - Memory: `256 MB`, Timeout: `10 seconds`
   - Environment variables:
     - `URLS_TABLE_NAME`: `CtrlShort-Urls`
     - `ANALYTICS_TABLE_NAME`: `CtrlShort-Analytics`
     - `USER_GSI_NAME`: `userId-createdAt-index`
     - `COGNITO_USER_POOL_ID`: *(User Pool ID from Step 3)*
     - `COGNITO_CLIENT_ID`: *(App Client ID from Step 3)*

3. **`CtrlShort-AnalyticsWorker`**:
   - Runtime: `Node.js 20.x`
   - Execution role: `CtrlShort-AnalyticsWorkerRole`
   - Handler: `handlers/analytics.handler`
   - Memory: `256 MB`, Timeout: `15 seconds`
   - Environment variables:
     - `URLS_TABLE_NAME`: `CtrlShort-Urls`
     - `ANALYTICS_TABLE_NAME`: `CtrlShort-Analytics`
   - **Add Trigger**:
     - Trigger: **SQS**
     - SQS queue: `CtrlShort-AnalyticsQueue`
     - Batch size: `10`
     - Report batch item failures: **Enabled**

---

### Step 6: Create Amazon API Gateway

1. Open the **API Gateway Console**.
2. Click **Create API** > **REST API** (or HTTP API) > **Build**.
3. Name: `CtrlShort-API`.
4. **Create Cognito Authorizer**:
   - In left sidebar, click **Authorizers** > **Create Authorizer**.
   - Name: `CtrlShort-CognitoAuth`
   - Type: **Cognito**
   - Cognito User Pool: Select `CtrlShort-UserPool`
   - Token source: `Authorization`
   - Click **Create**.
5. **Create Routes**:
   - `/r/{shortCode}`: `GET` -> Integrate with `CtrlShort-RedirectHandler` (Authorization: **NONE**).
   - `/urls`:
     - `GET` -> Integrate with `CtrlShort-ApiHandler` (Authorization: `CtrlShort-CognitoAuth`).
     - `POST` -> Integrate with `CtrlShort-ApiHandler` (Authorization: `CtrlShort-CognitoAuth`).
   - `/urls/{id}`:
     - `GET` -> Integrate with `CtrlShort-ApiHandler` (Authorization: `CtrlShort-CognitoAuth`).
     - `PATCH` -> Integrate with `CtrlShort-ApiHandler` (Authorization: `CtrlShort-CognitoAuth`).
     - `DELETE` -> Integrate with `CtrlShort-ApiHandler` (Authorization: `CtrlShort-CognitoAuth`).
   - `/urls/{id}/analytics`:
     - `GET` -> Integrate with `CtrlShort-ApiHandler` (Authorization: `CtrlShort-CognitoAuth`).
6. **Enable CORS**:
   - Select resources > **Enable CORS** (`Access-Control-Allow-Origin: *`, Headers: `Content-Type,Authorization`).
7. **Deploy API**:
   - Click **Deploy API** > Stage: `prod`.
   - Copy the **Invoke URL** (e.g. `https://xxxxxx.execute-api.us-east-1.amazonaws.com/prod`).
   - Update `VITE_API_BASE_URL` in your frontend environment with this URL.

---

## Automated Deployment with AWS CDK

If you prefer deploying the entire stack in one command rather than using the console manually:

```bash
# 1. Bootstrap AWS environment (first-time only)
npx cdk bootstrap

# 2. Review CloudFormation template
npm run cdk:synth

# 3. Deploy all AWS resources
npm run cdk:deploy
```

The stack outputs your `ApiEndpoint`, `UserPoolId`, and `UserPoolClientId` automatically.

---

## API Reference

### 1. Create Shortened URL
```http
POST /urls
Authorization: Bearer <COGNITO_JWT_TOKEN>
Content-Type: application/json

{
  "originalUrl": "https://github.com/my-org/project",
  "customAlias": "my-project",
  "expiresInSeconds": 604800
}
```

**Response (201 Created):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "shortCode": "my-project",
  "shortUrl": "https://api.ctrlshort.io/r/my-project",
  "originalUrl": "https://github.com/my-org/project",
  "userId": "usr_cognito_sub",
  "createdAt": "2026-09-18T10:00:00.000Z",
  "updatedAt": "2026-09-18T10:00:00.000Z",
  "isActive": true,
  "expiresAt": 1790420000,
  "totalClicks": 0
}
```

### 2. List User's URLs
```http
GET /urls
Authorization: Bearer <COGNITO_JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "urls": [
    {
      "id": "...",
      "shortCode": "my-project",
      "shortUrl": "https://api.ctrlshort.io/r/my-project",
      "originalUrl": "https://github.com/my-org/project",
      "totalClicks": 142,
      "isActive": true,
      "createdAt": "2026-09-18T10:00:00.000Z"
    }
  ]
}
```

### 3. Get Link Analytics
```http
GET /urls/my-project/analytics
Authorization: Bearer <COGNITO_JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "shortCode": "my-project",
  "originalUrl": "https://github.com/my-org/project",
  "totalClicks": 1248,
  "uniqueVisitors": 921,
  "clicksOverTime": [
    { "date": "2026-09-18", "clicks": 84 }
  ],
  "devices": [
    { "name": "desktop", "count": 800, "percentage": 64 },
    { "name": "mobile", "count": 448, "percentage": 36 }
  ],
  "browsers": [
    { "name": "Google Chrome", "count": 650, "percentage": 52 },
    { "name": "Apple Safari", "count": 400, "percentage": 32 }
  ],
  "operatingSystems": [
    { "name": "macOS", "count": 600, "percentage": 48 },
    { "name": "Windows 11/10", "count": 500, "percentage": 40 }
  ],
  "referrers": [
    { "name": "Twitter / X", "count": 520, "percentage": 42 },
    { "name": "GitHub", "count": 410, "percentage": 33 }
  ],
  "countries": [
    { "name": "US", "count": 600, "percentage": 48 }
  ]
}
```

### 4. Fast Redirect
```http
GET /r/{shortCode}
```

**Response (302 Found):**
```http
HTTP/1.1 302 Found
Location: https://github.com/my-org/project
Cache-Control: private, max-age=90
```

---

## Security & Privacy Architecture

1. **Least-Privilege IAM**: Each Lambda function runs with a dedicated role scoped strictly to the specific DynamoDB table ARN and SQS queue ARN needed.
2. **Strict Protocol Whitelisting**: Destination URLs must use `http:` or `https:`. Dangerous protocols (`javascript:`, `file:`, `data:`) and AWS metadata/loopback addresses (`169.254.169.254`, `localhost`, `127.0.0.1`) are immediately rejected.
3. **Collision Resistance**: Base62 generation uses cryptographically secure random bytes with uniform distribution. DynamoDB conditional writes ensure race conditions can never overwrite existing links.
4. **Zero Raw IP Persistence**: Unique visitors are estimated via a non-reversible SHA-256 hash using a daily rotating salt. Raw visitor IPs are never stored in DynamoDB or logged to CloudWatch.
5. **Server-Side Authorization**: Every URL modification and deletion executes a conditional check (`userId = :userId`) directly inside DynamoDB. Users cannot access or delete other users' links by manipulating IDs.

---

## Testing

The test suite validates input sanitization, collision resistance, custom aliases, and analytics parsing:

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

---

## Troubleshooting

- **CORS Errors**: Ensure API Gateway has `OPTIONS` preflight enabled with `Access-Control-Allow-Origin: *` and headers `Content-Type,Authorization`.
- **401 Unauthorized**: Ensure your request includes `Authorization: Bearer <ID_TOKEN>`. In local development mode, use `Bearer dev-token-anyuser@example.com` or log in as a Guest Developer.
- **SQS Messages Not Processing**: Verify that `CtrlShort-AnalyticsWorker` has the SQS trigger enabled and that its IAM role includes `sqs:ReceiveMessage` and `sqs:DeleteMessage`.
- **Expired Links Still Redirecting**: Ensure you have checked application-level expiration: DynamoDB native TTL sweeps items periodically, but the application performs an instantaneous check against `expiresAt`.

---

© 2026 Ctrl Short. Serverless URL Shortener & Analytics Platform.
