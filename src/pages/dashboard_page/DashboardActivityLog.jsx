import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

function formatActivityDate(value) {
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;

  const datePart = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${datePart} — ${timePart}`;
}

export default function DashboardActivityLog() {
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPage = useCallback(async (pageNumber, append = false, signal) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/activity_log.php?page=${pageNumber}`, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load activity log');
      }

      setActivities((current) => append ? [...current, ...data.activities] : data.activities);
      setPage(data.page);
      setHasMore(data.hasMore);
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message || 'Unable to load activity log');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPage(1, false, controller.signal);
    return () => controller.abort();
  }, [loadPage]);

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <HostHeader activeNav="Activity Log" />
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 md:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Administration</p>
            <h1 className="mb-0 mt-2 text-3xl font-semibold">Activity Log</h1>
            <p className="mb-0 mt-2 text-sm text-neutral-600">Review administrative actions, who performed them, and when.</p>
          </div>
          <Link to="/host/overview" className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100">
            Back to overview
          </Link>
        </div>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section aria-label="Administrative activity" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {activities.length ? (
            <ol className="m-0 list-none divide-y divide-neutral-100 p-0">
              {activities.map((activity) => (
                <li key={activity.log_id} className="flex gap-4 px-5 py-4">
                  <span aria-hidden="true" className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff1ef] text-[#bd584f]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <circle cx="12" cy="12" r="8" />
                      <path d="M12 8v4l2.5 1.5" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-medium text-neutral-900">{activity.actor_name} {activity.description}</p>
                    <time className="mt-1 block text-xs text-neutral-500" dateTime={activity.created_at}>{formatActivityDate(activity.created_at)}</time>
                  </div>
                  <span className="hidden shrink-0 self-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs capitalize text-neutral-600 sm:inline-flex">{activity.action.replaceAll('_', ' ')}</span>
                </li>
              ))}
            </ol>
          ) : (
            !isLoading && <p className="m-0 px-5 py-12 text-center text-sm text-neutral-500">No administrative activity has been recorded yet.</p>
          )}
          {isLoading && <p className="m-0 px-5 py-6 text-center text-sm text-neutral-500">Loading activity...</p>}
        </section>

        {hasMore && (
          <div className="text-center">
            <button type="button" disabled={isLoading} onClick={() => loadPage(page + 1, true)} className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50">
              {isLoading ? 'Loading...' : 'Load more activity'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
