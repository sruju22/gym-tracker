function getBaseUrl(): string {
  const envUrl =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl += '/api';
    }
    return cleanUrl;
  }

  // If deployed on Vercel or any public domain without an explicit VITE_API_BASE_URL
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname.includes('vercel.app')
  ) {
    return 'https://gym-tracker-backend.onrender.com/api';
  }

  // Local or LAN development fallback
  const host =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'localhost';

  return `http://${host}:5001/api`;
}

export const API_BASE_URL = getBaseUrl();

