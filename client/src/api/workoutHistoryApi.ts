import { getStoredToken } from './authApi';
import { API_BASE_URL } from './config';

export interface WorkoutHistoryResponse {
  count: number;
  workouts: any[];
}

export interface WorkoutSessionCreateResponse {
  message: string;
  workout: any;
}

export interface FetchWorkoutHistoryParams {
  page?: number;
  limit?: number;
  search?: string;
  workoutType?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchWorkoutHistoryApi(params?: FetchWorkoutHistoryParams): Promise<WorkoutHistoryResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  let url = `${API_BASE_URL}/workouts/history`;
  if (params) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.workoutType) query.set('workoutType', params.workoutType);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch workout history');
  }

  return data;
}

export async function createWorkoutHistoryApi(sessionData: Record<string, any>): Promise<WorkoutSessionCreateResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/workouts/history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(sessionData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to save completed workout session');
  }

  return data;
}

export async function updateWorkoutHistoryApi(id: string, sessionData: Record<string, any>): Promise<WorkoutSessionCreateResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/workouts/history/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(sessionData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update workout session');
  }

  return data;
}

export async function deleteWorkoutHistoryApi(id: string): Promise<{ message: string; id: string }> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/workouts/history/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete workout session');
  }

  return data;
}
