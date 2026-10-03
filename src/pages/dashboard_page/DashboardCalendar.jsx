import { useEffect, useMemo, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

const CALENDAR_API_URL = (
  import.meta.env.VITE_GOOGLE_CALENDAR_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '')
).replace(/\/+$/, '');
const BOOKING_STATUSES = [
  'pending',
  'awaiting_payment',
  'payment_review',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'rejected',
];

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

function bookingColors(reservations) {
  const bookingIds = [...new Set(reservations.map((reservation) => String(reservation.booking_id)))]
    .sort((first, second) => Number(first) - Number(second));

  return Object.fromEntries(
    bookingIds.map((bookingId, index) => [
      bookingId,
      `hsl(${(index * 137.508) % 360} 68% 38%)`,
    ])
  );
}

function reservationEvents(reservations, colors) {
  return reservations
    .filter((reservation) => !['cancelled', 'rejected'].includes(reservation.status))
    .map((reservation) => {
      const guestName = String(
        reservation.booked_guest_name || reservation.guest_name || 'Guest'
      ).trim();
      const firstName = guestName.split(/\s+/)[0] || 'Guest';
      const pax = Number(reservation.num_of_guests ?? 0);

      return {
        id: `booking-${reservation.booking_id}`,
        summary: `${firstName} - ${pax} pax`,
        startDate: reservation.check_in_date,
        endDateExclusive: reservation.check_out_date,
        detail: reservation.unit_name || '',
        source: 'booking',
        color: colors[String(reservation.booking_id)],
        unit_id: reservation.unit_id,
      };
    });
}

