import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../lib/api';

const today = () => new Date().toISOString().split('T')[0];

function createInitialForm() {
  return {
    guestName: '',
    guestContactNum: '',
    guests: 0,
    unitId: '',
    checkIn: today(),
    checkOut: '',
    paymentAmount: '',
    paymentMethod: 'cash',
    paymentStatus: 'verified',
    notes: '',
  };
}

export default function AdminBookingModal({ onClose }) {
  const [unitOptions, setUnitOptions] = useState([]);
  const [bookingForm, setBookingForm] = useState(createInitialForm);
  const [bookingError, setBookingError] = useState('');
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const selectedBookingUnit = unitOptions.find(
    (unit) => String(unit.unit_id) === String(bookingForm.unitId),
  );

  useEffect(() => {
    let isCurrent = true;

    fetch(`${API_BASE_URL}/listings.php`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load units.');
        }
        if (isCurrent) setUnitOptions(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (isCurrent) setBookingError(error.message || 'Unable to load units.');
      })
      .finally(() => {
        if (isCurrent) setIsLoadingUnits(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const saveManualBooking = async (event) => {
    event.preventDefault();
    setIsSavingBooking(true);
    setBookingError('');

    try {
      const response = await fetch(`${API_BASE_URL}/admin_create_booking.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingForm,
          guests: Number(bookingForm.guests),
          unitId: Number(bookingForm.unitId),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create booking.');

      onClose();
      window.location.reload();
    } catch (error) {
      setBookingError(error.message || 'Unable to create booking.');
    } finally {
      setIsSavingBooking(false);
    }
  };

  return createPortal(
    <div
      className="host-booking-editor-overlay fixed inset-0 z-[4000] flex items-center justify-center overflow-y-auto bg-black/55 px-4 py-6"
      onClick={onClose}
    >
      <section
        className="host-booking-editor-dialog max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-booking-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">Admin booking</p>
            <h2 id="new-booking-title" className="mt-1 text-2xl font-bold">New Booking</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-neutral-400 hover:text-black"
            aria-label="Close new booking"
          >
            &times;
          </button>
        </div>

        <form onSubmit={saveManualBooking} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Guest name
            <input
              name="guestName"
              value={bookingForm.guestName}
              onChange={handleFieldChange}
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Contact number
            <input
              name="guestContactNum"
              value={bookingForm.guestContactNum}
              onChange={handleFieldChange}
              inputMode="numeric"
              maxLength={11}
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Unit
            <select
              name="unitId"
              value={bookingForm.unitId}
              onChange={handleFieldChange}
              required
              disabled={isLoadingUnits || unitOptions.length === 0}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-normal"
            >
              <option value="">{isLoadingUnits ? 'Loading units...' : 'Select a unit'}</option>
              {unitOptions.map((unit) => (
                <option key={unit.unit_id} value={unit.unit_id}>
                  {unit.building_name || 'Property'} · {unit.unit_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Pax
            <span className="mt-1 block text-xs font-normal text-neutral-500">
              {selectedBookingUnit
                ? `Up to ${selectedBookingUnit.max_guests} overlapping reservations are allowed for this unit; pax per reservation is not capped.`
                : 'Select a unit to see its reservation limit. Pax per reservation is not capped.'}
            </span>
            <input
              name="guests"
              type="number"
              min="0"
              step="1"
              value={bookingForm.guests}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Check-in
            <input
              name="checkIn"
              type="date"
              value={bookingForm.checkIn}
              onChange={handleFieldChange}
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Check-out
            <input
              name="checkOut"
              type="date"
              value={bookingForm.checkOut}
              onChange={handleFieldChange}
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Payment amount
            <input
              name="paymentAmount"
              type="number"
              min="0"
              step="0.01"
              value={bookingForm.paymentAmount}
              onChange={handleFieldChange}
              placeholder="Auto-calculate"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Payment method
            <select
              name="paymentMethod"
              value={bookingForm.paymentMethod}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-normal"
            >
              <option value="cash">Cash</option>
              <option value="e-wallet">E-wallet</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Payment status
            <select
              name="paymentStatus"
              value={bookingForm.paymentStatus}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-normal"
            >
              <option value="verified">Paid / verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Notes
            <textarea
              name="notes"
              value={bookingForm.notes}
              onChange={handleFieldChange}
              rows="3"
              className="mt-1 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2.5 font-normal"
            />
          </label>
          {bookingError && (
            <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {bookingError}
            </p>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-300 px-5 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingBooking || isLoadingUnits}
              className="rounded-full bg-[#df766c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSavingBooking ? 'Saving...' : 'Save booking'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
