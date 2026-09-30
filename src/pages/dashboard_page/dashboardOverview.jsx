import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

const statCards = [
  ['totalBookings', 'Total bookings', 'bookings'],
  ['activeStays', 'Active stays', 'active'],
  ['pendingBookings', 'Pending bookings', 'pending'],
  ['paymentReviews', 'Payment reviews', 'payment'],
  ['availableUnits', 'Available units', 'available'],
  ['occupiedUnits', 'Occupied units', 'occupied'],
  ['totalProperties', 'Properties', 'properties'],
  ['totalCustomers', 'Customers', 'customers'],
];

function MetricIcon({ type }) {
  const common = 'h-4 w-4 text-neutral-600';

  switch (type) {
    case 'bookings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
          <path d="M8 14h3M13 14h3M8 18h2" />
        </svg>
      );
    case 'active':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M4 12.5 9.5 18l10-12" />
          <rect x="3" y="5" width="18" height="16" rx="2" />
        </svg>
      );
    case 'pending':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'payment':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
          <path d="M4 10h16" />
          <path d="M8 15h3" />
        </svg>
      );
    case 'available':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M4 12h16" />
          <path d="M12 4v16" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case 'occupied':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case 'properties':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M3 10.5 12 4l9 6.5" />
          <path d="M5 9.5V19h14v-9.5" />
          <path d="M9 19v-7h6v7" />
        </svg>
      );
    case 'customers':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
          <circle cx="10" cy="7" r="3.5" />
          <path d="M20 19v-1a4 4 0 0 0-3-3.87" />
          <path d="M16 4.13a3.5 3.5 0 0 1 0 6.74" />
        </svg>
      );
    default:
      return null;
  }
}

function readableStatus(status) {
  return status ? status.replaceAll('_', ' ') : '';
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CheckInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 15h3" />
      <path d="M15 15h2" />
    </svg>
  );
}

function CheckOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M9 15l3 3 5-6" />
    </svg>
  );
}

function CleaningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 3v10" />
      <path d="M8.5 7.5A3.5 3.5 0 0 1 12 4a3.5 3.5 0 0 1 3.5 3.5V8a3.5 3.5 0 0 1-7 0v-.5Z" />
      <path d="M5 18h14" />
      <path d="M6 18v-3.5A1.5 1.5 0 0 1 7.5 13h9A1.5 1.5 0 0 1 18 14.5V18" />
    </svg>
  );
}

function VacantIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 12h16" />
      <path d="M12 4v16" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function OccupiedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function DailyOperationsCard({ title, count, items, icon, accent, emptyText }) {
  return (
    <article className="flex min-h-[190px] flex-col rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
            {icon}
          </span>
          <h2 className="m-0 text-base font-semibold text-neutral-800">{title}</h2>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">{count}</span>
      </div>

      {items.length ? (
        <ul className="m-0 flex-1 list-none overflow-y-auto pr-1 text-sm text-neutral-700">
          {items.map((item, index) => {
            const primaryLabel = item.property_name || item.unit_name || '—';
            const fallbackLabel = item.unit_name && item.property_name && item.unit_name !== item.property_name
              ? `${item.property_name} · ${item.unit_name}`
              : primaryLabel;

            return (
              <li key={`${title}-${index}`} className="flex min-h-[36px] items-center justify-between gap-3 border-b border-neutral-100 py-2 last:border-b-0">
                <span className="min-w-0 flex-1 truncate pr-2 font-medium text-neutral-800">
                  {fallbackLabel}
                </span>
                <span className="shrink-0 text-right text-neutral-600">
                  {item.guest_name ? item.guest_name : item.check_in_time || item.check_out_time || '—'}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 mt-2 text-sm text-neutral-500">{emptyText}</p>
      )}
    </article>
  );
}

export default function DashboardOverview() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [canViewStatistics, setCanViewStatistics] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    fetch(`${API_BASE_URL}/check_auth.php`, { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (isCurrent) {
          setCanViewStatistics(Boolean(data.user?.can_view_statistics) || data.user?.role === 'super_admin');
        }
      })
      .catch(() => {
        if (isCurrent) setCanViewStatistics(false);
      });

    fetch(`${API_BASE_URL}/dashboard_overview.php`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load overview');
        if (isCurrent) setDashboard(data);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError.message || 'Unable to load overview');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const dailyOps = dashboard?.dailyOperations || {
    checkIns: { count: 0, items: [] },
    checkOuts: { count: 0, items: [] },
    cleaning: { count: 0, items: [] },
    vacantUnits: { count: 0, units: [] },
    occupiedUnits: { count: 0, units: [] },
  };

  return (
    <div className="pms-page min-h-screen font-sans text-neutral-900">
      <HostHeader activeNav="Dashboard" />
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-10">
        <header className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#bd584f]">Property operations</p>
          <h1 className="m-0 text-2xl font-semibold tracking-tight sm:text-3xl">Operations overview</h1>
          <p className="mb-0 mt-2 text-sm text-neutral-500">Today’s bookings, arrivals, and unit status.</p>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Operations shortcuts">
          <Link to="/host/calendar" className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-[#df766c] hover:shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Calendar</p>
            <h2 className="mt-2 text-lg font-semibold text-neutral-900">Unit calendar</h2>
            <p className="mt-1 text-sm text-neutral-600">See bookings, check-ins, and occupancy in one place.</p>
          </Link>

          <Link to="/host/reservations" className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-[#df766c] hover:shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Reservations</p>
            <h2 className="mt-2 text-lg font-semibold text-neutral-900">Manage stays</h2>
            <p className="mt-1 text-sm text-neutral-600">Approve, reject, and review all guest reservations.</p>
          </Link>

          <Link to="/host/listings" className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-[#df766c] hover:shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Listings</p>
            <h2 className="mt-2 text-lg font-semibold text-neutral-900">Manage listings</h2>
            <p className="mt-1 text-sm text-neutral-600">Review, edit, and update unit details, pricing, and availability.</p>
          </Link>

          {canViewStatistics ? (
            <Link to="/host/statistics" className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-400 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Statistics</p>
              <h2 className="mt-2 text-lg font-semibold text-neutral-900">KPI view</h2>
              <p className="mt-1 text-sm text-neutral-600">Review occupancy, revenue, and performance metrics.</p>
            </Link>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-neutral-500">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Statistics</p>
              <h2 className="mt-2 text-lg font-semibold text-neutral-700">Restricted</h2>
              <p className="mt-1 text-sm text-neutral-600">Statistics are hidden for this admin profile.</p>
            </div>
          )}

          <Link to="/host/listing" className="rounded-lg border border-[#ca635a] bg-[#df766c] p-4 text-white transition hover:bg-[#bd584f]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Create</p>
            <h2 className="mt-2 text-lg font-semibold text-white">New listing</h2>
            <p className="mt-1 text-sm text-white/90">Add a unit and open its availability.</p>
          </Link>
        </section>

        {error && <p role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {isLoading ? (
          <p className="py-12 text-center text-sm text-neutral-500">Loading overview...</p>
        ) : dashboard && (
          <>
            {dashboard?.alerts?.length > 0 && (
              <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Alerts</p>
                    <h2 className="mt-2 text-xl font-semibold text-neutral-900">Operational highlights</h2>
                  </div>
                  <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
                    {dashboard.alerts.length} active
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {dashboard.alerts.map((alert, index) => (
                    <div
                      key={`${alert.type}-${index}`}
                      className={`rounded-lg border p-3 ${
                        alert.severity === 'high'
                          ? 'border-red-200 bg-red-50'
                          : 'border-amber-200 bg-white'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className="text-sm font-semibold text-neutral-900">{alert.title}</span>
                      </div>
                      <p className="m-0 text-sm text-neutral-700">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Daily operations summary">
              <DailyOperationsCard
                title="Today's Check-ins"
                count={dailyOps.checkIns.count}
                items={dailyOps.checkIns.items.map((item) => ({
                  property_name: item.property_name || item.unit_name,
                  unit_name: item.unit_name,
                  guest_name: `${item.guest_name} — ${item.check_in_time}`,
                }))}
                icon={<CheckInIcon />}
                accent="bg-emerald-100 text-emerald-700"
                emptyText="No check-ins today."
              />
              <DailyOperationsCard
                title="Today's Check-outs"
                count={dailyOps.checkOuts.count}
                items={dailyOps.checkOuts.items.map((item) => ({
                  property_name: item.property_name || item.unit_name,
                  unit_name: item.unit_name,
                  guest_name: item.check_out_time,
                }))}
                icon={<CheckOutIcon />}
                accent="bg-sky-100 text-sky-700"
                emptyText="No check-outs today."
              />
              <DailyOperationsCard
                title="Cleaning"
                count={dailyOps.cleaning.count}
                items={dailyOps.cleaning.items.map((item) => ({
                  property_name: item.property_name || item.unit_name,
                  unit_name: item.unit_name,
                  guest_name: item.check_out_time,
                }))}
                icon={<CleaningIcon />}
                accent="bg-amber-100 text-amber-700"
                emptyText="No units need cleaning."
              />
              <DailyOperationsCard
                title="Vacant Units"
                count={dailyOps.vacantUnits.count}
                items={dailyOps.vacantUnits.units.map((unit) => ({
                  property_name: unit.property_name || unit.unit_name,
                  unit_name: unit.unit_name,
                }))}
                icon={<VacantIcon />}
                accent="bg-violet-100 text-violet-700"
                emptyText="No vacant units."
              />
              <DailyOperationsCard
                title="Occupied / Booked"
                count={dailyOps.occupiedUnits.count}
                items={dailyOps.occupiedUnits.units.map((unit) => ({
                  property_name: unit.property_name || unit.unit_name,
                  unit_name: unit.unit_name,
                }))}
                icon={<OccupiedIcon />}
                accent="bg-rose-100 text-rose-700"
                emptyText="No occupied units."
              />
            </section>

            <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
              {statCards.map(([key, label, iconType]) => (
                <article key={key} className="rounded-lg border border-neutral-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <MetricIcon type={iconType} />
                    <p className="m-0">{label}</p>
                  </div>
                  <p className="mb-0 mt-2 text-3xl font-semibold tabular-nums">{dashboard.stats[key]}</p>
                </article>
              ))}
              <article className="rounded-lg border border-neutral-200 bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-neutral-600">
                    <path d="M12 1v22" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <p className="m-0">Verified revenue</p>
                </div>
                <p className="mb-0 mt-2 text-2xl font-semibold tabular-nums">₱{formatAmount(dashboard.stats.verifiedRevenue)}</p>
              </article>
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <h2 className="mb-1 text-lg font-semibold">Upcoming reservations</h2>
                <p className="mb-4 mt-0 text-sm text-neutral-500">Next scheduled guest stays.</p>
                {dashboard.upcomingReservations.length ? (
                  <ul className="m-0 divide-y divide-neutral-200 border-y border-neutral-200 p-0">
                    {dashboard.upcomingReservations.map((booking) => (
                      <li key={booking.booking_id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                        <div className="min-w-0">
                          <p className="m-0 font-semibold">{booking.guest_name}</p>
                          <p className="mb-0 mt-1 text-sm text-neutral-600">{booking.building_name} · {booking.unit_name}</p>
                          <p className="mb-0 mt-1 text-sm text-neutral-500">{formatDate(booking.check_in_date)} to {formatDate(booking.check_out_date)} · {booking.num_of_guests} guests</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          booking.status === 'confirmed' || booking.status === 'checked_in'
                            ? 'bg-emerald-50 text-emerald-700'
                            : booking.status === 'pending'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-neutral-100 text-neutral-700'
                        }`}>{readableStatus(booking.status)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="border-y border-neutral-200 py-6 text-sm text-neutral-500">No upcoming reservations.</p>}
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <h2 className="mb-1 text-lg font-semibold">Booking summary</h2>
                <p className="mb-4 mt-0 text-sm text-neutral-500">Bookings by current status.</p>
                <ul className="m-0 divide-y divide-neutral-200 border-y border-neutral-200 p-0">
                  {Object.entries(dashboard.bookingSummary).map(([status, total]) => (
                    <li key={status} className="flex items-center justify-between gap-4 py-3 text-sm capitalize">
                      <span>{readableStatus(status)}</span>
                      <span className="font-semibold tabular-nums">{total}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-1 text-lg font-semibold">Recent payments</h2>
              <p className="mb-4 mt-0 text-sm text-neutral-500">Latest payment activity.</p>
              {dashboard.recentPayments.length ? (
                <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white px-4">
                  <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                    <thead><tr className="border-b border-neutral-300 text-xs text-neutral-500">
                      <th className="py-3 pr-4 font-medium">Customer</th>
                      <th className="py-3 pr-4 font-medium">Property</th>
                      <th className="py-3 pr-4 font-medium">Amount</th>
                      <th className="py-3 pr-4 font-medium">Method</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 font-medium">Date</th>
                    </tr></thead>
                    <tbody>{dashboard.recentPayments.map((payment) => (
                      <tr key={payment.payment_id} className="border-b border-neutral-100">
                        <td className="py-3 pr-4">{payment.guest_name}</td>
                        <td className="py-3 pr-4">{payment.building_name} · {payment.unit_name}</td>
                        <td className="py-3 pr-4">₱{formatAmount(payment.amount)}</td>
                        <td className="py-3 pr-4 capitalize">{readableStatus(payment.payment_method)}</td>
                        <td className="py-3 pr-4 capitalize">{readableStatus(payment.payment_status)}</td>
                        <td className="py-3">{new Date(payment.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="border-y border-neutral-200 py-6 text-sm text-neutral-500">No payment records yet.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}