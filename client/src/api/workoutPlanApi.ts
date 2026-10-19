import { WeeklySchedule, WorkoutTemplate } from '../types';
import { getStoredToken } from './authApi';
import { API_BASE_URL } from './config';

export interface WorkoutPlanResponse {
  plan: {
    _id: string;
    userId: string;
    weeklyPlan: WeeklySchedule;
    templateId?: string;
    templateName?: string;
    fitnessGoal?: string;
    trainingDaysPerWeek?: number;
    progressionRule?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface TemplatesResponse {
  templates: WorkoutTemplate[];
  recommendedTemplateId: string | null;
}

export async function fetchWorkoutPlan(): Promise<WorkoutPlanResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/workout-plans`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch workout plan');
  }

  return data;
}

export async function updateWorkoutPlanApi(
  planId: string,
  payload: WeeklySchedule | {
    weeklyPlan: WeeklySchedule;
    templateId?: string;
    templateName?: string;
    fitnessGoal?: string;
    trainingDaysPerWeek?: number;
    progressionRule?: string;
  }
): Promise<WorkoutPlanResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const body = 'weeklyPlan' in payload ? payload : { weeklyPlan: payload };

  const response = await fetch(`${API_BASE_URL}/workout-plans/${planId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update workout plan');
  }

  return data;
}

export async function createWorkoutPlanApi(
  payload: WeeklySchedule | {
    weeklyPlan: WeeklySchedule;
    templateId?: string;
    templateName?: string;
    fitnessGoal?: string;
    trainingDaysPerWeek?: number;
    progressionRule?: string;
  }
): Promise<WorkoutPlanResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const body = 'weeklyPlan' in payload ? payload : { weeklyPlan: payload };

  const response = await fetch(`${API_BASE_URL}/workout-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create workout plan');
  }

  return data;
}

export async function fetchWorkoutTemplatesApi(goal?: string, days?: number): Promise<TemplatesResponse> {
  const token = getStoredToken();
  const queryParams = new URLSearchParams();
  if (goal) queryParams.set('goal', goal);
  if (days) queryParams.set('days', days.toString());

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/workout-plans/templates?${queryParams.toString()}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch templates');
  }

  return data;
}

export async function applyWorkoutTemplateApi(templateId: string): Promise<WorkoutPlanResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/workout-plans/apply-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ templateId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to apply template');
  }

  return data;
}
