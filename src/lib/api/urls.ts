/**
 * Purpose:
 * URL management API module for shortening URLs, listing links,
 * toggling active status, updating expirations, and deleting links.
 */

import { apiFetch } from './client';
import type { CreateUrlInput, UpdateUrlInput, UrlModel } from '../../types/api';

/**
 * Creates a new shortened URL with optional custom alias and expiration.
 */
export async function createUrl(input: CreateUrlInput): Promise<UrlModel> {
  return apiFetch<UrlModel>('/urls', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Lists all URLs belonging to the authenticated user.
 */
export async function listUrls(): Promise<UrlModel[]> {
  const data = await apiFetch<{ urls: UrlModel[] }>('/urls', {
    method: 'GET',
  });
  return data.urls || [];
}

/**
 * Retrieves details for a specific shortened URL.
 */
export async function getUrl(id: string): Promise<UrlModel> {
  return apiFetch<UrlModel>(`/urls/${id}`, {
    method: 'GET',
  });
}

/**
 * Updates link status (active/inactive) or expiration time.
 */
export async function updateUrl(id: string, input: UpdateUrlInput): Promise<UrlModel> {
  return apiFetch<UrlModel>(`/urls/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/**
 * Deletes a shortened URL permanently.
 */
export async function deleteUrl(id: string): Promise<boolean> {
  await apiFetch<{ success: boolean }>(`/urls/${id}`, {
    method: 'DELETE',
  });
  return true;
}
