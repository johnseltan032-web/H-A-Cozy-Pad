import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/api';

const EMPTY = { name: '', email: '', subject: '', message: '', website: '' }; // "website" = honeypot

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Enter your name.';
  if (!v.email.trim()) e.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address, like name@example.com.';
  if (!v.subject.trim()) e.subject = 'Enter a subject.';
  if (!v.message.trim()) e.message = 'Enter your message.';
  else if (v.message.trim().length < 10) e.message = 'Write at least 10 characters so we can help you.';
  return e;
}

// Defined at module level so React keeps the same component between renders
// (defining it inside ContactModal remounts the inputs on every keystroke).
function Field({ id, label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label} <span aria-hidden="true" className="text-red-600">*</span>
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ContactModal({ isOpen, onClose }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | failed
  const firstFieldRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset when reopened, focus first field, close on Escape
  useEffect(() => {
    if (!isOpen) return;
    setValues(EMPTY);
    setErrors({});
    setStatus('idle');
    setTimeout(() => firstFieldRef.current?.focus(), 0);

    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return; // block submission until all required fields are complete

    setStatus('sending');
    try {
      const res = await fetch(`${API_BASE_URL}/contact_submit.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          message: values.message.trim(),
          website: values.website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (data.errors) setErrors(data.errors);
        setStatus('failed');
        return;
      }
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };

  const inputClass = (field) =>
    `w-full rounded-xl border px-4 py-3 text-base outline-none focus:border-black ${
      errors[field] ? 'border-red-500' : 'border-neutral-300'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
        className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-xl"
      >
        <button
          onClick={onClose}
          aria-label="Close contact form"
          className="absolute right-4 top-4 h-8 w-8 rounded-full bg-transparent border-0 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 cursor-pointer"
        >
          ×
        </button>

        {status === 'sent' ? (
          <div className="py-6 text-center">
            <h2 id="contact-title" className="text-2xl font-bold mb-3">Message sent</h2>
            <p className="text-neutral-600 mb-6">
              Thanks for reaching out. The owner will reply to {values.email.trim()}.
            </p>
            <button
              onClick={onClose}
              className="px-10 py-3 text-lg font-medium bg-black text-white rounded-full hover:bg-neutral-800 cursor-pointer border-0"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div>
              <h2 id="contact-title" className="text-2xl font-bold">Contact us</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Send your question or concern and the owner will get back to you by email.
              </p>
            </div>

            <Field id="name" label="Name" error={errors.name}>
              <input
                ref={firstFieldRef}
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={handleChange}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className={inputClass('name')}
              />
            </Field>

            <Field id="email" label="Email" error={errors.email}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={handleChange}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={inputClass('email')}
              />
            </Field>

            <Field id="subject" label="Subject" error={errors.subject}>
              <input
                id="subject"
                name="subject"
                type="text"
                maxLength={150}
                value={values.subject}
                onChange={handleChange}
                aria-invalid={!!errors.subject}
                aria-describedby={errors.subject ? 'subject-error' : undefined}
                className={inputClass('subject')}
              />
            </Field>

            <Field id="message" label="Message" error={errors.message}>
              <textarea
                id="message"
                name="message"
                rows={5}
                maxLength={2000}
                value={values.message}
                onChange={handleChange}
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? 'message-error' : undefined}
                className={`${inputClass('message')} h-[200px] resize-none overflow-y-auto`}
              />
            </Field>

            {/* Honeypot: hidden from people, bots tend to fill it */}
            <input
              type="text"
              name="website"
              value={values.website}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            {status === 'failed' && (
              <p role="alert" className="text-sm text-red-600">
                We couldn't send your message. Check your connection and try again.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="mt-2 px-10 py-3 text-lg font-medium bg-black text-white rounded-full hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-0"
            >
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}