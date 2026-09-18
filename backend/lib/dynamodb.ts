/**
 * Purpose:
 * Provides the DynamoDB data access layer for Ctrl Short with atomic conditional writes,
 * GSI queries for user link listings, low-latency key lookups for redirection,
 * atomic click counter increments, and an automatic in-memory fallback for local dev.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { UrlItem, AnalyticsItem, AnalyticsSummary } from '../types';

const URLS_TABLE = process.env.URLS_TABLE_NAME || 'CtrlShort-Urls';
const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE_NAME || 'CtrlShort-Analytics';
const USER_GSI_NAME = process.env.USER_GSI_NAME || 'userId-createdAt-index';

// Initialize AWS DynamoDB Document Client
const isLocal = !process.env.AWS_REGION && !process.env.AWS_LAMBDA_FUNCTION_NAME;

let ddbDocClient: DynamoDBDocumentClient | null = null;

if (!isLocal) {
  const rawClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  ddbDocClient = DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

// In-Memory Storage for zero-dependency local development and testing
const localUrlStore = new Map<string, UrlItem>();
const localAnalyticsStore: AnalyticsItem[] = [];

/**
 * Creates a new shortened URL item with atomic conditional write.
 * Throws an error with code 'COLLISION' if the shortCode already exists.
 */
export async function createUrlRecord(item: UrlItem): Promise<UrlItem> {
  if (ddbDocClient) {
    try {
      await ddbDocClient.send(
        new PutCommand({
          TableName: URLS_TABLE,
          Item: item,
          ConditionExpression: 'attribute_not_exists(shortCode)',
        })
      );
      return item;
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
        const error = new Error('Short code or alias already exists.');
        (error as { code?: string }).code = 'COLLISION';
        throw error;
      }
      throw err;
    }
  }

  // Local in-memory execution
  if (localUrlStore.has(item.shortCode)) {
    const error = new Error('Short code or alias already exists.');
    (error as { code?: string }).code = 'COLLISION';
    throw error;
  }
  localUrlStore.set(item.shortCode, { ...item });
  return item;
}

/**
 * Retrieves a URL item by its shortCode with direct key lookup.
 */
export async function getUrlByShortCode(shortCode: string): Promise<UrlItem | null> {
  if (ddbDocClient) {
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: URLS_TABLE,
        Key: { shortCode },
      })
    );
    return (result.Item as UrlItem) || null;
  }

  const found = localUrlStore.get(shortCode);
  return found ? { ...found } : null;
}

/**
 * Lists all URLs belonging to a specific authenticated user, ordered by creation date descending.
 */
export async function listUrlsByUser(userId: string): Promise<UrlItem[]> {
  if (ddbDocClient) {
    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: URLS_TABLE,
        IndexName: USER_GSI_NAME,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // Descending order
      })
    );
    return (result.Items as UrlItem[]) || [];
  }

  const items: UrlItem[] = [];
  for (const url of localUrlStore.values()) {
    if (url.userId === userId) {
      items.push({ ...url });
    }
  }
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Updates a URL item's status, custom alias, or expiration.
 * Enforces server-side ownership check via ConditionExpression.
 */
export async function updateUrlRecord(
  shortCode: string,
  userId: string,
  updates: { isActive?: boolean; expiresAt?: number | null }
): Promise<UrlItem> {
  if (ddbDocClient) {
    const expressions: string[] = ['updatedAt = :updatedAt'];
    const values: Record<string, unknown> = {
      ':updatedAt': new Date().toISOString(),
      ':userId': userId,
    };

    if (updates.isActive !== undefined) {
      expressions.push('isActive = :isActive');
      values[':isActive'] = updates.isActive;
    }
    if (updates.expiresAt !== undefined) {
      expressions.push('expiresAt = :expiresAt');
      values[':expiresAt'] = updates.expiresAt;
    }

    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: URLS_TABLE,
        Key: { shortCode },
        ConditionExpression: 'attribute_exists(shortCode) AND userId = :userId',
        UpdateExpression: `SET ${expressions.join(', ')}`,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes as UrlItem;
  }

  const existing = localUrlStore.get(shortCode);
  if (!existing || existing.userId !== userId) {
    const error = new Error('URL not found or unauthorized.');
    (error as { code?: string }).code = 'NOT_FOUND_OR_FORBIDDEN';
    throw error;
  }

  const updated: UrlItem = {
    ...existing,
    updatedAt: new Date().toISOString(),
    ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
    ...(updates.expiresAt !== undefined ? { expiresAt: updates.expiresAt } : {}),
  };
  localUrlStore.set(shortCode, updated);
  return updated;
}

