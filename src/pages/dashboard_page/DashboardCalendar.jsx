import { useEffect, useMemo, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

const CALENDAR_API_URL = (
  import.meta.env.VITE_GOOGLE_CALENDAR_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '')
).replace(/\/+$/, '');

function formatMonth(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, count) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function daysBetween(fromKey, toKey) {
  const [fromYear, fromMonth, fromDay] = fromKey.split('-').map(Number);
  const [toYear, toMonth, toDay] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86400000);
}

function calendarRange(date, viewMode) {
  if (viewMode === 'week') {
    const start = startOfWeek(date);
    return { start: dateKey(start), endExclusive: dateKey(addDays(start, 7)) };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const endExclusive = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start: dateKey(start), endExclusive: dateKey(endExclusive) };
}

function reservationEvents(reservations) {
  return reservations
    .filter((reservation) => !['cancelled', 'rejected'].includes(reservation.status))
    .map((reservation) => {
      const bookerName = reservation.booked_guest_name || reservation.guest_name || 'Guest';
      const shortName = bookerName.length > 12 ? `${bookerName.slice(0, 11)}...` : bookerName;
      const shortUnit = (reservation.unit_name || reservation.building_name || 'Booking').slice(0, 12);
      return {
        id: `booking-${reservation.booking_id}`,
        summary: `${shortUnit} · ${shortName}`,
        startDate: reservation.check_in_date,
        endDateExclusive: reservation.check_out_date,
        detail: reservation.unit_name || '',
        source: 'booking',
        unit_id: reservation.unit_id,
      };
    });
}

function blockedDatesEvents(blockedDates) {
  return (blockedDates || []).map((blockedDate) => ({
    id: `blocked-${blockedDate.blocked_date_id}`,
    summary: `Blocked • ${blockedDate.reason ? blockedDate.reason.replace('_', ' ') : 'Unavailable'}`,
    startDate: blockedDate.blocked_from,
    endDateExclusive: dateKey(addDays(parseDateKey(blockedDate.blocked_until), 1)),
    detail: blockedDate.notes || blockedDate.reason || 'Blocked',
    source: 'blocked',
    unit_id: blockedDate.unit_id,
  }));
}

function googleCalendarEvents(events) {
  return events.map((event, index) => {
    const startDate = event.start?.date || event.start?.dateTime?.slice(0, 10);
    const endDate = event.end?.date || event.end?.dateTime?.slice(0, 10);
    const endDateExclusive = event.end?.date
      ? event.end.date
      : endDate && endDate > startDate
        ? dateKey(addDays(parseDateKey(endDate), 1))
        : dateKey(addDays(parseDateKey(startDate), 1));

    return {
      id: event.id || `google-${startDate}-${index}`,
      summary: event.summary || 'Google Calendar event',
      startDate,
      endDateExclusive,
      detail: event.description || '',
      source: 'google',
    };
  }).filter((event) => event.startDate && event.endDateExclusive);
}

function dateEvents(events, date) {
  return events.filter((event) => event.startDate <= date && date < event.endDateExclusive);
}

function monthWeeks(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const cursor = startOfWeek(first);
  const lastDay = addDays(last, 6 - last.getDay());
  const weeks = [];

  while (cursor <= lastDay) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)));
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

function monthDays(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const days = [];

  for (let current = new Date(first); current <= last; current = addDays(current, 1)) {
    days.push(new Date(current));
  }

  return days;
}

