import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';
import DashboardExpenses from './DashboardExpenses';

const periodOptions = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom range' },
];

const intervalOptions = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
];

const unitSortOptions = [
  { value: 'revenue', label: 'Revenue generated' },
  { value: 'occupancyRate', label: 'Occupancy rate' },
  { value: 'bookings', label: 'Number of bookings' },
  { value: 'averageBookingValue', label: 'Average booking value' },
  { value: 'averageLengthOfStay', label: 'Average length of stay' },
  { value: 'revenuePerAvailableNight', label: 'Revenue per available night' },
  { value: 'expenses', label: 'Expenses (lowest first)' },
  { value: 'netIncome', label: 'Net income / profit' },
];

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPresetDates(period, reference = new Date()) {
  const end = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const start = new Date(end);

  if (period === 'week') {
    start.setDate(end.getDate() - ((end.getDay() + 6) % 7));
  } else if (period === 'month') {
    start.setDate(1);
  } else if (period === 'quarter') {
    start.setMonth(Math.floor(end.getMonth() / 3) * 3, 1);
  } else {
    start.setMonth(0, 1);
  }

  return { start: localDateString(start), end: localDateString(end) };
}

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
  return `${formatNumber(value, 1)}%`;
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="m-0 text-sm text-neutral-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-neutral-900">{value}</p>
      {detail && <p className="mb-0 mt-2 text-xs text-neutral-500">{detail}</p>}
    </article>
  );
}

function SectionTitle({ eyebrow, children }) {
  return (
    <div className="mb-4">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{eyebrow}</p>
      <h2 className="mb-0 mt-1 text-xl font-semibold text-neutral-900">{children}</h2>
    </div>
  );
}

