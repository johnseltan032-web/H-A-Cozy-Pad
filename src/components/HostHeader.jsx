import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api';
import NotificationBell from './NotificationBell';

export default function HostHeader({
  activeNav = 'Today',
  onLogout,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const menuRef = useRef(null);
  const buttonRef = useRef(null);

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

        setIsAdmin(data.user?.role === 'super_admin');
      })
      .catch(() => {
        setIsAdmin(false);
      });
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
      await fetch(`${API_BASE_URL}/logout.php`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
  
      onLogout?.();

      setIsMenuOpen(false);


      window.location.href = '/';
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
        <ul className="flex gap-10 list-none m-0 p-0">
          <li>
            <Link
              to="/host/overview"
              className={`text-lg ${
                activeNav === 'Overview'
                  ? 'font-semibold border-b-2 border-black pb-1 text-black'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Overview
            </Link>
          </li>
          <li>
            <Link
              to="/host/reservations"
              className={`text-lg ${
                activeNav === 'Today'
                  ? 'font-semibold border-b-2 border-black pb-1 text-black'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Today
            </Link>
          </li>

          <li>
            <Link
              to="/host/calendar"
              className={`text-lg ${
                activeNav === 'Calendar'
                  ? 'font-semibold border-b-2 border-black pb-1 text-black'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Calendar
            </Link>
          </li>

          <li>
            <Link
              to="/host/listings"
              className={`text-lg ${
                activeNav === 'Listing'
                  ? 'font-semibold border-b-2 border-black pb-1 text-black'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Listing
            </Link>
          </li>
        </ul>
      </nav>

      {/* Right side */}
      <div className="host-header__actions flex items-center gap-4 justify-self-end">
        <NotificationBell />

        {/* Profile icon */}
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
          className="host-header-menu absolute left-auto right-5 top-[70px] w-[280px] bg-white rounded-2xl shadow-xl border border-neutral-100 py-3 z-[2100]"
        >
          {/* Switch to guest */}
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
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
              <path d="M3 9l9-7 9 7" />
              <path d="M9 22V12h6v10" />
            </svg>
            Switch to guest
          </Link>

          {/* Profile */}

          <Link
            to="/profile"
            onClick={() => setIsMenuOpen(false)}
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
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            Profile
          </Link>

          <hr className="my-2 border-neutral-200" />

          {/* Help Center Management */}
          <Link
            to="/host/faqs"
            onClick={() => setIsMenuOpen(false)}
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
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 2-3 4" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Help Center Management
          </Link>

          {isAdmin && (<Link
            to="/host/users"
            onClick={() => setIsMenuOpen(false)}
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
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            User Management
          </Link>
        )}
          

          <hr className="my-2 border-neutral-200" />

          {/* Log out */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-3 px-5 py-3 text-base font-semibold hover:bg-neutral-100 bg-transparent border-0 cursor-pointer text-black"
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
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
