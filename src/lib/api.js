export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const GOOGLE_CALENDAR_URL =
  import.meta.env.VITE_GOOGLE_CALENDAR_URL || 'http://localhost:3001';

export const RAILWAY_API_ORIGIN =
  import.meta.env.RAILWAY_API_ORIGIN || 'https://h-a-cozy-pad-production.up.railway.app';

export const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();