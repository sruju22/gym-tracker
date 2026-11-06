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
    const apiKey = process.env.GEMINI_API_KEY?.trim();
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

    // 5. Initialize Google GenAI client with configurable model (default: gemini-3.8-flash)
    const primaryModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
    const modelsToTry = [primaryModel];
    if (primaryModel !== 'gemini-3.5-flash') {
      modelsToTry.push('gemini-3.5-flash');
    }
    const ai = new GoogleGenAI({ apiKey });

    // 6. Build prompt turns
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

    // 7. Execute AI Generation with cost control & high-availability fallback
    let aiResponse: any = null;
    let lastProviderError: any = null;

    for (const model of modelsToTry) {
      try {
        aiResponse = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: COACH_SYSTEM_INSTRUCTION,
            maxOutputTokens: 800,
            temperature: 0.2, // Low temperature for consistent factual grounding
          },
        });
        if (aiResponse?.text?.trim()) {
          break;
        }
      } catch (err: any) {
        lastProviderError = err;
        const isCapacityError =
          err?.status === 503 ||
          (typeof err?.message === 'string' &&
            (err.message.includes('high demand') || err.message.includes('UNAVAILABLE')));

        if (isCapacityError && model !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(
            `[CoachController] Model ${model} is experiencing temporary high demand (HTTP 503). Attempting high-availability fallback...`
          );
          continue;
        }
        break;
      }
    }

    // 8. Validate and sanitize model output
    const responseText = aiResponse?.text?.trim();
    if (!responseText) {
      // Security guard: Never log raw API key, sensitive user prompt, or full DB context
      console.error(
        `[CoachController] Gemini provider execution error: ${lastProviderError?.message || lastProviderError || 'Empty response'}`
      );

      res.status(502).json({
        message:
          'The AI Coach service encountered an unexpected provider error. Please try again shortly.',
        dataSources,
        error: 'PROVIDER_ERROR',
      });
      return;
    }

    // 9. Return successful response
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
