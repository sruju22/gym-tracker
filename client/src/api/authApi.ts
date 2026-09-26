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

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to register account');
  }

  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to log in');
  }

  return data;
}

export async function getMe(token: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to restore session');
  }

  return data;
}
