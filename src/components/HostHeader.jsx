import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api';
import NotificationBell from './NotificationBell';
import AdminBookingModal from './AdminBookingModal';

export default function HostHeader({
  activeNav = 'Today',
  onLogout,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canViewActivityLog, setCanViewActivityLog] = useState(false);
  const [canViewStatistics, setCanViewStatistics] = useState(false);

  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const logoutTimer = useRef(null);
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', to: '/host/overview', key: 'Dashboard' },
    { label: 'Calendar', to: '/host/calendar', key: 'Calendar' },
    { label: 'Reservations', to: '/host/reservations', key: 'Reservations' },
    { label: 'Listings', to: '/host/listings', key: 'Listings' },
    ...(canViewStatistics
      ? [{ label: 'Statistics', to: '/host/statistics', key: 'Statistics' }]
      : []),
  ];

  useEffect(() => {
    fetch(`${API_BASE_URL}/check_auth.php`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          return;
        }

        setIsAdmin(['admin', 'super_admin'].includes(data.user?.role));
        setCanViewActivityLog(data.user?.role === 'super_admin');
        setCanViewStatistics(Boolean(data.user?.can_view_statistics) || data.user?.role === 'super_admin');
      })
      .catch(() => {
        setIsAdmin(false);
        setCanViewStatistics(false);
        setCanViewActivityLog(false);
      });
  }, []);

  useEffect(() => () => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logout.php`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Unable to log out.');
      window.dispatchEvent(new CustomEvent('app-status-toast', {
        detail: { message: 'Logged out successfully.' },
      }));
    } catch (error) {
      console.error('Logout failed:', error);
      window.dispatchEvent(new CustomEvent('app-status-toast', {
        detail: { message: 'Could not confirm logout. Please try again.' },
      }));
    } finally {
      onLogout?.();
      setIsMenuOpen(false);
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: { loggedIn: false } }));
      logoutTimer.current = setTimeout(() => navigate('/'), 1500);
    }
  };

  return (
    <header className="host-header grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 md:px-10 md:py-6 lg:px-[52px] bg-[#fdfdfd] border-b border-neutral-200 relative">
      {/* Logo */}
      <Link
        to="/"
        className="host-header__brand text-2xl lg:text-3xl font-bold text-black no-underline justify-self-start"
      >
        H&A Cozy Pad
      </Link>

      {/* Navigation */}
      <nav className="hidden md:block justify-self-center">
        <ul className="flex items-center gap-7 list-none m-0 p-0">
          {navItems.map((item) => (
            <li key={item.key}>
              <Link
                to={item.to}
                aria-current={activeNav === item.key ? 'page' : undefined}
                className={`host-header__nav-link${activeNav === item.key ? ' is-active' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Right side */}
      <div className="host-header__actions flex items-center gap-4 justify-self-end">
        <button
          type="button"
          aria-label="Create a new booking"
          onClick={() => setIsBookingModalOpen(true)}
          className="host-header__new-listing inline-flex items-center gap-2 rounded-full bg-[#df766c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#bd584f]"
        >
          <span className="text-lg leading-none">+</span>
          <span>New Booking</span>
        </button>

        <NotificationBell />

        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-neutral-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </div>

        {/* Menu button */}
        <button
          ref={buttonRef}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Menu"
          className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] cursor-pointer bg-transparent border-0"
        >
          <span className="block w-6 h-[2px] bg-black"></span>
          <span className="block w-6 h-[2px] bg-black"></span>
        </button>
      </div>

      {/* Dropdown menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="host-header-menu absolute left-auto right-5 top-[70px] w-[280px] max-md:w-[240px] bg-white rounded-2xl max-md:rounded-xl shadow-xl border border-neutral-100 py-3 max-md:py-2 z-[2100]"
        >
          {/* Switch to guest */}
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 max-md:gap-2 px-5 max-md:px-4 py-3 max-md:py-2 text-base max-md:text-sm font-medium hover:bg-neutral-100 text-black no-underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 max-md:w-4 max-md:h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7" />
              <path d="M9 22V12h6v10" />
            </svg>
            Switch to guest
          </Link>

          {/* Profile */}

          <Link
            to="/profile"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 max-md:gap-2 px-5 max-md:px-4 py-3 max-md:py-2 text-base max-md:text-sm font-medium hover:bg-neutral-100 text-black no-underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 max-md:w-4 max-md:h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            Profile
          </Link>

<Link
            to="/host/inbox"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 max-md:gap-2 px-5 max-md:px-4 py-3 max-md:py-2 text-base max-md:text-sm font-medium hover:bg-neutral-100 text-black no-underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 max-md:w-4 max-md:h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <polyline points="3 7 12 13 21 7" />
            </svg>
            Inbox
          </Link>

          <Link
            to="/host/settings"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 max-md:gap-2 px-5 max-md:px-4 py-3 max-md:py-2 text-base max-md:text-sm font-medium hover:bg-neutral-100 text-black no-underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 max-md:w-4 max-md:h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.96l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.42 1.17V21a2 2 0 1 1-4 0v-.08A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1-.6 1.8 1.8 0 0 0-1.17.42l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.17-.42H2.7a2 2 0 1 1 0-4h.08A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0 .6-1 1.8 1.8 0 0 0-.42-1.17l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .42-1.17V2.7a2 2 0 1 1 4 0v.08A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1 .6 1.8 1.8 0 0 0 1.17-.42l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 .6 1 1.8 1.8 0 0 0 1.17.42h.08a2 2 0 1 1 0 4h-.08A1.8 1.8 0 0 0 19.4 15Z" />
            </svg>
            Settings
          </Link>

          <hr className="my-2 border-neutral-200" />

          {/* Help Center Management */}
          <Link
            to="/host/faqs"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 max-md:gap-2 px-5 max-md:px-4 py-3 max-md:py-2 text-base max-md:text-sm font-medium hover:bg-neutral-100 text-black no-underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 max-md:w-4 max-md:h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 2-3 4" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Help Center Management
          </Link>

          {isAdmin && (<Link
            to="/host/users"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 max-md:gap-2 px-5 max-md:px-4 py-3 max-md:py-2 text-base max-md:text-sm font-medium hover:bg-neutral-100 text-black no-underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 max-md:w-4 max-md:h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            User Management
          </Link>
        )}
          {canViewActivityLog && (
            <Link
              to="/host/activity-log"
              onClick={() => setIsMenuOpen(false)}
              aria-current={activeNav === 'Activity Log' ? 'page' : undefined}
              className="flex items-center gap-3 px-5 py-3 text-base font-medium hover:bg-neutral-100 text-black no-underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              Activity Log
            </Link>
          )}

          <hr className="my-2 border-neutral-200" />

          {/* Log out */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-3 max-md:gap-2 px-5 max-md:px-4 py-3 max-md:py-2 text-base max-md:text-sm font-semibold hover:bg-neutral-100 bg-transparent border-0 cursor-pointer text-black"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 max-md:w-4 max-md:h-4"
                            viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      )}
      {isBookingModalOpen && (
        <AdminBookingModal onClose={() => setIsBookingModalOpen(false)} />
      )}
    </header>
  );
}