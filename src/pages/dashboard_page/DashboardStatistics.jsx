import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function DashboardStatistics() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    fetch(`${API_BASE_URL}/statistics.php`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load statistics');
        }

        if (isCurrent) {
          setStats(data);
        }
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError.message || 'Unable to load statistics');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const metricCards = useMemo(() => {
    if (!stats?.metrics) {
      return [];
    }

    return [
      { label: 'Weekly Income', value: formatCurrency(stats.metrics.weeklyIncome) },
      { label: 'Monthly Income', value: formatCurrency(stats.metrics.monthlyIncome) },
      { label: 'Gross Sales', value: formatCurrency(stats.metrics.grossSales) },
      { label: 'Net Sales', value: formatCurrency(stats.metrics.netSales) },
      { label: 'Occupancy Rate', value: formatPercent(stats.metrics.occupancyRate) },
      { label: 'Average Daily Rate', value: formatCurrency(stats.metrics.adr) },
      { label: 'RevPAR', value: formatCurrency(stats.metrics.revpar) },
      { label: 'Monthly Profit', value: formatCurrency(stats.metrics.monthlyProfit) },
      { label: 'Number of Bookings', value: formatNumber(stats.metrics.numberOfBookings) },
      { label: 'Average Length of Stay', value: `${formatNumber(stats.metrics.averageLengthOfStay, 1)} nights` },
      { label: 'Top Performing Unit', value: stats.metrics.topPerformingUnit || 'N/A' },
    ];
  }, [stats]);

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <HostHeader activeNav="Statistics" />

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Performance</p>
            <h1 className="mt-2 text-3xl font-bold">Statistics</h1>
          </div>
          <Link
            to="/host/overview"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
          >
            Back to overview
          </Link>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="py-12 text-center text-sm text-neutral-500">Loading statistics...</p>
        ) : stats ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((card) => (
                <article key={card.label} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
                  <p className="m-0 text-sm text-neutral-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-neutral-900">{card.value}</p>
                </article>
              ))}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
