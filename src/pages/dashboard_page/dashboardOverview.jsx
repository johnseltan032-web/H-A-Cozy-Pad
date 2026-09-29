import { useEffect, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

const statCards = [
  ['totalBookings', 'Total bookings'],
  ['activeStays', 'Active stays'],
  ['pendingBookings', 'Pending bookings'],
  ['paymentReviews', 'Payment reviews'],
  ['availableUnits', 'Available units'],
  ['occupiedUnits', 'Occupied units'],
  ['totalProperties', 'Properties'],
  ['totalCustomers', 'Customers'],
];

function readableStatus(status) {
  return status.replaceAll('_', ' ');
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

export default function DashboardOverview() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

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

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <HostHeader activeNav="Overview" />
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-10">
        <header className="mb-7">
          <h1 className="m-0 text-3xl font-semibold">Overview</h1>
          <p className="mb-0 mt-2 text-sm text-neutral-500">Booking, property, and payment activity.</p>
        </header>

        {error && <p role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {isLoading ? (
          <p className="py-12 text-center text-sm text-neutral-500">Loading overview...</p>
        ) : dashboard && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
              {statCards.map(([key, label]) => (
                <article key={key} className="border-b border-neutral-200 px-1 py-4">
                  <p className="m-0 text-sm text-neutral-500">{label}</p>
                  <p className="mb-0 mt-2 text-3xl font-semibold tabular-nums">{dashboard.stats[key]}</p>
                </article>
              ))}
              <article className="border-b border-neutral-200 px-1 py-4">
                <p className="m-0 text-sm text-neutral-500">Verified revenue</p>
                <p className="mb-0 mt-2 text-2xl font-semibold tabular-nums">₱{formatAmount(dashboard.stats.verifiedRevenue)}</p>
              </article>
            </section>

            <section className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
              <div>
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
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium capitalize">{readableStatus(booking.status)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="border-y border-neutral-200 py-6 text-sm text-neutral-500">No upcoming reservations.</p>}
              </div>

              <div>
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
                <div className="overflow-x-auto">
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