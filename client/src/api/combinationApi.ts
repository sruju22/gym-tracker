import { API_BASE_URL } from './config';
import { getStoredToken } from './authApi';
import { SavedCombination } from '../types';

export interface CombinationApiResponse {
  templates?: any[];
  template?: any;
  message?: string;
  error?: string;
}

export const fetchSavedCombinationsApi = async (): Promise<SavedCombination[]> => {
  const token = getStoredToken();
  if (!token) return [];

  const res = await fetch(`${API_BASE_URL}/combinations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch saved combinations: ${res.statusText}`);
  }

  const data: CombinationApiResponse = await res.json();
  const rawTemplates = data.templates || [];

  return rawTemplates.map((t: any) => ({
    id: t._id || t.id,
    userId: t.userId,
    name: t.name,
    type: t.type,
    techniqueLabel: t.techniqueLabel,
    rounds: t.rounds || 3,
    stages: (t.stages || []).map((s: any, idx: number) => ({
      id: s.id || `stage_${idx}`,
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      movementDescription: s.movementDescription,
      targetWeight: s.targetWeight,
      targetReps: s.targetReps,
    })),
    createdAt: t.createdAt || new Date().toISOString(),
  }));
};

export const createSavedCombinationApi = async (
  template: Omit<SavedCombination, 'id' | 'createdAt'>
): Promise<SavedCombination> => {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/combinations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(template),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to save combination: ${res.statusText}`);
  }

  const data: CombinationApiResponse = await res.json();
  const t = data.template;

  return {
    id: t._id || t.id,
    userId: t.userId,
    name: t.name,
    type: t.type,
    techniqueLabel: t.techniqueLabel,
    rounds: t.rounds,
    stages: t.stages,
    createdAt: t.createdAt,
  };
};

export const updateSavedCombinationApi = async (
  id: string,
  template: Partial<Omit<SavedCombination, 'id' | 'createdAt'>>
): Promise<SavedCombination> => {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/combinations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(template),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update combination: ${res.statusText}`);
  }

  const data: CombinationApiResponse = await res.json();
  const t = data.template;

  return {
    id: t._id || t.id,
    userId: t.userId,
    name: t.name,
    type: t.type,
    techniqueLabel: t.techniqueLabel,
    rounds: t.rounds,
    stages: t.stages,
    createdAt: t.createdAt,
  };
};

export const deleteSavedCombinationApi = async (id: string): Promise<boolean> => {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/combinations/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete combination: ${res.statusText}`);
  }

  return true;
};
