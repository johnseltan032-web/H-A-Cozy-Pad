import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  { label: 'Explore', to: '/', icon: 'search' },
  { label: 'Reservations', to: '/trips', icon: 'trip' },
  { label: 'Settings', to: '/profile', icon: 'profile' },
];

const hostTabs = [
  { label: 'Dashboard', to: '/host/overview', icon: 'overview' },
  { label: 'Calendar', to: '/host/calendar', icon: 'calendar' },
  { label: 'Expenses', to: '/host/expenses', icon: 'expenses' },
  { label: 'Statistics', to: '/host/statistics', icon: 'stats' },
  { label: 'Settings', to: '/profile', icon: 'settings' },
];

function TabIcon({ name }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    trip: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.5-3.4 3-5.5 7-5.5s6.5 2.1 7 5.5" /></>,
    chat: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
    today: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    overview: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    expenses: <><path d="M12 1v22" /><path d="M17 5h-7a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8" /><path d="M5 5h.01M5 19h.01" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    stats: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V8" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.96l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.42 1.17V21a2 2 0 1 1-4 0v-.08A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1-.6 1.8 1.8 0 0 0-1.17.42l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.17-.42H2.7a2 2 0 1 1 0-4h.08A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0 .6-1 1.8 1.8 0 0 0-.42-1.17l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .42-1.17V2.7a2 2 0 1 1 4 0v.08A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1 .6 1.8 1.8 0 0 0 1.17-.42l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 .6 1 1.8 1.8 0 0 0 1.17.42h.08a2 2 0 1 1 0 4h-.08A1.8 1.8 0 0 0 19.4 15Z" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function MobileTabBar({ onOpenChat }) {
  const { pathname } = useLocation();
  const isHost = pathname.startsWith('/host/');
  const visibleTabs = isHost ? hostTabs : tabs;

  return (
    <nav className={`mobile-tabbar${isHost ? ' mobile-tabbar--host' : ''}`} aria-label={isHost ? 'Hosting navigation' : 'Main navigation'}>
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `mobile-tabbar__item${isActive ? ' is-active' : ''}`}
          aria-label={tab.label}
        >
          <span className="mobile-tabbar__icon"><TabIcon name={tab.icon} /></span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
      {!isHost && (
        <button type="button" className="mobile-tabbar__item" onClick={onOpenChat} aria-label="Chat">
          <span className="mobile-tabbar__icon"><TabIcon name="chat" /></span>
          <span>Chat</span>
        </button>
      )}
    </nav>
  );
}