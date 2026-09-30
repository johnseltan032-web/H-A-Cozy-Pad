import { useCallback, useEffect, useMemo, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | unread
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    fetch(`${API_BASE_URL}/inbox.php`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setMessages(data.messages || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // pick up new inquiries
    return () => clearInterval(interval);
  }, [load]);

  const patch = (body) =>
    fetch(`${API_BASE_URL}/inbox.php`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});

  const setRead = (id, isRead) => {
    setMessages((cur) => cur.map((m) => (m.contact_id === id ? { ...m, is_read: isRead ? 1 : 0 } : m)));
    patch({ id, is_read: isRead });
  };

  const openMessage = (m) => {
    setSelectedId(m.contact_id);
    if (!m.is_read) setRead(m.contact_id, true);
  };

  const deleteMessage = (m) => {
    if (!window.confirm('Delete this message? This can\'t be undone.')) return;
    setMessages((cur) => cur.filter((x) => x.contact_id !== m.contact_id));
    setSelectedId(null);
    patch({ id: m.contact_id, delete: true });
  };

  const markAllRead = () => {
    setMessages((cur) => cur.map((m) => ({ ...m, is_read: 1 })));
    patch({ markAllRead: true });
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === 'unread' && m.is_read) return false;
      if (!q) return true;
      return [m.name, m.email, m.subject, m.message].some((f) => String(f).toLowerCase().includes(q));
    });
  }, [messages, filter, query]);

  const selected = messages.find((m) => m.contact_id === selectedId) || null;

  const tabClass = (active) =>
    `px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer ${
      active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
    }`;

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <HostHeader activeNav="Inbox" />

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-3xl font-bold">Inbox</h1>
            <p className="m-0 mt-1 text-sm text-neutral-600">
              Messages sent through the Contact Us form.
              {unreadCount > 0 ? ` ${unreadCount} unread.` : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-2 hover:text-neutral-500"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="grid overflow-hidden rounded-2xl border border-neutral-200 md:min-h-[560px] md:grid-cols-[360px_1fr]">
          {/* Message list */}
          <section className={`${selected ? 'hidden md:flex' : 'flex'} flex-col border-neutral-200 md:border-r`}>
            <div className="flex flex-col gap-3 border-b border-neutral-200 p-4">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages"
                aria-label="Search messages"
                className="w-full rounded-full border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-black"
              />
              <div className="flex gap-2">
                <button type="button" className={tabClass(filter === 'all')} onClick={() => setFilter('all')}>
                  All
                </button>
                <button type="button" className={tabClass(filter === 'unread')} onClick={() => setFilter('unread')}>
                  Unread
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto md:max-h-none md:flex-1">
              {status === 'loading' && <p className="m-0 p-6 text-center text-sm text-neutral-500">Loading messages…</p>}
              {status === 'error' && (
                <p className="m-0 p-6 text-center text-sm text-red-600">
                  Couldn't load messages.{' '}
                  <button type="button" onClick={load} className="cursor-pointer border-0 bg-transparent p-0 underline">
                    Try again
                  </button>
                </p>
              )}
              {status === 'ready' && visible.length === 0 && (
                <p className="m-0 p-6 text-center text-sm text-neutral-500">
                  {messages.length === 0 ? 'No messages yet.' : 'No messages match.'}
                </p>
              )}
              {visible.map((m) => (
                <button
                  key={m.contact_id}
                  type="button"
                  onClick={() => openMessage(m)}
                  className={`block w-full cursor-pointer border-0 border-b border-neutral-100 px-4 py-3 text-left hover:bg-neutral-100 ${
                    m.contact_id === selectedId ? 'bg-neutral-100' : m.is_read ? 'bg-white' : 'bg-neutral-50'
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm ${m.is_read ? 'text-neutral-600' : 'font-semibold text-black'}`}>
                      {!m.is_read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />}
                      {m.name}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">{formatShortDate(m.created_at)}</span>
                  </span>
                  <span className={`block truncate text-sm ${m.is_read ? 'text-neutral-600' : 'font-medium text-black'}`}>
                    {m.subject}
                  </span>
                  <span className="block truncate text-xs text-neutral-400">{m.message}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Reading pane */}
          <section className={`${selected ? 'block' : 'hidden md:block'} p-5 md:p-8`}>
            {!selected ? (
              <p className="m-0 mt-20 text-center text-sm text-neutral-500">Select a message to read it.</p>
            ) : (
              <article>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="mb-4 cursor-pointer border-0 bg-transparent p-0 text-sm font-medium underline underline-offset-2 md:hidden"
                >
                  Back to inbox
                </button>

                <h2 className="m-0 text-2xl font-bold break-words">{selected.subject}</h2>
                <p className="m-0 mt-3 text-sm">
                  <span className="font-semibold">{selected.name}</span>{' '}
                  <a href={`mailto:${selected.email}`} className="text-neutral-600 underline">
                    {selected.email}
                  </a>
                </p>
                <p className="m-0 mt-1 text-xs text-neutral-400">{formatDate(selected.created_at)}</p>

                <p className="mt-6 whitespace-pre-wrap break-words text-base leading-relaxed text-neutral-800">
                  {selected.message}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + selected.subject)}`}
                    className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white no-underline hover:bg-neutral-700"
                  >
                    Reply by email
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setRead(selected.contact_id, false);
                      setSelectedId(null);
                    }}
                    className="cursor-pointer rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-medium hover:bg-neutral-100"
                  >
                    Mark as unread
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMessage(selected)}
                    className="cursor-pointer rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}