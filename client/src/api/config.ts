function getBaseUrl(): string {
  const rawUrl =
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.hostname
      ? `http://${window.location.hostname}:5001/api`
      : 'http://192.168.1.5:5001/api');

  let cleanUrl = rawUrl.trim().replace(/\/+$/, '');
  if (!cleanUrl.endsWith('/api')) {
    cleanUrl += '/api';
  }
  return cleanUrl;
}

export const API_BASE_URL = getBaseUrl();
