import { WeeklySchedule } from '../types';
import { getStoredToken } from './authApi';
import { API_BASE_URL } from './config';

export interface WorkoutPlanResponse {
  plan: {
    _id: string;
    userId: string;
    weeklyPlan: WeeklySchedule;
    createdAt?: string;
    updatedAt?: string;
  };
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

export async function updateWorkoutPlanApi(planId: string, weeklyPlan: WeeklySchedule): Promise<WorkoutPlanResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/workout-plans/${planId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ weeklyPlan }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update workout plan');
  }

  return data;
}

export async function createWorkoutPlanApi(weeklyPlan: WeeklySchedule): Promise<WorkoutPlanResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/workout-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ weeklyPlan }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create workout plan');
  }

  return data;
}
