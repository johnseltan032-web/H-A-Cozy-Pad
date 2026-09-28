import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';

const app = express();
const port = Number(process.env.PORT || process.env.GOOGLE_CALENDAR_PORT || 3001);
const frontendOrigin = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/auth/callback`;

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.SECRET_ID,
  redirectUri
);

let credentials = null;

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

app.get('/auth/url', (_request, response) => {
  if (!process.env.CLIENT_ID || !process.env.SECRET_ID) {
    return response.status(500).json({ error: 'Google OAuth credentials are not configured' });
  }

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  return response.json({ url: authorizationUrl });
});

app.get('/auth/callback', async (request, response) => {
  try {
    const { tokens } = await oauth2Client.getToken(request.query.code);
    credentials = tokens;
    oauth2Client.setCredentials(credentials);
    response.redirect(`${frontendOrigin}/?connected=1`);
  } catch (error) {
    console.error('Google OAuth error:', error.message);
    response.status(500).send('Google Calendar authorization failed.');
  }
});

app.get('/auth/status', (_request, response) => {
  response.json({ connected: Boolean(credentials?.access_token || credentials?.refresh_token) });
});

app.get('/events', async (request, response) => {
  if (!credentials) return response.status(401).json({ error: 'Connect Google Calendar first' });

  try {
    oauth2Client.setCredentials(credentials);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const result = await calendar.events.list({
      calendarId: 'primary',
      timeMin: request.query.timeMin,
      timeMax: request.query.timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    credentials = { ...credentials, ...oauth2Client.credentials };
    response.json({ events: result.data.items || [] });
  } catch (error) {
    console.error('Google Calendar events error:', error.message);
    response.status(500).json({ error: 'Unable to load Google Calendar events' });
  }
});

app.post('/events', async (request, response) => {
  if (!credentials) return response.status(401).json({ error: 'Connect Google Calendar first' });

  const { summary, description, start, end } = request.body;
  if (!summary || !start || !end) {
    return response.status(400).json({ error: 'Summary, start, and end are required' });
  }

  try {
    oauth2Client.setCredentials(credentials);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description: description || '',
        start: { dateTime: start, timeZone: 'Asia/Manila' },
        end: { dateTime: end, timeZone: 'Asia/Manila' },
      },
    });

    credentials = { ...credentials, ...oauth2Client.credentials };
    response.status(201).json({ event: result.data });
  } catch (error) {
    console.error('Google Calendar create event error:', error.message);
    response.status(500).json({ error: 'Unable to create Google Calendar event' });
  }
});

app.listen(port, () => {
  console.log(`Google Calendar server running at http://localhost:${port}`);
});
