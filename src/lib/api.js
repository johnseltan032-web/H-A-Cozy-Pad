const defaultApiHost =
  typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? `http://${defaultApiHost}/H-A-Cozy-Pad/api`
    : '/api');
