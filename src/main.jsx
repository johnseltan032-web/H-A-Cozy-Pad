import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './style/home.css'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID, isGoogleConfigured } from './lib/googleAuth';

createRoot(document.getElementById('root')).render(
  isGoogleConfigured ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  ) : (
    <App />
  ),
)
