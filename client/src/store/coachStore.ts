import { create } from 'zustand';
import { sendCoachMessage, CoachApiError, CoachChatMessage } from '../api/coachApi';
import { buildClientIntelligenceSnapshot } from '../utils/coachContextHelper';
import { useWorkoutStore } from './workoutStore';
import { useAuthStore } from './authStore';

export interface CoachMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  dataSources?: string[];
  timestamp: Date;
  status?: 'sending' | 'success' | 'error';
  errorMessage?: string;
}

export interface CoachErrorState {
  message: string;
  status?: number;
  code?: string;
}

interface CoachState {
  isOpen: boolean;
  messages: CoachMessage[];
  isLoading: boolean;
  error: CoachErrorState | null;
  lastFailedPrompt: string | null;

  // Actions
  openCoach: (initialPrompt?: string) => void;
  closeCoach: () => void;
  sendMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearConversation: () => void;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,
  lastFailedPrompt: null,

  openCoach: (initialPrompt?: string) => {
    set({ isOpen: true, error: null });
    if (initialPrompt && initialPrompt.trim()) {
      // Auto-trigger if initial prompt was provided
      setTimeout(() => {
        get().sendMessage(initialPrompt.trim());
      }, 50);
    }
  },

  closeCoach: () => {
    set({ isOpen: false });
  },

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || get().isLoading) return;

    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const userMessage: CoachMessage = {
      id: userMessageId,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      status: 'sending',
    };

    // Prepare bounded conversation history (last 6 previous turns)
    const currentMessages = get().messages;
    const conversationHistory: CoachChatMessage[] = currentMessages
      .filter((m) => m.status !== 'error')
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Optimistically append user message and start loading
    set({
      messages: [...currentMessages, userMessage],
      isLoading: true,
      error: null,
      lastFailedPrompt: null,
    });

    try {
      // Gather client intelligence snapshot from existing workoutStore
      const currentUser = useAuthStore.getState().currentUser;
      const userId = currentUser?.id || 'guest';
      const workoutStore = useWorkoutStore.getState();

      const history = workoutStore.getHistory(userId);
      const weeklyPlan = workoutStore.getWeeklyPlan(userId);
      const exercises = workoutStore.getExercises(userId);
      const equipmentSettings = workoutStore.settings?.equipmentIncrements;

      const clientSnapshot = buildClientIntelligenceSnapshot({
        history,
        weeklyPlan,
        exercises,
        equipmentSettings,
      });

      // Call server AI coach endpoint
      const response = await sendCoachMessage({
        message: trimmed,
        conversationHistory,
        clientSnapshot,
      });

      const modelMessageId = `model-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const modelMessage: CoachMessage = {
        id: modelMessageId,
        role: 'model',
        content: response.message,
        dataSources: response.dataSources || [],
        timestamp: new Date(),
        status: 'success',
      };

      set((state) => ({
        messages: state.messages.map((m): CoachMessage =>
          m.id === userMessageId ? { ...m, status: 'success' } : m
        ).concat(modelMessage),
        isLoading: false,
        error: null,
        lastFailedPrompt: null,
      }));
    } catch (err: any) {
      const errorMessage =
        err instanceof CoachApiError
          ? err.message
          : err?.message || 'Failed to get a response from the AI Coach.';

      set((state) => ({
        messages: state.messages.map((m): CoachMessage =>
          m.id === userMessageId
            ? { ...m, status: 'error', errorMessage }
            : m
        ),
        isLoading: false,
        error: {
          message: errorMessage,
          status: err?.status,
          code: err?.code,
        },
        lastFailedPrompt: trimmed,
      }));
    }
  },

  retryLastMessage: async () => {
    const { lastFailedPrompt, sendMessage } = get();
    if (lastFailedPrompt) {
      await sendMessage(lastFailedPrompt);
    }
  },

  clearConversation: () => {
    set({
      messages: [],
      isLoading: false,
      error: null,
      lastFailedPrompt: null,
    });
  },
}));
