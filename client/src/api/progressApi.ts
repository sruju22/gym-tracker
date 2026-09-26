import { getStoredToken } from './authApi';
import { PersonalRecord, PreviousPerformance } from '../types';
import { API_BASE_URL } from './config';

export interface ProgressSummaryResponse {
  totalVolume: number;
  totalSets: number;
  totalWorkouts: number;
  exerciseFrequency: Array<{ exerciseName: string; count: number }>;
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