export default function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('month');
  const [calendarLayout, setCalendarLayout] = useState('classic');
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [blockForm, setBlockForm] = useState({ unitId: '', blockedFrom: '', blockedUntil: '', reason: 'owner_stay', notes: '' });
  const [blockMessage, setBlockMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unitOptions, setUnitOptions] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [savingBooking, setSavingBooking] = useState(false);

  const reservationById = useMemo(() => Object.fromEntries(
    reservations.map((reservation) => [reservation.booking_id, reservation])
  ), [reservations]);

  const loadEvents = async () => {
    setIsLoading(true);
    setError('');
    try {
      const reservationsResponse = await fetch(`${API_BASE_URL}/reservations.php`, { credentials: 'include' });
      const reservationsData = await reservationsResponse.json();
      if (!reservationsResponse.ok) throw new Error(reservationsData.error || 'Unable to load bookings');
      setReservations(reservationsData.reservations || []);

      const unitsResponse = await fetch(`${API_BASE_URL}/listings.php`, { credentials: 'include' });
      const unitsData = await unitsResponse.json();
      if (unitsResponse.ok && Array.isArray(unitsData)) {
        setUnitOptions(unitsData.filter((unit) => unit && unit.unit_id).map((unit) => ({
          value: Number(unit.unit_id),
          label: `${unit.unit_name || 'Unit'} · ${unit.building_name || 'Property'}`,
        })));
      }

      const blockedResponse = await fetch(`${API_BASE_URL}/blocked_dates.php`, { credentials: 'include' });
      const blockedData = await blockedResponse.json();
      if (!blockedResponse.ok) throw new Error(blockedData.error || 'Unable to load blocked dates');
      setBlockedDates(blockedData.blockedDates || []);

      if (!CALENDAR_API_URL) {
        setIsConnected(false);
        setEvents([]);
        setError('Google Calendar URL is missing from this Netlify build. Set VITE_GOOGLE_CALENDAR_URL and redeploy.');
        return;
      }

      let status;
      try {
        const statusResponse = await fetch(`${CALENDAR_API_URL}/auth/status`);
        status = await statusResponse.json();
      } catch {
        setIsConnected(false);
        setEvents([]);
        return;
      }

      setIsConnected(status.connected);
      if (status.connected) {
        const range = calendarRange(currentDate, viewMode);
        const response = await fetch(
          `${CALENDAR_API_URL}/events?timeMin=${encodeURIComponent(parseDateKey(range.start).toISOString())}&timeMax=${encodeURIComponent(parseDateKey(range.endExclusive).toISOString())}`
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load Google Calendar events');
        setEvents(data.events || []);
      } else {
        setEvents([]);
      }
    } catch (loadError) {
      setError(loadError.message || 'Unable to connect to Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const refresh = window.setInterval(loadEvents, 30000);
    return () => window.clearInterval(refresh);
  }, [currentDate, viewMode]);

  const connectCalendar = async () => {
    setError('');
    if (!CALENDAR_API_URL) {
      setError('Google Calendar URL is missing from this Netlify build. Set VITE_GOOGLE_CALENDAR_URL and redeploy.');
      return;
    }

    try {
      const response = await fetch(`${CALENDAR_API_URL}/auth/url`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to start Google Calendar authorization');
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError('Unable to reach the Railway Google Calendar service. Check its public domain and deployment logs.');
    }
  };

  const disconnectCalendar = async () => {
    setError('');
    try {
      const response = await fetch(`${CALENDAR_API_URL}/auth/disconnect`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to disconnect Google Calendar');
        return;
      }
      setIsConnected(false);
      setEvents([]);
    } catch {
      setError('Unable to reach the Railway Google Calendar service. Check its public domain and deployment logs.');
    }
  };

  const calendarEvents = [...reservationEvents(reservations), ...blockedDatesEvents(blockedDates), ...googleCalendarEvents(events)];
  const range = calendarRange(currentDate, viewMode);
  const visibleEvents = calendarEvents
    .filter((event) => event.startDate < range.endExclusive && event.endDateExclusive > range.start)
    .sort((first, second) => first.startDate.localeCompare(second.startDate));
  const selectedEvents = selectedDate ? dateEvents(calendarEvents, selectedDate) : [];
  const weekStart = startOfWeek(currentDate);
  const heading = viewMode === 'week'
    ? `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : formatMonth(currentDate);
  const unitRows = Array.from(new Map(
    [...reservations, ...blockedDates].filter((item) => item.unit_id).map((item) => [item.unit_id, {
      id: Number(item.unit_id),
      name: item.unit_name || item.unitName || `Unit ${item.unit_id}`,
      building: item.building_name || item.buildingName || 'Property',
    }])
  ).values());

  const blockReasonLabels = {
    owner_stay: 'Owner stay / personal use',
    maintenance: 'Maintenance',
    renovation: 'Renovation',
    deep_cleaning: 'Deep cleaning',
    other: 'Other',
  };

  const handleBlockSubmit = async (event) => {
    event.preventDefault();
    setBlockMessage('');

    if (!blockForm.unitId || !blockForm.blockedFrom || !blockForm.blockedUntil) {
      setBlockMessage('Select a unit and enter a valid date range.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/blocked_dates.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: Number(blockForm.unitId),
          blocked_from: blockForm.blockedFrom,
          blocked_until: blockForm.blockedUntil,
          reason: blockForm.reason,
          notes: blockForm.notes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to block these dates');
      }

      setBlockMessage('Dates blocked successfully.');
      setBlockForm({ unitId: blockForm.unitId, blockedFrom: '', blockedUntil: '', reason: 'owner_stay', notes: '' });
      await loadEvents();
    } catch (blockError) {
      setBlockMessage(blockError.message || 'Unable to block dates.');
    }
  };

  const unblockDates = async (blockedDateId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/blocked_dates.php?blocked_date_id=${encodeURIComponent(blockedDateId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to unblock dates');
      }
      setBlockMessage('Blocked dates removed.');
      await loadEvents();
    } catch (blockError) {
      setBlockMessage(blockError.message || 'Unable to unblock dates.');
    }
  };

  const shiftPeriod = (amount) => {
    setSelectedDate(null);
    setCurrentDate((date) => viewMode === 'week'
      ? addDays(date, amount * 7)
      : new Date(date.getFullYear(), date.getMonth() + amount, 1));
  };

  const openBookingEditor = async (bookingId) => {
    const reservation = reservationById[bookingId];
    if (!reservation) return;

    try {
      const response = await fetch(`${API_BASE_URL}/get_customer.php?bookingId=${bookingId}`, { credentials: 'include' });
      const data = await response.json();
      const customer = data.customer || {};

      setEditingBooking({
        bookingId,
        guestName: customer.fullName || reservation.booked_guest_name || reservation.guest_name || '',
        guestContactNum: customer.contactNum || reservation.booked_guest_contact_num || reservation.guest_contact_num || '',
        guestEmail: customer.email || '',
        unitId: Number(reservation.unit_id || 0),
        checkIn: reservation.check_in_date || '',
        checkOut: reservation.check_out_date || '',
        guests: Number(reservation.num_of_guests || 1),
        paymentAmount: customer.paymentAmount ?? '',
        paymentMethod: customer.paymentMethod || 'cash',
        paymentStatus: customer.paymentStatus || 'pending',
        bookingSource: reservation.booking_source || customer.bookingSource || 'direct',
        notes: reservation.notes || customer.notes || reservation.special_requests || '',
      });
    } catch {
      setEditingBooking({
        bookingId,
        guestName: reservation.booked_guest_name || reservation.guest_name || '',
        guestContactNum: reservation.booked_guest_contact_num || reservation.guest_contact_num || '',
        guestEmail: '',
        unitId: Number(reservation.unit_id || 0),
        checkIn: reservation.check_in_date || '',
        checkOut: reservation.check_out_date || '',
        guests: Number(reservation.num_of_guests || 1),
        paymentAmount: '',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        bookingSource: reservation.booking_source || 'direct',
        notes: reservation.notes || reservation.special_requests || '',
      });
    }
  };

  const handleEditBookingSave = async (event) => {
    event.preventDefault();
    if (!editingBooking) return;

    setSavingBooking(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/admin_update_booking.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: editingBooking.bookingId,
          guestName: editingBooking.guestName,
          guestContactNum: editingBooking.guestContactNum,
          guestEmail: editingBooking.guestEmail,
          unitId: Number(editingBooking.unitId),
          checkIn: editingBooking.checkIn,
          checkOut: editingBooking.checkOut,
          guests: Number(editingBooking.guests || 1),
          paymentAmount: editingBooking.paymentAmount,
          paymentMethod: editingBooking.paymentMethod,
          paymentStatus: editingBooking.paymentStatus,
          bookingSource: editingBooking.bookingSource,
          notes: editingBooking.notes,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update booking');

      setEditingBooking(null);
      await loadEvents();
    } catch (saveError) {
      setError(saveError.message || 'Unable to update booking');
    } finally {
      setSavingBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <HostHeader activeNav="Calendar" />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mt-1 text-3xl font-bold">Calendar</h1>
            <p className="mt-2 text-sm text-neutral-500">View and manage your Google Calendar bookings.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={connectCalendar}
              disabled={isLoading || isConnected}
              className={`rounded-full px-5 py-3 text-sm font-semibold text-white ${
                isConnected
                  ? 'bg-emerald-700 cursor-default'
                  : 'bg-black hover:bg-neutral-800 cursor-pointer disabled:opacity-60'
              }`}
            >
              {isConnected ? 'Connected' : isLoading ? 'Checking connection...' : 'Connect Google Calendar'}
            </button>
            {isConnected && (
              <button
                type="button"
                onClick={disconnectCalendar}
                className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {error && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">Block dates</h2>
          <form onSubmit={handleBlockSubmit} className="grid gap-3 md:grid-cols-5">
            <select
              value={blockForm.unitId}
              onChange={(event) => setBlockForm((current) => ({ ...current, unitId: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select unit</option>
              {unitRows.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={blockForm.blockedFrom}
              onChange={(event) => setBlockForm((current) => ({ ...current, blockedFrom: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={blockForm.blockedUntil}
              onChange={(event) => setBlockForm((current) => ({ ...current, blockedUntil: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={blockForm.reason}
              onChange={(event) => setBlockForm((current) => ({ ...current, reason: event.target.value }))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="owner_stay">Owner stay / personal use</option>
              <option value="maintenance">Maintenance</option>
              <option value="renovation">Renovation</option>
              <option value="deep_cleaning">Deep cleaning</option>
              <option value="other">Other</option>
            </select>
            <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">
              Save block
            </button>
          </form>
          <input
            type="text"
            value={blockForm.notes}
            onChange={(event) => setBlockForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes or reason details"
            className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          />
          {blockMessage && <p className="mt-3 text-sm text-neutral-700">{blockMessage}</p>}
          {blockedDates.length > 0 && (
            <div className="mt-4 space-y-2">
              {blockedDates.map((entry) => (
                <div key={entry.blocked_date_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <span>
                    <strong>{entry.unit_name}</strong> · {entry.blocked_from} to {entry.blocked_until} · {entry.reason?.replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => unblockDates(entry.blocked_date_id)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-50"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shiftPeriod(-1)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer" aria-label="Previous period">Previous</button>
              <button type="button" onClick={() => { setCurrentDate(new Date()); setSelectedDate(null); }} className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer">Today</button>
              <button type="button" onClick={() => shiftPeriod(1)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer" aria-label="Next period">Next</button>
              <h2 className="ml-2 m-0 text-base font-semibold">{heading}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-neutral-300 p-1" role="group" aria-label="Calendar layout">
                {[
                  ['classic', 'Classic'],
                  ['units', 'Units rows'],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={calendarLayout === mode}
                    onClick={() => setCalendarLayout(mode)}
                    className={`rounded px-3 py-1.5 text-sm cursor-pointer ${calendarLayout === mode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-md border border-neutral-300 p-1" role="group" aria-label="Calendar view">
                {[
                  ['month', 'Month'],
                  ['week', 'Week'],
                  ['agenda', 'Agenda'],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={viewMode === mode}
                    onClick={() => { setViewMode(mode); setSelectedDate(null); }}
                    className={`rounded px-3 py-1.5 text-sm cursor-pointer ${viewMode === mode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {isLoading ? (
            <p className="px-5 py-12 text-center text-sm text-neutral-500">Loading calendar...</p>
          ) : (
            viewMode === 'agenda' ? (
              <AgendaView events={visibleEvents} />
            ) : (
              <div className="overflow-x-auto p-4">
                <CalendarGrid
                  weeks={viewMode === 'week'
                    ? [Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))]
                    : monthWeeks(currentDate)}
                  events={calendarEvents}
                  selectedDate={selectedDate}
                  visibleMonth={viewMode === 'month' ? currentDate.getMonth() : null}
                  onSelectDate={setSelectedDate}
                  onBookingClick={openBookingEditor}
                  units={viewMode === 'month' ? unitRows : []}
                  monthDays={viewMode === 'month' ? monthDays(currentDate) : []}
                  layout={calendarLayout}
                />
              </div>
            )
          )}
        </section>
        {editingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Booking editor</p>
                  <h2 className="mt-1 text-2xl font-semibold text-neutral-900">Update booking</h2>
                </div>
                <button type="button" onClick={() => setEditingBooking(null)} className="text-2xl leading-none text-neutral-400 hover:text-neutral-700">×</button>
              </div>

              <form onSubmit={handleEditBookingSave} className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Guest name
                  <input
                    type="text"
                    value={editingBooking.guestName}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, guestName: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Contact number
                  <input
                    type="tel"
                    value={editingBooking.guestContactNum}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, guestContactNum: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Guest email
                  <input
                    type="email"
                    value={editingBooking.guestEmail}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, guestEmail: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Unit
                  <select
                    value={editingBooking.unitId}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, unitId: Number(event.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="">Select unit</option>
                    {unitOptions.map((unit) => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Check-in
                  <input
                    type="date"
                    value={editingBooking.checkIn}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, checkIn: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Check-out
                  <input
                    type="date"
                    value={editingBooking.checkOut}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, checkOut: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Pax
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={editingBooking.guests}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, guests: Number(event.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Payment amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingBooking.paymentAmount}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, paymentAmount: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Payment method
                  <select
                    value={editingBooking.paymentMethod}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, paymentMethod: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="e-wallet">E-wallet</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="card">Card</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Payment status
                  <select
                    value={editingBooking.paymentStatus}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, paymentStatus: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-1">
                  Booking source
                  <select
                    value={editingBooking.bookingSource}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, bookingSource: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="direct">Direct</option>
                    <option value="website">Website</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="booking_com">Booking.com</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="referral">Referral</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-neutral-700 md:col-span-2">
                  Notes
                  <textarea
                    value={editingBooking.notes}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, notes: event.target.value }))}
                    rows="3"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>

                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingBooking(null)} className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100">Cancel</button>
                  <button type="submit" disabled={savingBooking} className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {savingBooking ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedDate && !isLoading && (
          <section className="mt-6 border-t border-neutral-200 pt-5" aria-live="polite">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="m-0 text-lg font-semibold">
                {parseDateKey(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                <span className="ml-2 text-sm font-normal text-neutral-500">{selectedEvents.length} {selectedEvents.length === 1 ? 'booking' : 'bookings'}</span>
              </h2>
              <button type="button" onClick={() => setSelectedDate(null)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 cursor-pointer">Close</button>
            </div>
            {selectedEvents.length ? (
              <ul className="m-0 divide-y divide-neutral-200 border-y border-neutral-200 p-0">
                {selectedEvents.map((event) => {
                  const bookingId = event.source === 'booking' ? Number((event.id || '').replace('booking-', '')) : null;
                  return (
                    <li
                      key={event.id}
                      onClick={() => bookingId ? openBookingEditor(bookingId) : undefined}
                      className={`flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 py-3 ${bookingId ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
                    >
                      <span className="font-medium">{event.summary}</span>
                      <span className="text-sm text-neutral-600">{event.detail || (event.source === 'google' ? 'Google Calendar' : '')}</span>
                      <span className="w-full text-xs text-neutral-500">
                        {event.startDate} to {dateKey(addDays(parseDateKey(event.endDateExclusive), -1))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-neutral-500">No bookings on this date.</p>}
          </section>
        )}
      </main>
    </div>
  );
}

function CalendarGrid({ weeks, events, selectedDate, visibleMonth, onSelectDate, onBookingClick, units = [], monthDays: monthDayList = [], layout = 'classic' }) {
  if (layout === 'units' && units.length && monthDayList.length) {
    const monthStart = monthDayList[0];
    const monthEnd = addDays(monthDayList[monthDayList.length - 1], 1);
    const monthStartKey = dateKey(monthStart);
    const monthEndKey = dateKey(monthEnd);

    return (
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <div className="min-w-[920px]">
          <div className="grid border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500" style={{ gridTemplateColumns: '220px repeat(' + monthDayList.length + ', minmax(36px, 1fr))' }}>
            <div className="border-r border-neutral-200 px-3 py-3">Unit</div>
            {monthDayList.map((day) => (
              <div key={dateKey(day)} className={`border-r border-neutral-200 px-2 py-3 text-center ${day.getDate() === 1 ? 'font-bold text-neutral-700' : ''}`}>
                <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`mt-1 ${selectedDate === dateKey(day) ? 'rounded-full bg-emerald-600 px-1.5 py-0.5 text-white' : ''}`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {units.map((unit) => {
            const unitBookings = events.filter((event) => {
              if (!event.unit_id || event.unit_id !== unit.id) return false;
              return event.startDate < monthEndKey && event.endDateExclusive > monthStartKey;
            });

            return (
              <div key={unit.id} className="grid border-b border-neutral-200 last:border-b-0" style={{ gridTemplateColumns: '220px repeat(' + monthDayList.length + ', minmax(36px, 1fr))' }}>
                <button
                  type="button"
                  onClick={() => onSelectDate(null)}
                  className="cursor-default border-r border-neutral-200 bg-white px-3 py-4 text-left text-sm font-medium text-neutral-800"
                >
                  <div>{unit.name}</div>
                  <div className="mt-1 text-xs text-neutral-500">{unit.building}</div>
                </button>

                <div className="relative col-span-full grid bg-white" style={{ gridTemplateColumns: `repeat(${monthDayList.length}, minmax(36px, 1fr))`, gridColumn: `2 / ${monthDayList.length + 2}` }}>
                  {monthDayList.map((day) => {
                    const key = dateKey(day);
                    const isToday = key === dateKey(new Date());
                    const isSelected = selectedDate === key;
                    return (
                      <button
                        key={`${unit.id}-${key}`}
                        type="button"
                        onClick={() => onSelectDate(key)}
                        className={`min-h-[76px] border-r border-neutral-100 px-1 py-1 text-left ${isToday ? 'bg-amber-50' : 'bg-white'} ${isSelected ? 'ring-1 ring-inset ring-emerald-600' : ''}`}
                        aria-label={`${unit.name} on ${key}`}
                      />
                    );
                  })}

                  {unitBookings.map((event) => {
                    const startDate = parseDateKey(event.startDate);
                    const endDate = parseDateKey(event.endDateExclusive);
                    const startOffset = Math.max(0, Math.round((startDate - monthStart) / 86400000));
                    const endOffset = Math.min(monthDayList.length, Math.round((endDate - monthStart) / 86400000));
                    const leftPercent = (startOffset / monthDayList.length) * 100;
                    const widthPercent = Math.max(((endOffset - startOffset) / monthDayList.length) * 100, 8);

                    return (
                      <button
                        key={`${unit.id}-${event.id}`}
                        type="button"
                        onClick={() => {
                          if (event.source === 'booking' && onBookingClick) {
                            onBookingClick(Number(String(event.id).replace('booking-', '')));
                            return;
                          }
                          onSelectDate(event.startDate);
                        }}
                        className={`absolute top-2 z-10 overflow-hidden rounded-md border border-emerald-700 bg-emerald-700/90 px-2 py-1 text-left text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-700 ${event.source === 'google' ? 'bg-slate-800/90 border-slate-800' : ''}`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                        title={`${event.summary} (${event.startDate} to ${event.endDateExclusive})`}
                      >
                        {event.summary}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[680px] overflow-hidden rounded-lg border border-neutral-200">
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center text-xs font-semibold text-neutral-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      {weeks.map((week) => {
        const weekStartKey = dateKey(week[0]);
        const weekEndKey = dateKey(addDays(week[0], 7));
        const segments = events
          .filter((event) => event.startDate < weekEndKey && event.endDateExclusive > weekStartKey)
          .map((event) => ({
            event,
            startColumn: Math.max(0, daysBetween(weekStartKey, event.startDate)),
            endColumn: Math.min(7, daysBetween(weekStartKey, event.endDateExclusive)),
          }))
          .filter((segment) => segment.endColumn > segment.startColumn)
          .sort((first, second) => first.startColumn - second.startColumn || second.endColumn - first.endColumn);
        const laneEnds = [];
        const placedSegments = segments.map((segment) => {
          let lane = laneEnds.findIndex((endColumn) => endColumn <= segment.startColumn);
          if (lane < 0) lane = laneEnds.length;
          laneEnds[lane] = segment.endColumn;
          return { ...segment, lane };
        });
        const visibleSegments = placedSegments.filter((segment) => segment.lane < 3);

        return (
          <div key={weekStartKey} className="grid grid-cols-7 border-b border-neutral-200 last:border-b-0" style={{ gridTemplateRows: '34px repeat(3, 25px)' }}>
            {week.map((day, column) => {
              const key = dateKey(day);
              const dayEvents = dateEvents(events, key);
              const visibleCount = visibleSegments.filter((segment) => segment.startColumn <= column && segment.endColumn > column).length;
              const hiddenCount = dayEvents.length - visibleCount;
              const isOutsideMonth = visibleMonth !== null && day.getMonth() !== visibleMonth;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectDate(key)}
                  aria-pressed={selectedDate === key}
                  className={`relative min-w-0 border-r border-neutral-100 px-1 py-1 text-left text-xs last:border-r-0 hover:bg-neutral-50 ${selectedDate === key ? 'bg-emerald-50' : 'bg-white'} ${isOutsideMonth ? 'text-neutral-400' : 'text-neutral-800'}`}
                  style={{ gridColumn: column + 1, gridRow: 1 }}
                >
                  <span className="font-semibold">{day.getDate()}</span>
                  {hiddenCount > 0 && <span className="ml-1 text-[10px] font-semibold text-emerald-800">+{hiddenCount} more</span>}
                </button>
              );
            })}
            {visibleSegments.map(({ event, startColumn, endColumn, lane }) => (
              <button
                key={`${event.id}-${weekStartKey}`}
                type="button"
                title={`${event.summary}${event.detail ? `: ${event.detail}` : ''}`}
                onClick={() => {
                  if (event.source === 'booking' && onBookingClick) {
                    onBookingClick(Number(String(event.id).replace('booking-', '')));
                    return;
                  }
                  onSelectDate(event.startDate < weekStartKey ? weekStartKey : event.startDate);
                }}
                className={`mx-0.5 my-0.5 min-w-0 overflow-hidden rounded px-1 text-left text-[10px] font-medium text-white cursor-pointer ${event.source === 'google' ? 'bg-neutral-900 hover:bg-neutral-700' : event.source === 'blocked' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'}`}
                style={{
                  gridColumn: `${startColumn + 1} / ${endColumn + 1}`,
                  gridRow: lane + 2,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {event.summary}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AgendaView({ events }) {
  if (!events.length) {
    return <p className="px-5 py-12 text-center text-sm text-neutral-500">No bookings in this period.</p>;
  }

  return (
    <ul className="m-0 divide-y divide-neutral-200 p-0">
      {events.map((event) => (
        <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 px-5 py-4">
          <div>
            <p className="m-0 font-semibold">{event.summary}</p>
            {event.detail && <p className="mt-1 text-sm text-neutral-500">{event.detail}</p>}
          </div>
          <p className="m-0 text-sm text-neutral-600">
            {parseDateKey(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' - '}
            {parseDateKey(dateKey(addDays(parseDateKey(event.endDateExclusive), -1))).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </li>
      ))}
    </ul>
  );
}
