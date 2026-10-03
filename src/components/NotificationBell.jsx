import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../lib/api';

const POLL_INTERVAL_MS = 30000; // new notifications show up within ~30s

function formatTime(sentAt) {
  if (!sentAt) return '';
  // MySQL "YYYY-MM-DD HH:MM:SS" -> ISO-ish so every browser parses it
  const date = new Date(String(sentAt).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const popupRef = useRef(null);
  const buttonRef = useRef(null);

  const loadNotifications = useCallback(() => {
    fetch(`${API_BASE_URL}/notifications.php`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const sendPatch = (body) =>
    fetch(`${API_BASE_URL}/notifications.php`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});

  const markRead = (notification) => {
    if (notification.is_read) return;

    // Update the UI right away, then tell the server
    setNotifications((current) =>
      current.map((item) =>
        item.notification_id === notification.notification_id ? { ...item, is_read: 1 } : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    sendPatch({ notificationId: notification.notification_id });
  };

  const markAllRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, is_read: 1 })));
    setUnreadCount(0);
    sendPatch({ markAllRead: true });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    sendPatch({ clearAll: true });
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
          if (!isOpen) loadNotifications();
        }}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-neutral-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-black"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4L6 17Z" />
          <path d="M10 20h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 top-12 z-[2100] max-h-[min(280px,40dvh)] w-[min(240px,calc(100vw-1rem))] overflow-y-auto rounded-xl border border-neutral-100 bg-white py-1.5 shadow-xl md:max-h-[420px] md:w-[min(340px,calc(100vw-2rem))] md:rounded-2xl md:py-2"
        >
          <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 md:gap-2 md:px-4 md:py-2">
            <span className="text-sm font-semibold text-neutral-900 md:text-base">Notifications</span>
            <div className="flex items-center gap-1.5 md:gap-2">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="cursor-pointer border-0 bg-transparent p-0 text-[10px] font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-500 md:text-xs"
                >
                  Clear all
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="cursor-pointer border-0 bg-transparent p-0 text-[10px] font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-500 md:text-xs"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="m-0 px-3 py-4 text-center text-xs text-neutral-500 md:px-4 md:py-6 md:text-sm">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.notification_id}
                type="button"
                onClick={() => markRead(notification)}
                className={`block w-full cursor-pointer border-0 px-3 py-2 text-left text-xs hover:bg-neutral-100 md:px-4 md:py-3 md:text-sm ${
                  notification.is_read ? 'bg-white text-neutral-500' : 'bg-neutral-50 font-medium text-neutral-900'
                }`}
              >
                {notification.message}
                <span className="mt-1 block text-[10px] font-normal text-neutral-400 md:text-[11px]">
                  {formatTime(notification.sent_at)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}