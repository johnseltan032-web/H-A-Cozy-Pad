export const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
).trim();

export const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID) &&
  GOOGLE_CLIENT_ID !== 'your-google-oauth-client-id';