export default function DashboardStatistics({ user }) {
  const isSuperAdmin = user?.role === 'super_admin';
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState(() => getPresetDates('month'));
  const [interval, setInterval] = useState('week');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [unitSort, setUnitSort] = useState('revenue');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin || !dateRange.start || !dateRange.end) return;

    const controller = new AbortController();
    const loadStatistics = async () => {
      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          start: dateRange.start,
          end: dateRange.end,
          interval,
        });
        if (selectedUnitId) params.set('unit_id', selectedUnitId);
        const response = await fetch(`${API_BASE_URL}/statistics.php?${params}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load statistics');
        }

        setReport(data);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Unable to load statistics');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadStatistics();
    return () => controller.abort();
  }, [dateRange, interval, isSuperAdmin, selectedUnitId]);

  const metrics = report?.metrics;
  const maxRevenue = useMemo(
    () => Math.max(1, ...(report?.revenueTrend || []).map((point) => Number(point.revenue || 0))),
    [report]
  );
  const sortedUnits = useMemo(() => {
    const units = (report?.units || []).filter((unit) =>
      !selectedUnitId || String(unit.unitId) === selectedUnitId
    );
    const direction = unitSort === 'expenses' ? 1 : -1;
    return units.sort((left, right) =>
      direction * (Number(left[unitSort] || 0) - Number(right[unitSort] || 0)) ||
      left.unitName.localeCompare(right.unitName)
    );
  }, [report, selectedUnitId, unitSort]);

  const updateCustomDate = (key, value) => {
    setDateRange((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <HostHeader activeNav={isSuperAdmin ? 'Statistics' : 'Expenses'} />

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8 md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">{isSuperAdmin ? 'Performance' : 'Financial records'}</p>
            <h1 className="mb-0 mt-2 text-3xl font-bold">{isSuperAdmin ? 'Statistics' : 'Expense management'}</h1>
            {isSuperAdmin && <p className="mb-0 mt-2 text-sm text-neutral-600">Understand revenue, occupancy, bookings, and unit performance over time.</p>}
          </div>
          <Link
            to="/host/overview"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
          >
            Back to overview
          </Link>
        </div>

        {isSuperAdmin && (
          <>
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <label htmlFor="statistics-period" className="mb-2 block text-sm font-medium text-neutral-700">Reporting period</label>
              <select
                id="statistics-period"
                value={period}
                onChange={(event) => {
                  const nextPeriod = event.target.value;
                  setPeriod(nextPeriod);
                  if (nextPeriod !== 'custom') setDateRange(getPresetDates(nextPeriod));
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm lg:w-52"
              >
                {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="statistics-unit" className="mb-2 block text-sm font-medium text-neutral-700">Unit</label>
              <select
                id="statistics-unit"
                value={selectedUnitId}
                onChange={(event) => setSelectedUnitId(event.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm lg:w-52"
              >
                <option value="">All units</option>
                {(report?.units || []).map((unit) => (
                  <option key={unit.unitId} value={unit.unitId}>{unit.unitName}</option>
                ))}
              </select>
            </div>

            {period === 'custom' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="statistics-start" className="mb-2 block text-sm font-medium text-neutral-700">Start date</label>
                  <input id="statistics-start" type="date" value={dateRange.start} max={dateRange.end || undefined} onChange={(event) => updateCustomDate('start', event.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="statistics-end" className="mb-2 block text-sm font-medium text-neutral-700">End date</label>
                  <input id="statistics-end" type="date" value={dateRange.end} min={dateRange.start || undefined} onChange={(event) => updateCustomDate('end', event.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="statistics-interval" className="mb-2 block text-sm font-medium text-neutral-700">Trend interval</label>
              <select id="statistics-interval" value={interval} onChange={(event) => setInterval(event.target.value)} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm lg:w-44">
                {intervalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {report && <p className="m-0 text-sm text-neutral-500">{report.period.start} – {report.period.end}</p>}
          </div>
        </section>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {isLoading ? (
          <p className="py-12 text-center text-sm text-neutral-500">Loading statistics...</p>
        ) : report ? (
          <>
            <section>
              <SectionTitle eyebrow="Property performance">Revenue & occupancy</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total sales" value={formatNumber(metrics.totalSales)} detail="Verified payment transactions" />
                <MetricCard label="Gross revenue" value={formatCurrency(metrics.grossRevenue)} />
                <MetricCard label="Occupancy rate" value={formatPercent(metrics.occupancyRate)} detail={`${formatNumber(metrics.occupiedNights)} booked unit nights`} />
                <MetricCard label="Net revenue" value={formatCurrency(metrics.netRevenue)} detail="After refunded payments" />
                <MetricCard label="Recorded expenses" value={formatCurrency(metrics.totalExpenses)} />
                <MetricCard label="Net income / profit" value={formatCurrency(metrics.netIncome)} detail="Net revenue less recorded expenses" />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <SectionTitle eyebrow="Revenue trend">Revenue by {interval}</SectionTitle>
                    <p className="mb-0 -mt-2 text-xs text-neutral-500">Based on the date payments were verified.</p>
                  </div>
                </div>
                {report.revenueTrend.length ? (
                  <div className="mt-6 flex min-h-52 items-end gap-3 overflow-x-auto border-b border-neutral-200 pb-2">
                    {report.revenueTrend.map((point) => (
                      <div key={point.bucket} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2">
                        <span className="text-center text-[10px] text-neutral-500">{formatCurrency(point.revenue)}</span>
                        <div title={`${point.label}: ${formatCurrency(point.revenue)}`} className="w-full min-w-8 rounded-t-md bg-[#df766c] transition-all" style={{ height: `${Math.max(4, (Number(point.revenue || 0) / maxRevenue) * 145)}px` }} />
                        <span className="whitespace-nowrap text-[10px] text-neutral-600">{point.label}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-8 text-sm text-neutral-500">No verified revenue in this period.</p>}
              </article>

              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <SectionTitle eyebrow="Booking performance">Bookings & guests</SectionTitle>
                <dl className="m-0 divide-y divide-neutral-100">
                  <div className="flex justify-between gap-3 py-3"><dt className="text-sm text-neutral-600">Total bookings</dt><dd className="m-0 font-semibold">{formatNumber(metrics.totalBookings)}</dd></div>
                  <div className="flex justify-between gap-3 py-3"><dt className="text-sm text-neutral-600">Confirmed bookings</dt><dd className="m-0 font-semibold">{formatNumber(metrics.confirmedBookings)}</dd></div>
                  <div className="flex justify-between gap-3 py-3"><dt className="text-sm text-neutral-600">Guests</dt><dd className="m-0 font-semibold">{formatNumber(metrics.guestCount)}</dd></div>
                  <div className="flex justify-between gap-3 py-3"><dt className="text-sm text-neutral-600">Average stay</dt><dd className="m-0 font-semibold">{formatNumber(metrics.averageLengthOfStay, 1)} nights</dd></div>
                  <div className="flex justify-between gap-3 py-3"><dt className="text-sm text-neutral-600">Average booking value</dt><dd className="m-0 font-semibold">{formatCurrency(metrics.averageBookingValue)}</dd></div>
                </dl>
                <h3 className="mb-2 mt-5 text-sm font-semibold">Booking sources</h3>
                {report.bookingSources.length ? (
                  <ul className="m-0 list-none space-y-2 p-0">
                    {report.bookingSources.map((source) => (
                      <li key={source.source} className="flex justify-between gap-3 text-sm">
                        <span className="capitalize text-neutral-600">{source.source.replaceAll('_', ' ')}</span>
                        <span className="font-medium">{formatNumber(source.bookings)} · {formatPercent(source.share)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="m-0 text-sm text-neutral-500">No bookings in this period.</p>}
              </article>
            </section>

            <section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <SectionTitle eyebrow="Unit performance">Top performing units</SectionTitle>
                <div className="mb-4">
                  <label htmlFor="unit-performance-sort" className="mb-2 block text-sm font-medium text-neutral-700">Rank units by</label>
                  <select id="unit-performance-sort" value={unitSort} onChange={(event) => setUnitSort(event.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
                    {unitSortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                      <th className="px-4 py-3 text-right font-semibold">Occupancy</th>
                      <th className="px-4 py-3 text-right font-semibold">Bookings</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg. booking</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg. stay</th>
                      <th className="px-4 py-3 text-right font-semibold">Revenue / available night</th>
                      <th className="px-4 py-3 text-right font-semibold">Expenses</th>
                      <th className="px-4 py-3 text-right font-semibold">Net income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sortedUnits.map((unit) => (
                      <tr key={unit.unitId} className="text-neutral-700">
                        <th scope="row" className="px-4 py-3 font-medium text-neutral-900">{unit.unitName}</th>
                        <td className="px-4 py-3 text-right">{formatCurrency(unit.revenue)}</td>
                        <td className="px-4 py-3 text-right">{formatPercent(unit.occupancyRate)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(unit.bookings)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(unit.averageBookingValue)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(unit.averageLengthOfStay, 1)} nights</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(unit.revenuePerAvailableNight)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(unit.expenses)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(unit.netIncome)}</td>
                      </tr>
                    ))}
                    {!sortedUnits.length && <tr><td colSpan="9" className="px-4 py-8 text-center text-neutral-500">No units found.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="mb-0 mt-3 text-xs text-neutral-500">Occupancy and revenue per available night use the number of nights in the selected range. Profit includes recorded unit expenses only.</p>
            </section>
          </>
        ) : null}
          </>
        )}

        <section aria-labelledby="unit-expenses-heading" className="rounded-2xl border border-neutral-200 bg-neutral-100/70 p-4 md:p-6">
          <div className="mb-5">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Financial records</p>
            <h2 id="unit-expenses-heading" className="mb-0 mt-1 text-xl font-semibold text-neutral-900">Expense management</h2>
          </div>
          <DashboardExpenses embedded />
        </section>
      </main>
    </div>
  );
}
