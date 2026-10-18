import { User } from '../types';
import { API_BASE_URL } from './config';

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export const getStoredToken = (): string | null => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('gymtracker_jwt_token');
};

export const setStoredToken = (token: string | null): void => {
  if (typeof localStorage === 'undefined') return;
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
    let errorMessage = data?.error || data?.message;
    if (data?.details) {
      if (typeof data.details === 'string' && data.details.includes('buffering timed out')) {
        errorMessage = 'Database connection timed out. MongoDB Atlas is unreachable from the server (check MONGODB_URI in Render dashboard).';
      } else {
        errorMessage = `${errorMessage || defaultErrorMessage}: ${data.details}`;
      }
    }
    if (!errorMessage) {
      errorMessage = response.status ? `Server error (${response.status})` : defaultErrorMessage;
    }
    const err: any = new Error(errorMessage);
    err.status = response.status;
    err.code = data?.code;
    err.email = data?.email;
    throw err;
  }

  if (!data) {
    throw new Error('Unexpected empty or non-JSON response from server');
  }

  return data as T;
}

async function fetchWithDbFailover(path: string, init: RequestInit): Promise<Response> {
  const primaryUrl = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(primaryUrl, init);
  } catch (err: any) {
    if (!API_BASE_URL.includes('gym-tracker-test')) {
      return await fetch(`https://gym-tracker-test.onrender.com/api${path}`, init);
    }
    throw err;
  }

  // If the server returns 503 (database disconnected), attempt failover to the healthy test backend
  if (response.status === 503 && !API_BASE_URL.includes('gym-tracker-test')) {
    try {
      const fallback = await fetch(`https://gym-tracker-test.onrender.com/api${path}`, init);
      if (fallback.ok || fallback.status !== 503) {
        return fallback;
      }
    } catch {
      // Fall through to original response
    }
  }

  return response;
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetchWithDbFailover('/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  return handleResponse<AuthResponse>(response, 'Failed to register account');
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetchWithDbFailover('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse<AuthResponse>(response, 'Failed to log in');
}

export async function loginWithGoogle(
  credential: string
): Promise<AuthResponse & { isNewUser?: boolean }> {
  const response = await fetchWithDbFailover('/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });

  return handleResponse<AuthResponse & { isNewUser?: boolean }>(
    response,
    'Google authentication failed'
  );
}

export async function linkGoogleAccount(
  token: string,
  credential: string
): Promise<{ message: string; user: User }> {
  const response = await fetchWithDbFailover('/auth/google/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ credential }),
  });

  return handleResponse<{ message: string; user: User }>(
    response,
    'Failed to link Google account'
  );
}

export async function getMe(token: string): Promise<{ user: User }> {
  const response = await fetchWithDbFailover('/auth/me', {
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

export async function updateUserProfile(
  token: string,
  data: Partial<User>
): Promise<{ message: string; user: User }> {
  const response = await fetchWithDbFailover('/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<{ message: string; user: User }>(
    response,
    'Failed to update profile'
  );
}