/**
 * Deletes a URL item.
 * Enforces ownership check.
 */
export async function deleteUrlRecord(shortCode: string, userId: string): Promise<boolean> {
  if (ddbDocClient) {
    try {
      await ddbDocClient.send(
        new DeleteCommand({
          TableName: URLS_TABLE,
          Key: { shortCode },
          ConditionExpression: 'attribute_exists(shortCode) AND userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        })
      );
      return true;
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
        return false;
      }
      throw err;
    }
  }

  const existing = localUrlStore.get(shortCode);
  if (!existing || existing.userId !== userId) {
    return false;
  }
  localUrlStore.delete(shortCode);
  return true;
}

/**
 * Atomically increments the totalClicks counter for a URL.
 */
export async function incrementUrlClicks(shortCode: string): Promise<void> {
  if (ddbDocClient) {
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: URLS_TABLE,
        Key: { shortCode },
        UpdateExpression: 'ADD totalClicks :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
        },
      })
    );
    return;
  }

  const existing = localUrlStore.get(shortCode);
  if (existing) {
    existing.totalClicks = (existing.totalClicks || 0) + 1;
    localUrlStore.set(shortCode, existing);
  }
}

/**
 * Persists a detailed click analytics item.
 */
export async function saveAnalyticsItem(item: AnalyticsItem): Promise<void> {
  if (ddbDocClient) {
    await ddbDocClient.send(
      new PutCommand({
        TableName: ANALYTICS_TABLE,
        Item: item,
      })
    );
    return;
  }

  localAnalyticsStore.push(item);
}

/**
 * Aggregates analytics data for a given shortCode.
 */
export async function getAnalyticsSummary(shortCode: string): Promise<AnalyticsSummary | null> {
  const url = await getUrlByShortCode(shortCode);
  if (!url) return null;

  let clicks: AnalyticsItem[] = [];

  if (ddbDocClient) {
    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: ANALYTICS_TABLE,
        KeyConditionExpression: 'shortCode = :shortCode',
        ExpressionAttributeValues: {
          ':shortCode': shortCode,
        },
      })
    );
    clicks = (result.Items as AnalyticsItem[]) || [];
  } else {
    clicks = localAnalyticsStore.filter((c) => c.shortCode === shortCode);
  }

  const totalClicks = url.totalClicks || clicks.length;
  const uniqueVisitorHashes = new Set(clicks.map((c) => c.visitorHash).filter(Boolean));
  const uniqueVisitors = uniqueVisitorHashes.size || (totalClicks > 0 ? Math.min(totalClicks, 1) : 0);

  // Group by date for time-series
  const dateCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const osCounts: Record<string, number> = {};
  const referrerCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};

  for (const c of clicks) {
    const date = c.timestamp.slice(0, 10);
    dateCounts[date] = (dateCounts[date] || 0) + 1;
    deviceCounts[c.device] = (deviceCounts[c.device] || 0) + 1;
    browserCounts[c.browser] = (browserCounts[c.browser] || 0) + 1;
    osCounts[c.os] = (osCounts[c.os] || 0) + 1;
    referrerCounts[c.referrer || 'Direct'] = (referrerCounts[c.referrer || 'Direct'] || 0) + 1;
    countryCounts[c.country || 'Unknown'] = (countryCounts[c.country || 'Unknown'] || 0) + 1;
  }

  const toBreakdown = (counts: Record<string, number>) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const clicksOverTime = Object.entries(dateCounts)
    .map(([date, count]) => ({ date, clicks: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    shortCode,
    originalUrl: url.originalUrl,
    totalClicks,
    uniqueVisitors,
    clicksOverTime,
    devices: toBreakdown(deviceCounts),
    browsers: toBreakdown(browserCounts),
    operatingSystems: toBreakdown(osCounts),
    referrers: toBreakdown(referrerCounts),
    countries: toBreakdown(countryCounts),
  };
}
