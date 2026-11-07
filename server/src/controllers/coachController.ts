import { Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { buildCoachContext, ClientIntelligenceSnapshot } from '../services/coachContextService';

export interface CoachChatRequestBody {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
  clientSnapshot?: ClientIntelligenceSnapshot;
}

export interface CoachChatResponseBody {
  message: string;
  dataSources: string[];
  error: string | null;
  retryAfter?: number;
}

export const COACH_SYSTEM_INSTRUCTION = `You are GymTrackie's Personal Training Intelligence Coach.
You provide encouraging, biomechanically sound, evidence-based strength coaching based strictly on the user's logged workout history and training context.

CORE MANDATES & SAFETY GUARDRAILS:

1. STRICT DATA GROUNDING (ZERO HALLUCINATION):
- Base all answers strictly and exclusively on the structured JSON workout context provided in this prompt.
- If the user asks about an exercise, muscle, or timeframe that is missing from the context, state clearly that no records exist in their history.
- NEVER invent, extrapolate, or assume workout statistics, loads, reps, dates, or personal records.
- Distinguish actual logged records (e.g., "You completed 80 kg × 8 reps on Nov 4") from estimated values (e.g., "Estimated 1RM is ~100 kg based on the Brzycki formula").

2. PROGRESSION & ADAPTIVE EXPLANATIONS:
- Explain progression recommendations in simple, clear language.
- Clarify whether an overload target suggests stepping up weight, consolidating reps, or reviewing technique.
- If client-side adaptive recommendations or muscle readiness snapshots are provided, interpret them directly. If absent, note that live adaptive targets and biomechanical readiness are evaluated in the active workout interface.

3. NON-MEDICAL & INJURY SAFETY INVARIANT (CRITICAL):
- You are an AI training coach, NOT a medical doctor, physical therapist, or clinician.
- If the user asks about pain, joint discomfort, clicking, sharp twinges, injury diagnosis, or injury rehabilitation:
  * Firmly refuse to provide medical diagnoses or prescribe rehab exercises.
  * Explicitly instruct the user to consult a qualified physician or licensed physical therapist.
  * Advise them to immediately stop any exercise that causes acute or sharp pain.

4. READ-ONLY NON-DESTRUCTIVE INVARIANT:
- You have strictly read-only access to user data.
- You cannot modify, delete, or stage workouts, sets, reps, or personal records.
- Remind the user that any suggested weight or rep target must be reviewed and entered by them during their workout session.

5. COMMUNICATION STYLE:
- Direct, concise, supportive, and professional.
- Use Markdown formatting (bold keys, bullet points) for clarity.
- Keep answers focused directly on the user's question without unnecessary introductory pleasantries.`;

// Default high-availability, low-latency Flash models verified in Google Developer API
export const DEFAULT_PRIMARY_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
export const DEFAULT_TIMEOUT_MS = 25000;

export interface ClassifiedProviderError {
  isRetryable: boolean;
  errorCode:
    | 'PROVIDER_BUSY'
    | 'PROVIDER_QUOTA_EXCEEDED'
    | 'PROVIDER_TIMEOUT'
    | 'PROVIDER_AUTH_ERROR'
    | 'PROVIDER_ERROR';
  statusCode: number;
  userMessage: string;
}

/**
 * Classifies an upstream provider error into retryable vs non-retryable
 * and maps to frontend-safe status and error codes.
 */
export function classifyProviderError(err: any): ClassifiedProviderError {
  const status = Number(err?.status || err?.statusCode || err?.response?.status || 0);
  const name = String(err?.name || '');
  const message = String(err?.message || '').toLowerCase();

  // 1. Timeout / Abort errors
  if (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    status === 504 ||
    status === 408 ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('deadline exceeded')
  ) {
    return {
      isRetryable: true,
      errorCode: 'PROVIDER_TIMEOUT',
      statusCode: 504,
      userMessage: 'The AI Coach request timed out. Please try again shortly.',
    };
  }

  // 2. Authentication & Permission errors (401 / 403) - NEVER RETRY
  if (
    status === 401 ||
    status === 403 ||
    message.includes('api key not valid') ||
    message.includes('permission_denied') ||
    message.includes('unauthenticated') ||
    message.includes('forbidden')
  ) {
    return {
      isRetryable: false,
      errorCode: 'PROVIDER_AUTH_ERROR',
      statusCode: 502,
      userMessage:
        'The AI Coach encountered an authentication error with the AI provider. Please notify support.',
    };
  }

  // 3. Invalid Request errors (400) - NEVER RETRY
  if (
    status === 400 ||
    message.includes('invalid_argument') ||
    message.includes('bad request')
  ) {
    return {
      isRetryable: false,
      errorCode: 'PROVIDER_ERROR',
      statusCode: 400,
      userMessage: 'The AI Coach received an invalid request format from the provider.',
    };
  }

  // 4. Rate Limiting / Quota (429)
  if (status === 429 || message.includes('resource_exhausted')) {
    const isPermanentProjectExhaustion =
      message.includes('quota metric') ||
      message.includes('check your plan and billing') ||
      message.includes('exceeded your current quota') ||
      message.includes('daily limit');

    if (isPermanentProjectExhaustion) {
      return {
        isRetryable: false, // Cannot be resolved by calling another model on the same project
        errorCode: 'PROVIDER_QUOTA_EXCEEDED',
        statusCode: 429,
        userMessage:
          'The AI Coach service has temporarily exceeded its provider capacity. Please try again later.',
      };
    }

    // Transient RPM spike on this specific model: allow fallback to a model with distinct RPM pool
    return {
      isRetryable: true,
      errorCode: 'PROVIDER_QUOTA_EXCEEDED',
      statusCode: 429,
      userMessage:
        'The AI Coach service is receiving high traffic. Please try again shortly.',
    };
  }

  // 5. Provider Capacity / High Demand (503)
  if (
    status === 503 ||
    message.includes('high demand') ||
    message.includes('unavailable') ||
    message.includes('service unavailable')
  ) {
    return {
      isRetryable: true,
      errorCode: 'PROVIDER_BUSY',
      statusCode: 503,
      userMessage:
        'The AI Coach service is currently experiencing high demand. Please try again in a few moments.',
    };
  }

  // 6. Network connectivity errors (ECONNRESET, ETIMEDOUT, fetch failed)
  if (
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('fetch failed') ||
    message.includes('network')
  ) {
    return {
      isRetryable: true,
      errorCode: 'PROVIDER_ERROR',
      statusCode: 502,
      userMessage:
        'Unable to connect to the AI Coach service. Please check your internet connection.',
    };
  }

  // 7. Generic Provider 500 / other errors
  return {
    isRetryable: status >= 500,
    errorCode: 'PROVIDER_ERROR',
    statusCode: 502,
    userMessage:
      'The AI Coach service encountered an unexpected provider error. Please try again shortly.',
  };
}

/**
 * Validates the incoming chat request body
 */
export function validateCoachInput(body: any): {
  isValid: boolean;
  sanitizedMessage?: string;
  sanitizedHistory?: Array<{ role: 'user' | 'model'; content: string }>;
  sanitizedSnapshot?: ClientIntelligenceSnapshot;
  errorMessage?: string;
} {
  if (!body || typeof body !== 'object') {
    return { isValid: false, errorMessage: 'Request body must be a valid JSON object.' };
  }

  if (typeof body.message !== 'string') {
    return { isValid: false, errorMessage: 'Message field is required and must be a string.' };
  }

  const trimmedMessage = body.message.trim();
  if (trimmedMessage.length === 0) {
    return { isValid: false, errorMessage: 'Message cannot be empty.' };
  }

  if (trimmedMessage.length > 1000) {
    return { isValid: false, errorMessage: 'Message is too long. Maximum allowed length is 1000 characters.' };
  }

  // Sanitize conversation history: allow at most 6 recent turns
  let sanitizedHistory: Array<{ role: 'user' | 'model'; content: string }> = [];
  if (Array.isArray(body.conversationHistory)) {
    sanitizedHistory = body.conversationHistory
      .filter(
        (turn: any) =>
          turn &&
          typeof turn === 'object' &&
          (turn.role === 'user' || turn.role === 'model') &&
          typeof turn.content === 'string' &&
          turn.content.trim().length > 0
      )
      .slice(-6)
      .map((turn: any) => ({
        role: turn.role as 'user' | 'model',
        content: turn.content.trim().slice(0, 1000),
      }));
  }

  // Validate snapshot object if present
  let sanitizedSnapshot: ClientIntelligenceSnapshot | undefined = undefined;
  if (body.clientSnapshot && typeof body.clientSnapshot === 'object') {
    sanitizedSnapshot = body.clientSnapshot;
  }

  return {
    isValid: true,
    sanitizedMessage: trimmedMessage,
    sanitizedHistory,
    sanitizedSnapshot,
  };
}

/**
 * Controller for POST /api/coach/chat
 */
export const chatWithCoach = async (
  req: AuthenticatedRequest,
  res: Response<CoachChatResponseBody>
): Promise<void> => {
  try {
    // 1. Authenticated user verification
    if (!req.user || !req.user._id) {
      res.status(401).json({
        message: 'You must be logged in to chat with the AI Coach.',
        dataSources: [],
        error: 'UNAUTHORIZED',
      });
      return;
    }

    // 2. Validate request input
    const validation = validateCoachInput(req.body);
    if (!validation.isValid || !validation.sanitizedMessage) {
      res.status(400).json({
        message: validation.errorMessage || 'Invalid chat request.',
        dataSources: [],
        error: 'INVALID_INPUT',
      });
      return;
    }

    // 3. Verify server-side Gemini API key configuration
    const rawApiKey = process.env.GEMINI_API_KEY?.trim();
    // Strip surrounding quotes if pasted with quotes in cloud deployment dashboards
    const apiKey = rawApiKey ? rawApiKey.replace(/^["']|["']$/g, '').trim() : '';
    if (!apiKey) {
      res.status(503).json({
        message:
          'GymTrackie AI Coach is currently unavailable. The server administrator must configure GEMINI_API_KEY in the server environment.',
        dataSources: [],
        error: 'API_KEY_NOT_CONFIGURED',
      });
      return;
    }

    // 4. Build user workout context from MongoDB
    const { contextPayload, dataSources } = await buildCoachContext(
      req.user._id,
      validation.sanitizedSnapshot
    );

    // 5. Determine primary and fallback models (Bounded to at most 1 fallback attempt)
    const primaryModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY_MODEL;
    let fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
    if (fallbackModel === primaryModel) {
      fallbackModel =
        primaryModel === DEFAULT_PRIMARY_MODEL ? DEFAULT_FALLBACK_MODEL : DEFAULT_PRIMARY_MODEL;
    }
    const modelsToTry = [primaryModel, fallbackModel].filter(Boolean);

    // 6. Determine request timeout (default: 25000 ms)
    const rawTimeout = parseInt(process.env.GEMINI_TIMEOUT_MS?.trim() || '', 10);
    const timeoutMs = !isNaN(rawTimeout) && rawTimeout >= 1000 ? rawTimeout : DEFAULT_TIMEOUT_MS;

    const ai = new GoogleGenAI({ apiKey });

    // 7. Build prompt turns
    const contextPrefix = `[GYMTRACKIE_USER_WORKOUT_CONTEXT]\n${JSON.stringify(contextPayload, null, 2)}\n[END_GYMTRACKIE_USER_WORKOUT_CONTEXT]\n\n`;

    const contents: any[] = [];

    // Add prior conversation turns if provided
    if (validation.sanitizedHistory && validation.sanitizedHistory.length > 0) {
      for (const turn of validation.sanitizedHistory) {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.content }],
        });
      }
    }

    // Add current user prompt with context payload embedded
    contents.push({
      role: 'user',
      parts: [
        {
          text: `${contextPrefix}Lifter Question: ${validation.sanitizedMessage}`,
        },
      ],
    });

    // 8. Execute AI Generation with timeout and bounded high-availability fallback
    let aiResponse: any = null;
    let lastErrorClassification: ClassifiedProviderError | null = null;
    let lastRawError: any = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const isFallbackAttempt = i > 0;

      const controller = new AbortController();
      let timer: NodeJS.Timeout | null = null;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            const timeoutErr: any = new Error(
              `Request to model ${model} timed out after ${timeoutMs}ms`
            );
            timeoutErr.name = 'TimeoutError';
            timeoutErr.status = 504;
            reject(timeoutErr);
          }, timeoutMs);
        });

        const apiPromise = ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: COACH_SYSTEM_INSTRUCTION,
            maxOutputTokens: 800,
            temperature: 0.2, // Low temperature for consistent factual grounding
            httpOptions: { timeout: timeoutMs },
            abortSignal: controller.signal,
          },
        });

        aiResponse = await Promise.race([apiPromise, timeoutPromise]);

        if (aiResponse?.text?.trim()) {
          // Successful generation!
          break;
        }
      } catch (err: any) {
        lastRawError = err;
        lastErrorClassification = classifyProviderError(err);

        // Security logging: Never log raw API key, sensitive user prompt, or full DB context
        console.warn(
          `[CoachController] Model ${model} ${isFallbackAttempt ? '(fallback)' : '(primary)'} failed with ${lastErrorClassification.errorCode}: ${err?.message || err}`
        );

        // Check if bounded fallback should be attempted
        const hasFallbackRemaining = i < modelsToTry.length - 1;
        if (lastErrorClassification.isRetryable && hasFallbackRemaining) {
          console.warn(
            `[CoachController] Attempting fallback model: ${modelsToTry[i + 1]}...`
          );
          continue;
        }

        // Non-retryable error or no fallback models remaining: stop immediately
        break;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    // 9. Validate and sanitize model output
    const responseText = aiResponse?.text?.trim();
    if (!responseText) {
      const errorDetails = lastErrorClassification || {
        errorCode: 'PROVIDER_ERROR',
        statusCode: 502,
        userMessage:
          'The AI Coach service encountered an unexpected provider error. Please try again shortly.',
      };

      console.error(
        `[CoachController] Provider execution aborted (${errorDetails.errorCode}): ${lastRawError?.message || lastRawError || 'Empty response'}`
      );

      res.status(errorDetails.statusCode).json({
        message: errorDetails.userMessage,
        dataSources,
        error: errorDetails.errorCode,
      });
      return;
    }

    // 10. Return successful response
    res.status(200).json({
      message: responseText,
      dataSources,
      error: null,
    });
  } catch (error: any) {
    console.error(`[CoachController] Internal error: ${error?.message || error}`);
    res.status(500).json({
      message: 'An internal server error occurred while contacting the AI Coach.',
      dataSources: [],
      error: 'INTERNAL_SERVER_ERROR',
    });
  }
};
