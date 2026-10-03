import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../lib/api';
import GoogleAuthButton from './GoogleAuthButton';

function parseJsonResponse(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

export default function RegisterModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNum: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleClose = useCallback(() => {
    setRegistrationSuccess(false);
    setError('');
    onClose();
  }, [onClose]);

  // Lock body scroll and register escape key (from register.js)
  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add('overflow-hidden');
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const completeRegistration = (user) => {
    if (!user) {
      throw new Error('Account was created, but sign-in could not be confirmed. Please log in.');
    }

    window.dispatchEvent(new CustomEvent('auth-changed', {
      detail: { loggedIn: true, user, suppressWelcomeToast: true },
    }));
    setRegistrationSuccess(true);
  };

  const signInRegisteredUser = async () => {
    const response = await fetch(`${API_BASE_URL}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        identifier: formData.email,
        password: formData.password,
      }),
    });
    const responseText = await response.text();
    const data = parseJsonResponse(responseText);

    return response.ok && data?.success && data.user ? data.user : null;
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/register.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fullName: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            contactNum: formData.contactNum,
            password: formData.password,
          }),
        });
      } catch (registrationError) {
        const user = await signInRegisteredUser();
        if (user) {
          completeRegistration(user);
          return;
        }
        throw registrationError;
      }

      const responseText = await res.text();
      const data = parseJsonResponse(responseText);

      if (!res.ok || !data?.success || !data.user) {
        const user = await signInRegisteredUser();
        if (user) {
          completeRegistration(user);
          return;
        }

        if (res.status === 409) {
          setError('An account with this email already exists. Log in with its password instead.');
          return;
        }

        setError(data?.error || 'Unable to confirm registration or sign in. Please try again.');
        return;
      }

      completeRegistration(data.user);
    } catch (registrationError) {
      setError(registrationError.message || 'Could not reach the server. Is XAMPP running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      className="auth-modal fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-[1px] px-4"
    >
      <div className={`relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[25px] bg-white shadow-xl ${registrationSuccess ? 'max-w-md p-5 text-center sm:p-7' : 'max-w-[520px] px-5 py-7 sm:px-12 sm:py-10'}`}>
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-5 right-6 text-2xl text-neutral-400 hover:text-black leading-none bg-transparent border-0 cursor-pointer"
        >
          &times;
        </button>
        {registrationSuccess ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">Account registered successfully</h2>
            <p className="mt-2 text-sm text-neutral-500">You are now logged in and can continue using your account.</p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Continue
            </button>
          </>
        ) : (
          <>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8">Register your account</h2>

        <GoogleAuthButton
            onSuccess={async (credentialResponse) => {
              setError('');
              setIsSubmitting(true);

              try {
                const res = await fetch(`${API_BASE_URL}/google_login.php`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ credential: credentialResponse.credential }),
                });
                const data = await res.json();

                        if (!res.ok || !data.success) throw new Error(data.error || 'Google registration failed.');

                        completeRegistration(data.user);
              } catch (registrationError) {
                setError(registrationError.message || 'Google registration failed.');
              } finally {
                setIsSubmitting(false);
              }
            }}
            onError={() => setError('Google registration failed. Please try again.')}
        />
        <div className="my-6 flex items-center gap-4 text-sm font-medium text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          <span>OR</span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold">Legal Name</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col border border-neutral-300 rounded-xl px-5 py-2.5 focus-within:border-black transition-colors">
                <span className="text-xs text-neutral-400">First name</span>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full border-none outline-none bg-transparent text-lg"
                  required
                />
              </label>
              <label className="flex flex-col border border-neutral-300 rounded-xl px-5 py-2.5 focus-within:border-black transition-colors">
                <span className="text-xs text-neutral-400">Last name</span>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full border-none outline-none bg-transparent text-lg"
                  required
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold">Contact Number</span>
            <label className="flex flex-col justify-center gap-1 border border-neutral-300 rounded-xl px-5 py-3.5 min-h-[62px] focus-within:border-black transition-colors cursor-text">
              <span className="text-xs text-neutral-400 leading-none">11-digit mobile number</span>
              <input
                type="tel"
                name="contactNum"
                value={formData.contactNum}
                onChange={handleChange}
                placeholder="09171234567"
                maxLength={11}
                pattern="[0-9]{11}"
                className="w-full border-none outline-none bg-transparent text-lg leading-none p-0 placeholder:text-neutral-400"
                required
              />
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold">Email Address</span>
            <label className="flex flex-col justify-center gap-1 border border-neutral-300 rounded-xl px-5 py-3.5 min-h-[62px] focus-within:border-black transition-colors cursor-text">
              <span className="text-xs text-neutral-400 leading-none">Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="juan.delacruz@example.com"
                className="w-full border-none outline-none bg-transparent text-lg leading-none p-0 placeholder:text-neutral-400"
                required
              />
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold">Password</span>
            <label className="flex flex-col justify-center gap-1 border border-neutral-300 rounded-xl px-5 py-3.5 min-h-[62px] focus-within:border-black transition-colors cursor-text">
              <span className="text-xs text-neutral-400 leading-none">At least 8 characters</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                className="w-full border-none outline-none bg-transparent text-lg leading-none p-0"
                required
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <p className="text-sm text-neutral-500 leading-relaxed">
            By selecting Agree and register, I agree to the{' '}
            <a href="#" className="underline text-black">Terms of Service</a>,{' '}
            <a href="#" className="underline text-black">Payments Terms of Service</a>, and{' '}
            <a href="#" className="underline text-black">Nondiscrimination Policy</a>, and acknowledge the{' '}
            <a href="#" className="underline text-black">Privacy Policy</a>.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full py-4 text-xl sm:text-2xl font-bold text-white bg-[#df766c] border border-[#ca635a] rounded-full hover:bg-[#bd584f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bd584f] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Registering...' : 'Agree & Register'}
          </button>
        </form>
          </>
        )}
      </div>
    </div>
  );
}