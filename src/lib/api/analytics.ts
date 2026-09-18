/**
 * Purpose:
 * Analytics API module for fetching aggregated click metrics,
 * unique visitors, device distributions, and geographic statistics.
 */

import { apiFetch } from './client';
import type { AnalyticsData } from '../../types/api';

/**
 * Retrieves comprehensive click analytics for a specific shortened URL.
 */
export async function getUrlAnalytics(id: string): Promise<AnalyticsData> {
  return apiFetch<AnalyticsData>(`/urls/${id}/analytics`, {
    method: 'GET',
  });
}
