import { getStoredToken } from './authApi';
import { API_BASE_URL } from './config';

export interface CoachChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ClientIntelligenceSnapshot {
  muscleReadiness?: Record<string, { state: string; score?: number }>;
  persistentUnderexposure?: Array<{
    muscle: string;
    subRegion?: string;
    exposureRatio?: number;
    reason?: string;
  }>;
  adaptiveRecommendations?: Array<{
    exerciseName: string;
    primaryAction: string;
    targetWeight?: number | null;
    targetReps?: number | null;
    rationale?: string;
    reasonCode?: string;
    confidence?: string;
  }>;
}

export interface CoachChatRequest {
  message: string;
  conversationHistory?: CoachChatMessage[];
  clientSnapshot?: ClientIntelligenceSnapshot;
}

export interface CoachChatResponse {
  message: string;
  dataSources: string[];
  error: string | null;
}

export class CoachApiError extends Error {
  status?: number;
  code?: string;
  dataSources?: string[];

  constructor(message: string, status?: number, code?: string, dataSources?: string[]) {
    super(message);
    this.name = 'CoachApiError';
    this.status = status;
    this.code = code;
    this.dataSources = dataSources;
  }
}

/**
 * Sends a message to the GymTrackie AI Coach endpoint (POST /api/coach/chat)
 * Uses the authenticated user's JWT token. Never communicates directly with third-party LLM providers.
 */
export async function sendCoachMessage(
  payload: CoachChatRequest
): Promise<CoachChatResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new CoachApiError('You must be signed in to chat with the AI Coach.', 401, 'UNAUTHORIZED');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/coach/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (_networkErr) {
    throw new CoachApiError(
      'Unable to connect to the GymTrackie server. Please check your internet connection.',
      0,
      'NETWORK_ERROR'
    );
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // If response is not JSON
    data = { message: response.statusText, error: 'NON_JSON_RESPONSE' };
  }

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (response.status === 401
        ? 'Your session has expired. Please log in again.'
        : response.status === 429
        ? 'You have reached the AI Coach request limit. Please wait a few minutes before trying again.'
        : response.status === 503
        ? 'The AI Coach is temporarily unavailable on the server. Please try again shortly.'
        : `AI Coach error (${response.status})`);

    throw new CoachApiError(errorMsg, response.status, data?.error || 'HTTP_ERROR', data?.dataSources);
  }

  return data as CoachChatResponse;
}
