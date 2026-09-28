import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing a token.');
      return;
    }

    fetch(`${API_BASE_URL}/verify_email.php?token=${encodeURIComponent(token)}`, {
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to verify email');
        setStatus('success');
        setMessage(data.message || 'Email verified successfully.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.message);
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 font-sans">
      <div className="max-w-sm text-center">
        <Link to="/" className="text-2xl font-semibold tracking-tight text-black no-underline">
          H&A Cozy Pad
        </Link>

        <div className="mt-8">
          {status === 'verifying' && <p className="text-base text-neutral-600">Verifying your email...</p>}

          {status === 'success' && (
            <>
              <p className="text-lg font-semibold text-green-700">Email verified</p>
              <p className="mt-2 text-[15px] text-neutral-500">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-lg font-semibold text-red-600">Verification failed</p>
              <p className="mt-2 text-[15px] text-neutral-500">{message}</p>
            </>
          )}

          <Link
            to="/profile"
            className="mt-6 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-neutral-700"
          >
            Go to account settings
          </Link>
        </div>
      </div>
    </div>
  );
}