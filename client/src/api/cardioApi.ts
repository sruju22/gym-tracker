import { getStoredToken } from './authApi';
import { API_BASE_URL } from './config';
import { CardioSession } from '../types';

export interface CardioSessionsResponse {
  count: number;
  totalCount: number;
  page: number;
  totalPages: number;
  sessions: CardioSession[];
}

export interface CardioSessionCreateResponse {
  message: string;
  session: CardioSession;
  deduplicated?: boolean;
}

export interface FetchCardioParams {
  page?: number;
  limit?: number;
  activityType?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchCardioSessionsApi(
  params?: FetchCardioParams
): Promise<CardioSessionsResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  let url = `${API_BASE_URL}/cardio`;
  if (params) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.activityType && params.activityType !== 'all') {
      query.set('activityType', params.activityType);
    }
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch cardio sessions');
  }

  return data;
}

export async function createCardioSessionApi(
  sessionData: Partial<CardioSession>
): Promise<CardioSessionCreateResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/cardio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(sessionData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to save cardio session');
  }

  return data;
}

export async function updateCardioSessionApi(
  id: string,
  updates: Partial<CardioSession>
): Promise<CardioSessionCreateResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/cardio/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update cardio session');
  }

  return data;
}

export async function deleteCardioSessionApi(id: string): Promise<{ message: string; id: string }> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/cardio/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete cardio session');
  }

  return data;
}