function modificationRequestEvents(reservations) {
  return reservations
    .filter((reservation) => reservation.modification_request_id && reservation.requested_check_in && reservation.requested_check_out)
    .map((reservation) => {
      return {
        id: `modification-${reservation.modification_request_id}`,
        summary: reservation.unit_number || reservation.unit_name || '',
        startDate: reservation.requested_check_in,
        endDateExclusive: reservation.requested_check_out,
        detail: reservation.modification_reason || 'Customer modification request',
        source: 'modification',
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

function buildAssetUrl(path) {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path) || /^data:/i.test(path)) {
    return path;
  }

  const normalizedPath = String(path)
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^api\//i, '');

  const cleanPath = normalizedPath.replace(/^\/+/, '');
  return `${API_BASE_URL.replace(/\/+$/, '')}/${cleanPath}`;
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
  const [selectedCalendarModification, setSelectedCalendarModification] = useState(null);
  const [updatingCalendarModification, setUpdatingCalendarModification] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  const reservationById = useMemo(() => Object.fromEntries(
    reservations.map((reservation) => [reservation.booking_id, reservation])
  ), [reservations]);
  const colorsByBookingId = useMemo(() => bookingColors(reservations), [reservations]);
  const bookingSummary = useMemo(() => {
    const summary = Object.fromEntries(BOOKING_STATUSES.map((status) => [status, 0]));
    reservations.forEach(({ status }) => {
      if (status) summary[status] = (summary[status] || 0) + 1;
    });
    return summary;
  }, [reservations]);

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
          label: unit.unit_number || unit.unit_name || `Unit ${unit.unit_id}`,
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

  const calendarEvents = [
    ...reservationEvents(reservations, colorsByBookingId),
    ...modificationRequestEvents(reservations),
    ...blockedDatesEvents(blockedDates),
    ...googleCalendarEvents(events),
  ];
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
      name: item.unit_number || item.unit_name || item.unitName || `Unit ${item.unit_id}`,
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

  const openModificationDialog = (event) => {
    if (!event || event.source !== 'modification') {
      return;
    }

    const requestId = Number(String(event.id).replace('modification-', ''));
    const reservation = reservations.find((item) => Number(item.modification_request_id) === requestId);

    if (!reservation) {
      return;
    }

    setSelectedCalendarModification(reservation);
  };

  const handleCalendarModificationUpdate = async (requestId, action) => {
    setError('');
    setUpdatingCalendarModification(requestId);
    setSelectedCalendarModification(null);

    try {
      const response = await fetch(`${API_BASE_URL}/modify_request.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: Number(requestId), action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to process modification request');
      }

      await loadEvents();
    } catch (modificationError) {
      setError(modificationError.message || 'Unable to process modification request');
    } finally {
      setUpdatingCalendarModification(null);
      setSelectedCalendarModification(null);
    }
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
        guests: Number(reservation.num_of_guests ?? 0),
        paymentAmount: customer.paymentAmount ?? '',
        paymentMethod: customer.paymentMethod || 'cash',
        paymentStatus: customer.paymentStatus || 'pending',
        bookingStatus: reservation.status || customer.bookingStatus || 'pending',
        bookingSource: reservation.booking_source || customer.bookingSource || 'direct',
        notes: reservation.notes || customer.notes || reservation.special_requests || '',
        validIdPath: customer.validIdPath || '',
        proofOfPaymentPath: customer.proofOfPaymentPath || '',
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
        guests: Number(reservation.num_of_guests ?? 0),
        paymentAmount: '',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        bookingStatus: reservation.status || 'pending',
        bookingSource: reservation.booking_source || 'direct',
        notes: reservation.notes || reservation.special_requests || '',
        validIdPath: '',
        proofOfPaymentPath: '',
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
          guests: Number(editingBooking.guests ?? 0),
          paymentAmount: editingBooking.paymentAmount,
          paymentMethod: editingBooking.paymentMethod,
          paymentStatus: editingBooking.paymentStatus,
          bookingStatus: editingBooking.bookingStatus,
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
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-10 md:px-10">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-8 sm:items-end sm:gap-4">
          <div>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Calendar</h1>
            <p className="mt-2 text-xs text-neutral-500 sm:text-sm">View and manage your Google Calendar bookings.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <button
              type="button"
              onClick={connectCalendar}
              disabled={isLoading || isConnected}
              className={`rounded-full px-3 py-2 text-xs font-semibold text-white sm:px-5 sm:py-3 sm:text-sm ${
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
                className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer sm:px-5 sm:py-3 sm:text-sm"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {error && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-neutral-200 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:flex-nowrap">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                    className={`rounded px-2 py-1.5 text-xs cursor-pointer sm:px-3 sm:text-sm ${viewMode === mode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border border-neutral-300 p-1" role="group" aria-label="Calendar layout">
                  {[
                    ['classic', 'Classic'],
                    ['units', 'Timeline'],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={calendarLayout === mode}
                      onClick={() => setCalendarLayout(mode)}
                      className={`rounded px-2 py-1.5 text-xs cursor-pointer sm:px-3 sm:text-sm ${calendarLayout === mode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="m-0 hidden text-sm text-neutral-500 sm:block">
                  {calendarLayout === 'classic'
                    ? 'View reservations in a traditional calendar format.'
                    : 'See all units and reservations across dates.'}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-start">
              <h2 className="m-0 mr-1 whitespace-nowrap text-xs font-semibold sm:mr-2 sm:text-sm">{heading}</h2>
              <button type="button" onClick={() => shiftPeriod(-1)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50 cursor-pointer sm:px-3 sm:py-2 sm:text-sm" aria-label="Previous period">Previous</button>
              <button type="button" onClick={() => { setCurrentDate(new Date()); setSelectedDate(null); }} className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50 cursor-pointer sm:px-3 sm:py-2 sm:text-sm">Today</button>
              <button type="button" onClick={() => shiftPeriod(1)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50 cursor-pointer sm:px-3 sm:py-2 sm:text-sm" aria-label="Next period">Next</button>
            </div>
          </div>
          {isLoading ? (
            <p className="px-5 py-12 text-center text-sm text-neutral-500">Loading calendar...</p>
          ) : (
            viewMode === 'agenda' ? (
              <AgendaView events={visibleEvents} onModificationClick={openModificationDialog} />
            ) : (
              <div className="overflow-x-auto p-2 sm:p-4">
                <CalendarGrid
                  weeks={viewMode === 'week'
                    ? [Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))]
                    : monthWeeks(currentDate)}
                  events={calendarEvents}
                  selectedDate={selectedDate}
                  visibleMonth={viewMode === 'month' ? currentDate.getMonth() : null}
                  onSelectDate={setSelectedDate}
                  onBookingClick={openBookingEditor}
                  onModificationClick={openModificationDialog}
                  units={viewMode === 'month' ? unitRows : []}
                  monthDays={viewMode === 'month' ? monthDays(currentDate) : []}
                  layout={calendarLayout}
                />
              </div>
            )
          )}
        </section>
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 sm:mt-8 sm:p-4">
          <h2 className="mb-3 text-base font-semibold sm:text-lg">Block dates</h2>
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
                    <strong>{entry.unit_number || entry.unit_name}</strong> · {entry.blocked_from} to {entry.blocked_until} · {entry.reason?.replace('_', ' ')}
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
        {zoomedImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 py-6" onClick={() => setZoomedImage(null)}>
            <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2 py-1 text-sm text-white hover:bg-black"
              >
                ×
              </button>
              <img src={zoomedImage} alt="Zoomed document preview" className="max-h-[82vh] max-w-full rounded-xl object-contain" />
            </div>
          </div>
        )}

        {selectedCalendarModification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Modification request</p>
                  <h2 className="mt-1 text-2xl font-semibold text-neutral-900">Customer booking change</h2>
                </div>
                <button type="button" onClick={() => setSelectedCalendarModification(null)} className="text-2xl leading-none text-neutral-400 hover:text-neutral-700">×</button>
              </div>

              <div className="space-y-4 text-sm text-neutral-700">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Guest</p>
                    <p className="mt-1 font-medium text-neutral-900">{selectedCalendarModification.booked_guest_name || selectedCalendarModification.guest_name || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Property</p>
                    <p className="mt-1 font-medium text-neutral-900">{selectedCalendarModification.building_name || selectedCalendarModification.unit_name || 'Property'}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Current stay</p>
                    <p className="mt-1 font-medium">{selectedCalendarModification.check_in_date} → {selectedCalendarModification.check_out_date}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Requested stay</p>
                    <p className="mt-1 font-medium">{selectedCalendarModification.requested_check_in} → {selectedCalendarModification.requested_check_out}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Current guests</p>
                    <p className="mt-1 font-medium">{selectedCalendarModification.num_of_guests ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Requested guests</p>
                    <p className="mt-1 font-medium">{selectedCalendarModification.requested_guests ?? 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Reason</p>
                  <p className="mt-1 font-medium text-neutral-900">{selectedCalendarModification.modification_reason || selectedCalendarModification.request_reason || 'No reason provided'}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Special requests</p>
                  <p className="mt-1 whitespace-pre-wrap">{selectedCalendarModification.requested_special_requests || selectedCalendarModification.special_requests || 'None'}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Additional payment</p>
                    <p className="mt-1 font-medium">{selectedCalendarModification.modification_payment_amount ? `₱${Number(selectedCalendarModification.modification_payment_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Refund</p>
                    <p className="mt-1 font-medium">{selectedCalendarModification.modification_refund_amount ? `₱${Number(selectedCalendarModification.modification_refund_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00'}</p>
                  </div>
                </div>

                {selectedCalendarModification.modification_proof_of_payment ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-violet-700">Proof of payment</p>
                    <button
                      type="button"
                      onClick={() => setZoomedImage(buildAssetUrl(selectedCalendarModification.modification_proof_of_payment))}
                      className="mt-3 block w-full overflow-hidden rounded-lg border border-violet-200 bg-white"
                    >
                      <img
                        src={buildAssetUrl(selectedCalendarModification.modification_proof_of_payment)}
                        alt="Modification proof of payment"
                        className="h-44 w-full object-cover"
                      />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-neutral-500">No payment proof uploaded for this modification request.</p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleCalendarModificationUpdate(selectedCalendarModification.modification_request_id, 'reject')}
                  disabled={updatingCalendarModification === Number(selectedCalendarModification.modification_request_id)}
                  className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
                >
                  {updatingCalendarModification === Number(selectedCalendarModification.modification_request_id) ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCalendarModificationUpdate(selectedCalendarModification.modification_request_id, 'approve')}
                  disabled={updatingCalendarModification === Number(selectedCalendarModification.modification_request_id)}
                  className="rounded-full bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
                >
                  {updatingCalendarModification === Number(selectedCalendarModification.modification_request_id) ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editingBooking && (
          <div
            className="host-booking-editor-overlay fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 px-4 py-6"
            onClick={() => setEditingBooking(null)}
          >
            <div
              className="host-booking-editor-dialog max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
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
                    min="0"
                    step="1"
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
                  Booking status
                  <select
                    value={editingBooking.bookingStatus}
                    onChange={(event) => setEditingBooking((current) => ({ ...current, bookingStatus: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="awaiting_payment">Awaiting payment</option>
                    <option value="payment_review">Payment review</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked in</option>
                    <option value="checked_out">Checked out</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
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

                {(editingBooking.validIdPath || editingBooking.proofOfPaymentPath) && (
                  <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
                    {editingBooking.validIdPath && (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Government ID</p>
                        <button
                          type="button"
                          onClick={() => setZoomedImage(buildAssetUrl(editingBooking.validIdPath))}
                          className="block w-full text-left"
                        >
                          <img
                            src={buildAssetUrl(editingBooking.validIdPath)}
                            alt="Government ID"
                            className="h-40 w-full rounded-lg border border-neutral-200 object-cover transition hover:opacity-90"
                          />
                        </button>
                      </div>
                    )}

                    {editingBooking.proofOfPaymentPath && (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Proof of payment</p>
                        <button
                          type="button"
                          onClick={() => setZoomedImage(buildAssetUrl(editingBooking.proofOfPaymentPath))}
                          className="block w-full text-left"
                        >
                          <img
                            src={buildAssetUrl(editingBooking.proofOfPaymentPath)}
                            alt="Proof of payment"
                            className="h-40 w-full rounded-lg border border-neutral-200 object-cover transition hover:opacity-90"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                )}

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
                  const isModification = event.source === 'modification';
                  return (
                    <li
                      key={event.id}
                      onClick={() => {
                        if (isModification) {
                          openModificationDialog(event);
                          return;
                        }
                        if (bookingId) {
                          openBookingEditor(bookingId);
                        }
                      }}
                      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 sm:px-3 ${bookingId || isModification ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
                    >
                      {event.source === 'booking' && (
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                      )}
                      <span className="text-sm font-medium sm:text-base">{event.summary}</span>
                      <span className="text-xs text-neutral-600 sm:text-sm">{event.detail || (event.source === 'google' ? 'Google Calendar' : '')}</span>
                      <span className="w-full text-[11px] text-neutral-500 sm:text-xs">
                        {event.startDate} to {dateKey(addDays(parseDateKey(event.endDateExclusive), -1))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-neutral-500">No bookings on this date.</p>}
          </section>
        )}

        <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-1 text-lg font-semibold">Booking summary</h2>
          <p className="mb-4 mt-0 text-sm text-neutral-500">Bookings by current status.</p>
          <ul className="m-0 divide-y divide-neutral-200 border-y border-neutral-200 p-0">
            {Object.entries(bookingSummary).map(([status, total]) => (
              <li key={status} className="flex items-center justify-between gap-4 py-3 text-sm capitalize">
                <span>{status.replaceAll('_', ' ')}</span>
                <span className="font-semibold tabular-nums">{total}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function CalendarGrid({ weeks, events, selectedDate, visibleMonth, onSelectDate, onBookingClick, onModificationClick, units = [], monthDays: monthDayList = [], layout = 'classic' }) {
  if (layout === 'units' && units.length && monthDayList.length) {
    const monthStart = monthDayList[0];
    const monthEnd = addDays(monthDayList[monthDayList.length - 1], 1);
    const monthStartKey = dateKey(monthStart);
    const monthEndKey = dateKey(monthEnd);

    return (
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <div className="min-w-[920px]">
          <div className="grid border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500" style={{ gridTemplateColumns: '220px repeat(' + monthDayList.length + ', minmax(36px, 1fr))' }}>
            <div className="border-r border-neutral-200 px-2 py-2 sm:px-3 sm:py-3">Unit</div>
            {monthDayList.map((day) => (
              <div key={dateKey(day)} className={`border-r border-neutral-200 px-1 py-2 text-center sm:px-2 sm:py-3 ${day.getDate() === 1 ? 'font-bold text-neutral-700' : ''}`}>
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
                  className="cursor-default border-r border-neutral-200 bg-white px-2 py-2 text-left text-sm font-medium text-neutral-800 sm:px-3 sm:py-4"
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
                        className={`min-h-[56px] border-r border-neutral-100 px-1 py-1 text-left sm:min-h-[76px] ${isToday ? 'bg-amber-50' : 'bg-white'} ${isSelected ? 'ring-1 ring-inset ring-emerald-600' : ''}`}
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
                    const widthPercent = (Math.max(0, endOffset - startOffset) / monthDayList.length) * 100;

                    return (
                      <button
                        key={`${unit.id}-${event.id}`}
                        type="button"
                        onClick={() => {
                          if (event.source === 'modification' && onModificationClick) {
                            onModificationClick(event);
                            return;
                          }
                          if (event.source === 'booking' && onBookingClick) {
                            onBookingClick(Number(String(event.id).replace('booking-', '')));
                            return;
                          }
                          onSelectDate(event.startDate);
                        }}
                        className={`absolute top-1 z-10 overflow-hidden rounded-md border px-1 py-0.5 text-left text-[10px] font-semibold text-white shadow-sm sm:top-2 sm:px-2 sm:py-1 ${event.source === 'google' ? 'border-slate-800 bg-slate-800/90 hover:bg-slate-800' : event.source === 'blocked' ? 'border-amber-700 bg-amber-700/90 hover:bg-amber-700' : event.source === 'modification' ? 'border-violet-700 bg-violet-700/90 hover:bg-violet-700' : 'hover:brightness-90'}`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          ...(event.source === 'booking' ? { backgroundColor: event.color, borderColor: event.color } : {}),
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
    <div className="w-full min-w-[320px] overflow-hidden rounded-lg border border-neutral-200 sm:min-w-[680px]">
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
          <div key={weekStartKey} className="grid grid-cols-7 grid-rows-[30px_repeat(3,22px)] border-b border-neutral-200 last:border-b-0 sm:grid-rows-[34px_repeat(3,25px)]">
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
                  {hiddenCount > 0 && (
                    <span className="ml-1 whitespace-nowrap text-[10px] font-semibold text-emerald-800">
                      +{hiddenCount}<span className="hidden sm:inline"> more</span>
                    </span>
                  )}
                </button>
              );
            })}
            {visibleSegments.map(({ event, startColumn, endColumn, lane }) => (
              <button
                key={`${event.id}-${weekStartKey}`}
                type="button"
                title={`${event.summary}${event.detail ? `: ${event.detail}` : ''}`}
                onClick={() => {
                  if (event.source === 'modification' && onModificationClick) {
                    onModificationClick(event);
                    return;
                  }
                  if (event.source === 'booking' && onBookingClick) {
                    onBookingClick(Number(String(event.id).replace('booking-', '')));
                    return;
                  }
                  onSelectDate(event.startDate < weekStartKey ? weekStartKey : event.startDate);
                }}
                className={`mx-0.5 my-0.5 min-w-0 overflow-hidden rounded px-0.5 text-left text-[8px] font-medium text-white cursor-pointer sm:px-1 sm:text-[10px] ${event.source === 'google' ? 'bg-neutral-900 hover:bg-neutral-700' : event.source === 'blocked' ? 'bg-amber-600 hover:bg-amber-700' : event.source === 'modification' ? 'bg-violet-700 hover:bg-violet-800' : 'hover:brightness-90'}`}
                style={{
                  gridColumn: `${startColumn + 1} / ${endColumn + 1}`,
                  gridRow: lane + 2,
                  ...(event.source === 'booking' ? { backgroundColor: event.color } : {}),
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

function AgendaView({ events, onModificationClick }) {
  if (!events.length) {
    return <p className="px-5 py-12 text-center text-sm text-neutral-500">No bookings in this period.</p>;
  }

  return (
    <ul className="m-0 divide-y divide-neutral-200 p-0">
      {events.map((event) => (
        <li
          key={event.id}
          onClick={() => {
            if (event.source === 'modification' && onModificationClick) {
              onModificationClick(event);
            }
          }}
          className={`flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 px-5 py-4 ${event.source === 'modification' ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
        >
          <div className="flex items-start gap-2">
            {event.source === 'booking' && (
              <span
                aria-hidden="true"
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: event.color }}
              />
            )}
            <div>
            <p className="m-0 font-semibold">{event.summary}</p>
            {event.detail && <p className="mt-1 text-sm text-neutral-500">{event.detail}</p>}
            </div>
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
