/**
 * Purpose:
 * Provides asynchronous SQS messaging for click events with local fallback
 * so URL redirection is never blocked by database writes.
 */

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ClickEvent } from '../types';

const QUEUE_URL = process.env.ANALYTICS_QUEUE_URL || '';
const isLocal = !process.env.AWS_REGION && !process.env.AWS_LAMBDA_FUNCTION_NAME;

let sqsClient: SQSClient | null = null;

if (!isLocal && QUEUE_URL) {
  sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
}

// Local in-memory queue listener callback for local development
type LocalQueueListener = (event: ClickEvent) => Promise<void>;
let localListener: LocalQueueListener | null = null;

export function registerLocalQueueListener(listener: LocalQueueListener): void {
  localListener = listener;
}

/**
 * Sends a click event to SQS asynchronously.
 * Does not throw if SQS fails — ensures user redirect is never blocked.
 */
export async function queueClickEvent(event: ClickEvent): Promise<void> {
  if (sqsClient && QUEUE_URL) {
    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: JSON.stringify(event),
        })
      );
    } catch (err) {
      // Log error without exposing sensitive user information
      console.error('[SQS] Error enqueuing click event:', err instanceof Error ? err.message : err);
    }
    return;
  }

  // Local development processing
  if (localListener) {
    // Process asynchronously in background
    setTimeout(() => {
      localListener!(event).catch((err) => {
        console.error('[LocalAnalytics] Error processing click event:', err);
      });
    }, 10);
  }
}
