import { GoogleLogin } from '@react-oauth/google';
import { isGoogleConfigured } from '../lib/googleAuth';

export default function GoogleAuthButton({ onSuccess, onError, disabled = false }) {
  const isConfigured = !disabled && isGoogleConfigured;

  if (!isConfigured) {
    return (
      <div className="mx-auto flex h-12 w-full max-w-[280px] items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-sm font-medium text-neutral-500">
        Google sign-in unavailable
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-10 w-10" aria-label="Continue with Google">
      <GoogleLogin
        type="icon"
        shape="circle"
        size="large"
        onSuccess={onSuccess}
        onError={onError}
      />
    </div>
  );
}
