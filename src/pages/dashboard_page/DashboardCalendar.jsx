import { useEffect, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

const CALENDAR_API_URL = import.meta.env.VITE_GOOGLE_CALENDAR_URL || 'http://localhost:3001';

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function twoMonthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59);
}

function formatMonth(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function eventDate(event) {
  return event.start?.date || event.start?.dateTime?.slice(0, 10);
}

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function reservationEvents(reservations) {
  return reservations.filter((reservation) => !['cancelled', 'rejected'].includes(reservation.status)).flatMap((reservation) => {
    const events = [];
    const current = new Date(`${reservation.check_in_date}T00:00:00`);
    const checkout = new Date(`${reservation.check_out_date}T00:00:00`);

    while (current < checkout) {
      events.push({
        id: `booking-${reservation.booking_id}-${dateKey(current)}`,
        summary: `Booking: ${reservation.building_name}`,
        date: dateKey(current),
        detail: `${reservation.unit_name} · ${reservation.booked_guest_name || reservation.guest_name}`,
      });
      current.setDate(current.getDate() + 1);
    }

    return events;
  });
}

export default function DashboardCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => monthStart(new Date()));
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvents = async () => {
    setIsLoading(true);
    setError('');
    try {
      const reservationsResponse = await fetch(`${API_BASE_URL}/reservations.php`, { credentials: 'include' });
      const reservationsData = await reservationsResponse.json();
      if (!reservationsResponse.ok) throw new Error(reservationsData.error || 'Unable to load bookings');
      setReservations(reservationsData.reservations || []);

      const statusResponse = await fetch(`${CALENDAR_API_URL}/auth/status`);
      const status = await statusResponse.json();
      setIsConnected(status.connected);
      if (status.connected) {
        const response = await fetch(
          `${CALENDAR_API_URL}/events?timeMin=${encodeURIComponent(monthStart(currentMonth).toISOString())}&timeMax=${encodeURIComponent(twoMonthEnd(currentMonth).toISOString())}`
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
  }, [currentMonth]);

  const connectCalendar = async () => {
    setError('');
    const response = await fetch(`${CALENDAR_API_URL}/auth/url`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to start Google Calendar authorization');
      return;
    }
    window.location.assign(data.url);
  };

  const calendarEvents = [
    ...reservationEvents(reservations),
    ...events.map((event) => ({ ...event, date: eventDate(event), source: 'google' })),
  ];

  const eventsByDay = calendarEvents.reduce((groups, event) => {
    const date = event.date;
    if (date) groups[date] = [...(groups[date] || []), event];
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <HostHeader activeNav="Calendar" />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mt-1 text-3xl font-bold">Calendar</h1>
            <p className="mt-2 text-sm text-neutral-500">View and manage your Google Calendar bookings.</p>
          </div>
          {!isConnected && (
            <button type="button" onClick={connectCalendar} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 cursor-pointer">
              Connect Google Calendar
            </button>
          )}
        </div>

        {error && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="rounded-full px-3 py-2 text-sm hover:bg-neutral-100 cursor-pointer" aria-label="Previous two months">Previous</button>
            <p className="m-0 text-sm text-neutral-500">Two-month view</p>
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="rounded-full px-3 py-2 text-sm hover:bg-neutral-100 cursor-pointer" aria-label="Next two months">Next</button>
          </div>
          {isLoading ? (
            <p className="px-5 py-12 text-center text-sm text-neutral-500">Loading calendar...</p>
          ) : (
            <div className="grid gap-5 p-4 md:grid-cols-2">
              <CalendarMonth month={currentMonth} eventsByDay={eventsByDay} />
              <CalendarMonth month={new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)} eventsByDay={eventsByDay} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function CalendarMonth({ month, eventsByDay }) {
  const firstDay = monthStart(month).getDay();
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: Math.ceil((firstDay + totalDays) / 7) * 7 }, (_, index) => {
    const dayNumber = index - firstDay + 1;
    return dayNumber > 0 && dayNumber <= totalDays
      ? new Date(month.getFullYear(), month.getMonth(), dayNumber)
      : null;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <h2 className="border-b border-neutral-200 px-4 py-3 text-center text-base font-semibold">{formatMonth(month)}</h2>
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center text-[10px] font-semibold text-neutral-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const key = day ? dateKey(day) : `empty-${index}`;
          const dayEvents = day ? eventsByDay[key] || [] : [];
          return (
            <div key={key} className="min-h-20 border-b border-r border-neutral-100 p-1.5 text-xs last:border-r-0">
              {day && <>
                <p className="mb-1 text-[11px] font-semibold text-neutral-500">{day.getDate()}</p>
                {dayEvents.map((event) => (
                  <p key={event.id} className={`mb-1 truncate rounded px-1.5 py-1 text-[10px] text-white ${event.source === 'google' ? 'bg-neutral-900' : 'bg-emerald-700'}`} title={event.detail || event.description || event.summary}>
                    {event.summary}
                  </p>
                ))}
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
