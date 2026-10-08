import { User } from '../types';
import { API_BASE_URL } from './config';

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem('gymtracker_jwt_token');
};

export const setStoredToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('gymtracker_jwt_token', token);
  } else {
    localStorage.removeItem('gymtracker_jwt_token');
  }
};

async function handleResponse<T>(response: Response, defaultErrorMessage: string): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  let data: any = null;
  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || (response.status ? `Server error (${response.status})` : defaultErrorMessage);
    throw new Error(errorMessage);
  }

  if (!data) {
    throw new Error('Unexpected empty or non-JSON response from server');
  }

  return data as T;
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  return handleResponse<AuthResponse>(response, 'Failed to register account');
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse<AuthResponse>(response, 'Failed to log in');
}

export async function getMe(token: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  return handleResponse<{ user: User }>(response, 'Failed to restore session');
}

let hasPrewarmed = false;

export function prewarmBackend(): void {
  if (hasPrewarmed) return;
  hasPrewarmed = true;

  fetch(`${API_BASE_URL}/health`).catch(() => {
    // Silently handle any pre-warm failure without throwing or blocking UI
  });
}

