import { getStoredToken } from './authApi';
import { PersonalRecord, PreviousPerformance, Goal, GoalStatus, WeightLog } from '../types';
import { API_BASE_URL } from './config';

export interface ProgressSummaryResponse {
  totalVolume: number;
  totalSets: number;
  totalWorkouts: number;
}

export interface VolumeTrendPoint {
  date: string;
  totalVolume: number;
  workoutName: string;
}

export interface VolumeTrendResponse {
  volumeTrend: VolumeTrendPoint[];
}

export interface StrengthTimelinePoint {
  date: string;
  maxWeight: number;
  bestReps: number;
  estimated1RM: number;
  workoutName: string;
}

export interface ExerciseProgressResponse {
  exerciseId: string;
  strengthTimeline: StrengthTimelinePoint[];
}

export interface PersonalRecordsResponse {
  count: number;
  personalRecords: PersonalRecord[];
}

export interface PreviousPerformanceResponse {
  previousPerformance: PreviousPerformance | null;
}

export async function fetchProgressSummaryApi(): Promise<ProgressSummaryResponse> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/summary`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch progress summary');
  return data;
}

export async function fetchPersonalRecordsApi(): Promise<PersonalRecordsResponse> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/prs`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch personal records');
  return data;
}

export async function fetchPreviousPerformanceApi(exerciseId: string): Promise<PreviousPerformanceResponse> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/previous/${exerciseId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch previous performance');
  return data;
}

export async function fetchExerciseProgressApi(exerciseId: string): Promise<ExerciseProgressResponse> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/exercise/${exerciseId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch exercise progress');
  return data;
}

export async function fetchVolumeTrendApi(): Promise<VolumeTrendResponse> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/volume-trend`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch volume trend');
  return data;
}

// ===== Goals API =====
export interface GoalsResponse {
  count: number;
  goals: Goal[];
  context: {
    latestWeight: number | null;
    weightUnit: string;
    totalWorkouts: number;
  };
}

export async function fetchGoalsApi(): Promise<GoalsResponse> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/goals`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch goals');
  return data;
}

export async function createGoalApi(goalData: Partial<Goal>): Promise<{ message: string; goal: Goal }> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/goals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(goalData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create goal');
  return data;
}

export async function updateGoalApi(id: string, goalData: Partial<Goal>): Promise<{ message: string; goal: Goal }> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/goals/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(goalData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update goal');
  return data;
}

export async function deleteGoalApi(id: string): Promise<{ message: string; id: string }> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/goals/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete goal');
  return data;
}

export async function updateGoalStatusApi(id: string, status: GoalStatus): Promise<{ message: string; goal: Goal }> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/goals/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update goal status');
  return data;
}

// ===== Body Weight Logging API =====
export interface WeightLogsResponse {
  count: number;
  logs: WeightLog[];
  latestWeight: number | null;
  unit: 'kg' | 'lbs';
  weightChange: number;
}

export async function fetchWeightLogsApi(): Promise<WeightLogsResponse> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/weight`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch weight logs');
  return data;
}

export async function logWeightApi(payload: {
  weight: number;
  unit?: 'kg' | 'lbs';
  date?: string;
  notes?: string;
}): Promise<{ message: string; log: WeightLog; currentWeight: number; unit: 'kg' | 'lbs' }> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/weight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to log weight');
  return data;
}

export async function deleteWeightLogApi(id: string): Promise<{ message: string; id: string; currentWeight: number | null }> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/progress/weight/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete weight log');
  return data;
}
