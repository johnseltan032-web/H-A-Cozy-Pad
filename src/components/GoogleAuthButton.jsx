import { GoogleLogin } from '@react-oauth/google';

export default function GoogleAuthButton({ onSuccess, onError }) {
  return (
    <div className="relative mx-auto h-10 w-10" aria-label="Continue with Google">
      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.61 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.29 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.09-.4-4.5H24v9h12.65c-.55 2.96-2.22 5.47-4.74 7.16l7.67 5.95C44.05 37.92 46.5 31.7 46.5 24.5Z" />
          <path fill="#FBBC05" d="M10.54 28.59A14.47 14.47 0 0 1 9.5 24c0-1.6.37-3.15 1.04-4.59l-7.98-6.19A24 24 0 0 0 0 24c0 3.89.93 7.58 2.56 10.78l7.98-6.19Z" />
          <path fill="#34A853" d="M24 48c6.47 0 11.9-2.13 15.88-5.89l-7.67-5.95c-2.13 1.43-4.84 2.27-8.21 2.27-6.26 0-11.57-3.79-13.46-9.12l-7.98 6.19C6.51 42.62 14.61 48 24 48Z" />
        </svg>
      </span>
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
