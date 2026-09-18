/**
 * Purpose:
 * SQS consumer worker Lambda that processes batches of URL click events,
 * anonymizes visitor information, increments atomic link counters, and writes
 * structured records into the DynamoDB analytics table.
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { buildAnalyticsItem } from '../lib/analytics-helper';
import { incrementUrlClicks, saveAnalyticsItem } from '../lib/dynamodb';
import { ClickEvent } from '../types';

export async function handler(event: SQSEvent): Promise<{ batchItemFailures?: { itemIdentifier: string }[] }> {
  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err) {
      console.error('[AnalyticsWorker] Failed processing record:', record.messageId, err);
      // Report partial batch failure to SQS for automatic retry
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}

async function processRecord(record: SQSRecord): Promise<void> {
  let clickEvent: ClickEvent;
  try {
    clickEvent = JSON.parse(record.body);
  } catch (parseErr) {
    console.warn('[AnalyticsWorker] Skipping unparseable message body:', record.body);
    return;
  }

  if (!clickEvent.shortCode || !clickEvent.timestamp) {
    console.warn('[AnalyticsWorker] Skipping invalid event payload:', clickEvent);
    return;
  }

  // 1. Build anonymized, privacy-preserving analytics item
  const analyticsItem = buildAnalyticsItem(clickEvent);

  // 2. Persist to DynamoDB Analytics table
  await saveAnalyticsItem(analyticsItem);

  // 3. Atomically increment total clicks counter on the main URL item
  await incrementUrlClicks(clickEvent.shortCode);
}
