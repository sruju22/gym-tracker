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
  } catch {
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
    let errorMsg = data?.message;

    if (!errorMsg || typeof errorMsg !== 'string') {
      const code = data?.error;
      if (code === 'DAILY_LIMIT_REACHED') {
        errorMsg = 'You have reached your daily AI Coach limit. Your limit will reset tomorrow.';
      } else if (code === 'PROVIDER_QUOTA_EXCEEDED') {
        errorMsg = 'The AI Coach provider capacity has been temporarily exhausted. Please try again shortly.';
      } else if (code === 'API_KEY_NOT_CONFIGURED') {
        errorMsg = 'The AI Coach service is not currently configured on the server. Please contact support.';
      } else if (code === 'PROVIDER_TIMEOUT' || response.status === 504) {
        errorMsg = 'The AI Coach request timed out. Please try again in a few moments.';
      } else if (code === 'PROVIDER_BUSY' || response.status === 503) {
        errorMsg = 'The AI Coach is experiencing high demand. Please try again in a moment.';
      } else if (code === 'RATE_LIMITED' || response.status === 429) {
        errorMsg = 'You have sent too many requests. Please wait a moment before asking again.';
      } else if (response.status === 401) {
        errorMsg = 'Your session has expired. Please log in again to chat with the AI Coach.';
      } else if (response.status === 400) {
        errorMsg = 'Invalid chat request. Please try a different question.';
      } else {
        errorMsg = `AI Coach is temporarily unavailable (Status ${response.status}).`;
      }
    }

    throw new CoachApiError(
      errorMsg,
      response.status,
      data?.error || (response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR'),
      data?.dataSources
    );
  }

  return data as CoachChatResponse;
}
