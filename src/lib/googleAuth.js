export const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '333193552236-5sgea3ut93896koqvums6jjl6ildej90.apps.googleusercontent.com'
).trim();

export const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID) &&
  GOOGLE_CLIENT_ID !== 'your-google-oauth-client-id';