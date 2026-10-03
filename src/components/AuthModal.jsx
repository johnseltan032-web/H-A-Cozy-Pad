import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/api';
import GoogleAuthButton from './GoogleAuthButton';
import { isGoogleConfigured } from '../lib/googleAuth';

export default function AuthModal({
  isOpen,
  onClose,
  onSwitchToRegister,
  onLoginSuccess,
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasGoogleClient = isGoogleConfigured;

  // Lock body scroll and register escape key
  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add('overflow-hidden');

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          data.error || 'Invalid email or password. Please try again.'
        );
        return;
      }

      // Tell App.jsx that login was successful.
      // App.jsx will update the user and redirect to "/".
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

      // Keep the auth state synchronized with the rest of the app.
      window.dispatchEvent(
        new CustomEvent('auth-changed', {
          detail: {
            loggedIn: true,
            user: data.user,
          },
        })
      );

      // Close the modal.
      onClose();

    } catch (error) {
      console.error('Login failed:', error);
      setError('Could not reach the server. Is XAMPP running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/google_login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google login failed.');
      }

      // Update App.jsx state
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

      // Update auth state for other components
      window.dispatchEvent(
        new CustomEvent('auth-changed', {
          detail: {
            loggedIn: true,
            user: data.user,
          },
        })
      );

      onClose();

    } catch (loginError) {
      console.error('Google login failed:', loginError);

      setError(
        loginError.message || 'Google login failed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="auth-modal fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-[1px] px-4"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-[520px] overflow-y-auto rounded-[25px] bg-white px-5 py-7 shadow-xl relative sm:px-12 sm:py-10">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-6 text-2xl text-neutral-400 hover:text-black leading-none bg-transparent border-0 cursor-pointer"
        >
          &times;
        </button>

        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8">
          Log in or Sign up
        </h2>

        <GoogleAuthButton
          disabled={!hasGoogleClient}
          onSuccess={handleGoogleSuccess}
          onError={() =>
            setError(
              'Google login failed. Check the configured authorized origin.'
            )
          }
        />

        <div className="my-6 flex items-center gap-4 text-sm font-medium text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          <span>OR</span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
        >
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email Address"
            className="w-full border border-neutral-300 rounded-full px-6 py-4 text-lg outline-none focus:border-black transition-colors"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-neutral-300 rounded-full px-6 py-4 text-lg outline-none focus:border-black transition-colors"
            required
          />

          {error && (
            <p className="text-sm text-red-600 -mt-2">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();

              if (onSwitchToRegister) {
                onSwitchToRegister();
              }
            }}
            className="text-base font-medium underline text-black w-fit bg-transparent border-0 cursor-pointer text-left p-0"
          >
            Register Account
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full py-4 text-xl sm:text-2xl font-bold text-white bg-[#df766c] border border-[#ca635a] rounded-full hover:bg-[#bd584f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bd584f] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
