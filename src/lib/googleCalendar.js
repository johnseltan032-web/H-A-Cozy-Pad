const CALENDAR_API_URL = import.meta.env.VITE_GOOGLE_CALENDAR_URL || 'http://localhost:3001';

export async function startGoogleCalendarAuthorization() {
  const response = await fetch(`${CALENDAR_API_URL}/auth/url`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Unable to start Google Calendar authorization');
  }

  window.location.assign(data.url);
}
