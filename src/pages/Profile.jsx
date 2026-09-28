import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer_Lite';

const settingsSections = [
  { label: 'Personal information', icon: 'person' },
  { label: 'Login & security', icon: 'shield' },
  { label: 'Privacy', icon: 'hand' },
  { label: 'Notifications', icon: 'bell' },
  { label: 'Taxes', icon: 'calculator' },
  { label: 'Payments', icon: 'card', badge: 'New' },
  { label: 'Languages & currency', icon: 'globe' },
  { label: 'Booking permissions', icon: 'key', badge: 'New' },
  { label: 'Travel for work', icon: 'work' },
];

function SettingsIcon({ name }) {
  const paths = {
    person: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.5-4 3-6 7-6s6.5 2 7 6" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.2 8.4-8 10-4.8-1.6-8-5-8-10V6l8-3Z" /><path d="M12 7v10" /></>,
    hand: <><path d="M7 11V6a1.5 1.5 0 0 1 3 0v4" /><path d="M10 9V4a1.5 1.5 0 0 1 3 0v6" /><path d="M13 9V5a1.5 1.5 0 0 1 3 0v7" /><path d="M16 10V8a1.5 1.5 0 0 1 3 0v6c0 4-2.5 7-6.5 7H11c-2 0-3.2-.8-4.3-2.4L4 14a1.5 1.5 0 0 1 2.5-1.7L9 15" /></>,
    bell: <><path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4L6 17Z" /><path d="M10 20h4" /></>,
    calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h1m3 0h1m3 0h1M8 15h1m3 0h1m3 0h1M8 18h1m3 0h1m3 0h1" /></>,
    card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z" /></>,
    key: <><circle cx="8" cy="15" r="3" /><path d="m10.5 12.5 7-7 2 2-1.5 1.5 1.5 1.5-2 2-1.5-1.5-2 2" /></>,
    work: <><path d="M3 7h18v14H3zM8 7V4h8v3M3 12h18M10 12v2h4v-2" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function getDisplayName(user) {
  return user?.name || user?.fullName || 'Guest';
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return 'Not provided';

  const [localPart, domain] = email.split('@');
  return `${'*'.repeat(Math.min(8, localPart.length))}${localPart.slice(4)}@${domain}`;
}

export default function Profile({ user, isMenuOpen, setIsMenuOpen, onLogout, onOpenSignIn, onOpenRegister }) {
  const [activeSection, setActiveSection] = useState('Personal information');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [account, setAccount] = useState(user);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    fetch(`${API_BASE_URL}/profile.php`, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load account');
        return response.json();
      })
      .then((data) => setAccount(data.user))
      .catch(() => setAccount(user))
      .finally(() => setIsLoading(false));
  }, [user]);

  const displayName = getDisplayName(account);
  const email = maskEmail(account?.email);
  const phone = account?.contactNum || 'Not provided';

  const saveField = async (field, value) => {
    setIsSaving(true);
    setSaveError('');

    try {
      const response = await fetch(`${API_BASE_URL}/profile.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('The server returned an invalid account response');
      }
      if (!response.ok) throw new Error(data.error || 'Unable to save changes');

      if (data.user) {
        setAccount(data.user);
        window.dispatchEvent(new CustomEvent('auth-changed', {
          detail: { loggedIn: true, user: data.user },
        }));
      }
      setEditingField(null);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`profile-settings min-h-screen bg-white text-[#111827] font-sans${isDetailOpen ? ' profile-settings--detail-open' : ''}`}>
      <Header
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        user={user}
        onLogout={onLogout}
        onOpenSignIn={onOpenSignIn}
        onOpenRegister={onOpenRegister}
      />

      <main className="mx-auto flex max-w-[1300px] flex-col gap-8 px-6 py-8 md:flex-row md:gap-14 md:px-10 lg:px-12 lg:py-10">
        <aside className="profile-settings__list w-full shrink-0 md:w-[300px] lg:w-[340px]">
          <h1 className="mb-7 text-2xl font-semibold tracking-tight md:text-[28px]">Account settings</h1>
          <nav aria-label="Account settings">
            {settingsSections.map((section) => {
              const isActive = activeSection === section.label;
              return (
                <button
                  key={section.label}
                  type="button"
                  onClick={() => {
                    setActiveSection(section.label);
                    setIsDetailOpen(true);
                  }}
                  className={`profile-settings__row flex w-full items-center gap-4 rounded-2xl border-0 px-4 py-4 text-left text-base transition-colors cursor-pointer ${
                    isActive ? 'bg-neutral-100 font-semibold' : 'bg-transparent font-normal hover:bg-neutral-50'
                  }`}
                >
                  <span className="h-6 w-6 shrink-0 text-neutral-900"><SettingsIcon name={section.icon} /></span>
                  <span className="flex-1">{section.label}</span>
                  {section.badge && <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-600">{section.badge}</span>}
                  <svg className="profile-settings__chevron h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="profile-settings__detail min-w-0 max-w-[695px] flex-1">
          <button type="button" className="profile-settings__detail-back" onClick={() => setIsDetailOpen(false)} aria-label="Back to account settings">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <h2 className="mb-7 text-2xl font-semibold tracking-tight md:text-[28px]">{activeSection}</h2>
          {activeSection === 'Personal information' ? (
            <div className="divide-y divide-neutral-200 border-t border-neutral-200">
              <ProfileRow label="Legal name" value={isLoading ? 'Loading...' : displayName} editValue={account?.fullName || ''} field="fullName" editingField={editingField} setEditingField={setEditingField} onSave={saveField} isSaving={isSaving} />
              <ProfileRow label="Email address" value={isLoading ? 'Loading...' : email} editValue={account?.email || ''} field="email" type="email" editingField={editingField} setEditingField={setEditingField} onSave={saveField} isSaving={isSaving} />
              <ProfileRow label="Password" value="********" editValue="" field="password" type="password" placeholder="Enter a new password" editingField={editingField} setEditingField={setEditingField} onSave={saveField} isSaving={isSaving} />
              <ProfileRow
                label="Phone number"
                value={isLoading ? 'Loading...' : phone}
                editValue={account?.contactNum || ''}
                field="contactNum"
                type="tel"
                description="Contact number for confirmed guests and H&A Cozy Pad to get in touch. You can add other numbers and choose how they’re used."
                editingField={editingField}
                setEditingField={setEditingField}
                onSave={saveField}
                isSaving={isSaving}
              />
            </div>
          ) : (
            <div className="border-t border-neutral-200 py-8 text-base text-neutral-600">
              <p className="m-0">This account setting is not available yet.</p>
            </div>
          )}
          {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ProfileRow({ label, value, editValue, field, type = 'text', placeholder, description, editingField, setEditingField, onSave, isSaving }) {
  const [draftValue, setDraftValue] = useState(editValue);
  const isEditing = editingField === field;

  return (
    <div className="grid grid-cols-[1fr_auto] gap-5 py-6 md:py-7">
      <div className="min-w-0">
        <h3 className="m-0 text-base font-semibold text-[#111827]">{label}</h3>
        {isEditing ? (
          <input
            type={type}
            value={draftValue}
            placeholder={placeholder}
            onChange={(event) => setDraftValue(event.target.value)}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-[15px] outline-none focus:border-black"
          />
        ) : (
          <p className="mt-1 break-words text-[15px] text-neutral-500">{value}</p>
        )}
        {description && <p className="mt-1 max-w-[620px] text-[15px] leading-5 text-neutral-500">{description}</p>}
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => {
          if (isEditing) onSave(field, draftValue);
          else {
            setDraftValue(editValue);
            setEditingField(field);
          }
        }}
        className="self-start border-0 bg-transparent p-0 text-sm font-semibold text-[#111827] underline underline-offset-2 hover:text-neutral-500 cursor-pointer disabled:opacity-50"
      >
        {isEditing ? (isSaving ? 'Saving...' : 'Save') : 'Edit'}
      </button>
    </div>
  );
}
