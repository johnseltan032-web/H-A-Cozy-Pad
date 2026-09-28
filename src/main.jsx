import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './style/home.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const isGoogleConfigured = Boolean(CLIENT_ID) && CLIENT_ID !== 'your-google-oauth-client-id';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isGoogleConfigured ? (
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
