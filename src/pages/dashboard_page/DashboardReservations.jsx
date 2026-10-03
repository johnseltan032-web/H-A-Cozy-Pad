import { useEffect, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';
import noReservationsImage from '../../images/no-reservations.svg';

const buildAssetUrl = (path) => {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const cleanPath = String(path).replace(/^\/+/, '');
  return `${API_BASE_URL.replace(/\/+$/, '')}/${cleanPath}`;
};

export default function DashboardReservations() {
  const [activeTab, setActiveTab] = useState('soon');
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [deletingBookingId, setDeletingBookingId] = useState(null);
  const [statusChange, setStatusChange] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [paymentProofTitle, setPaymentProofTitle] = useState('Proof of Payment');
  const [isPaymentProofOpen, setIsPaymentProofOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [selectedModification, setSelectedModification] = useState(null);
  const [modificationChange, setModificationChange] = useState(null);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);

  const loadReservations = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      setError('');

      const response = await fetch(`${API_BASE_URL}/reservations.php`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load reservations');
      }

      setReservations(data.reservations || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadReservations(true);
  }, []);

  const handleStatusUpdate = async (bookingId, status) => {
    setError('');
    setUpdatingBookingId(bookingId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/update_booking_status.php`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId,
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update booking status');
      }

      setReservations((currentReservations) =>
        currentReservations.map((reservation) =>
          reservation.booking_id === bookingId
            ? { ...reservation, status: data.status }
            : reservation
        )
      );
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    setError('');
    setDeletingBookingId(bookingId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/delete_booking.php`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bookingId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to remove booking');
      }

      setReservations((currentReservations) =>
        currentReservations.filter(
          (reservation) => reservation.booking_id !== bookingId
        )
      );
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handleModificationUpdate = async (requestId, action) => {
    setError('');
    setUpdatingRequestId(requestId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/modify_request.php`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: Number(requestId),
            action,
          }),
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          'Invalid modify_request.php response:',
          responseText
        );

        throw new Error(
          'The server returned an invalid response.'
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to process modification request'
        );
      }

      await loadReservations(false);
      setModificationChange(null);
      setSelectedModification(null);
    } catch (modificationError) {
      console.error(
        'Modification request error:',
        modificationError
      );

      setError(modificationError.message);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const handleViewCustomer = async (reservation) => {
    setCustomerInfo(null);
    setCustomerError('');
    setPaymentProof(null);
    setPaymentProofTitle('Proof of Payment');
    setPaymentDetails(null);
    setIsPaymentProofOpen(false);
    setIsCustomerLoading(true);

    const modificationPaymentAmount = Number(
      reservation.modification_payment_amount ??
        reservation.payment_amount ??
        0
    );

    const modificationRefundAmount = Number(
      reservation.modification_refund_amount ??
        reservation.refund_amount ??
        0
    );

    const modificationPaymentStatus =
      reservation.modification_payment_status ??
      reservation.payment_status ??
      'not_required';

    setPaymentDetails({
      additionalPayment: modificationPaymentAmount,
      refundAmount: modificationRefundAmount,
      paymentStatus: modificationPaymentStatus,
      hasAdditionalPayment: modificationPaymentAmount > 0,
      hasRefund: modificationRefundAmount > 0,
      modificationProof:
        reservation.modification_proof_of_payment ?? null,
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/get_customer.php?bookingId=${reservation.booking_id}`,
        {
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to load customer information'
        );
      }

      setCustomerInfo(data.customer);
    } catch (customerLoadError) {
      setCustomerError(customerLoadError.message);
    } finally {
      setIsCustomerLoading(false);
    }
  };

  const handleViewPaymentProof = () => {
    if (!customerInfo?.proofOfPaymentPath) {
      setCustomerError(
        'No proof of payment was uploaded for this booking.'
      );
      return;
    }

    setPaymentProof(buildAssetUrl(customerInfo.proofOfPaymentPath));
    setPaymentProofTitle('Proof of Payment');

    setIsPaymentProofOpen(true);
  };

  const handleViewGovernmentId = () => {
    if (!customerInfo?.validIdPath || customerInfo.validIdPath === 'not_uploaded') {
      setCustomerError('No government ID was uploaded for this booking.');
      return;
    }

    setPaymentProof(buildAssetUrl(customerInfo.validIdPath));
    setPaymentProofTitle('Government ID');
    setIsPaymentProofOpen(true);
  };

  const handleViewModificationPayment = (reservation) => {
    const proofPath =
      reservation.modification_proof_of_payment ??
      reservation.modificationProof ??
      null;

    if (!proofPath) {
      setError(
        'No proof of payment was uploaded for this modification request.'
      );
      return;
    }

    const additionalPayment = Number(
      reservation.modification_payment_amount ??
        reservation.payment_amount ??
        0
    );

    const refundAmount = Number(
      reservation.modification_refund_amount ??
        reservation.refund_amount ??
        0
    );

    const paymentStatus =
      reservation.modification_payment_status ??
      reservation.payment_status ??
      'not_required';

    setPaymentDetails({
      additionalPayment,
      refundAmount,
      paymentStatus,
      hasAdditionalPayment: additionalPayment > 0,
      hasRefund: refundAmount > 0,
      modificationProof: proofPath,
    });

    setPaymentProof(buildAssetUrl(proofPath));
    setPaymentProofTitle('Modification Proof of Payment');
    setIsPaymentProofOpen(true);
  };

  const closeCustomerModal = () => {
    setCustomerInfo(null);
    setCustomerError('');
    setPaymentDetails(null);
  };

  const closePaymentProofModal = () => {
    setIsPaymentProofOpen(false);
    setPaymentProof(null);
    setPaymentProofTitle('Proof of Payment');
  };

  const closeModificationModal = () => {
    setSelectedModification(null);
  };

  const activeReservations = reservations.filter(
    (reservation) => reservation.status !== 'cancelled'
  );

  const visibleReservations = reservations.filter((reservation) => {
    const start = new Date(
      `${reservation.check_in_date}T00:00:00`
    );

    const end = new Date(
      `${reservation.check_out_date}T00:00:00`
    );

    const now = new Date();

    if (activeTab === 'all') return true;

    if (reservation.status === 'cancelled') return false;

    if (activeTab === 'today') {
      return start <= now && end > now;
    }

    if (activeTab === 'soon') {
      return start > now;
    }

    return true;
  });

  const formatDate = (date) =>
    new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatAmount = (amount) =>
    Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const statusClasses = {
    awaiting_payment: 'bg-amber-100 text-amber-800',
    payment_review: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-neutral-200 text-neutral-700',
  };

  return (
    <div className="bg-white text-black font-sans min-h-screen flex flex-col">
      <HostHeader activeNav="Reservations" />

      <main className="flex flex-col items-center px-5 pt-6 pb-28 md:pt-10 md:pb-10 grow">
        <div className="relative mb-10 w-full max-w-5xl">
          <div className="flex items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab('today')}
                className={`px-6 py-2.5 rounded-full text-base cursor-pointer border-0 ${
                  activeTab === 'today'
                    ? 'font-semibold bg-neutral-800 text-white'
                    : 'font-medium bg-neutral-100 text-neutral-400'
                }`}
              >
                Today
              </button>

              <button
                onClick={() => setActiveTab('soon')}
                className={`px-6 py-2.5 rounded-full text-base cursor-pointer border-0 ${
                  activeTab === 'soon'
                    ? 'font-semibold bg-neutral-800 text-white'
                    : 'font-medium bg-neutral-100 text-neutral-400'
                }`}
              >
                Soon
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-2.5 rounded-full text-base cursor-pointer border-0 ${
                  activeTab === 'all'
                    ? 'font-semibold bg-neutral-800 text-white'
                    : 'font-medium bg-neutral-100 text-neutral-400'
                }`}
              >
                All
              </button>
            </div>
          </div>

        </div>

          <div className="mb-8 text-center">
          <p className="m-0 text-sm text-neutral-500">
            {activeReservations.length} active booking
            {activeReservations.length === 1 ? '' : 's'}
          </p>
        </div>

        {error && (
          <div className="mb-5 w-full max-w-5xl rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-neutral-500">
            Loading customer bookings...
          </p>
        ) : visibleReservations.length > 0 ? (
          <div className="grid w-full max-w-5xl grid-cols-2 justify-center gap-2 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,300px),300px))] sm:gap-4 lg:gap-5">
            {visibleReservations.map((reservation) => {
              const isUpdating =
                updatingBookingId === reservation.booking_id;

              const isUpdatingModification =
                updatingRequestId ===
                Number(reservation.modification_request_id);

              const canDecide = [
                'pending',
                'awaiting_payment',
                'payment_review',
                'confirmed',
                'rejected',
              ].includes(reservation.status);

              const canViewCustomer = [
                'pending',
                'awaiting_payment',
                'payment_review',
                'confirmed',
                'rejected',
                'cancelled',
              ].includes(reservation.status);

              const hasModification =
                !!reservation.modification_request_id;

              return (
                <article
                  key={reservation.booking_id}
                  className="min-w-0 w-full rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm sm:max-w-[300px] sm:rounded-2xl sm:p-4 md:max-w-[340px] md:p-5"
                >
                  <div className="mb-2 flex min-w-0 flex-col items-start gap-2 sm:mb-5 sm:flex-row sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="hidden text-xs font-medium uppercase tracking-wide text-neutral-500 sm:block">
                        Booked property
                      </p>

                      <h2 className="line-clamp-1 text-sm font-semibold sm:mt-1 sm:text-lg">
                        {reservation.building_name}
                      </h2>

                      <p className="hidden text-sm text-neutral-600 sm:block">
                        {reservation.unit_name} ·{' '}
                        {reservation.location}
                      </p>
                    </div>

                    <span
                      className={`flex min-h-5 max-w-full shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-center text-[10px] font-semibold capitalize sm:min-h-7 sm:min-w-[118px] sm:px-3 sm:py-1 sm:text-xs ${
                        statusClasses[reservation.status] ||
                        'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {reservation.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid gap-1.5 border-t border-neutral-100 pt-2 text-xs text-neutral-600 sm:grid-cols-2 sm:gap-3 sm:pt-4 sm:text-sm">
                    <div className="hidden sm:block">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Booking ID
                      </p>
                      <p className="font-semibold text-neutral-900">
                        BK-{reservation.booking_id}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="hidden font-semibold text-neutral-900 sm:block">
                        Stay dates
                      </p>

                      <p className="line-clamp-1 text-[11px] sm:text-sm">
                        {formatDate(reservation.check_in_date)} to{' '}
                        {formatDate(reservation.check_out_date)}
                      </p>
                    </div>

                    <div className="hidden sm:block">
                      <p className="font-semibold text-neutral-900">
                        Customer
                      </p>

                      <p>
                        {reservation.booked_guest_name ||
                          reservation.guest_name}
                      </p>

                      <p>
                        {reservation.booked_guest_contact_num ||
                          reservation.guest_contact_num}
                      </p>
                    </div>

                    <div className="hidden sm:block">
                      <p className="font-semibold text-neutral-900">
                        Guests
                      </p>

                      <p>
                        {reservation.num_of_guests} guest
                        {Number(reservation.num_of_guests) === 1
                          ? ''
                          : 's'}
                      </p>
                    </div>

                    {reservation.special_requests && (
                      <div className="hidden sm:block">
                        <p className="font-semibold text-neutral-900">
                          Special request
                        </p>

                        <p>{reservation.special_requests}</p>
                      </div>
                    )}
                  </div>

                  {hasModification && (
                    <div className="mt-2 border-t border-neutral-100 pt-2 sm:mt-5 sm:pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedModification(reservation)
                        }
                        className="w-fit max-w-full rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 text-left text-[11px] font-semibold leading-tight text-amber-900 transition hover:bg-amber-100 sm:w-full sm:px-4 sm:py-3 sm:text-sm"
                      >
                        <span className="sm:hidden">View change</span>
                        <span className="hidden sm:inline">View Modification Request</span>
                      </button>
                    </div>
                  )}

                  {canViewCustomer && (
                    <div className="mt-2 grid w-full grid-cols-2 gap-1.5 border-t border-neutral-100 pt-2 sm:mt-5 sm:flex sm:flex-wrap sm:justify-end sm:gap-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleViewCustomer(reservation)
                        }
                        className="min-w-0 rounded-lg bg-blue-600 px-1.5 py-2 text-[10px] font-medium leading-tight text-white transition hover:bg-blue-700 sm:min-w-[112px] sm:flex-1 sm:px-3 sm:text-sm sm:leading-normal sm:flex-none"
                      >
                        View Customer
                      </button>

                      {canDecide && (
                        <>
                          {reservation.status !== 'confirmed' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => {
                                if (
                                  [
                                    'pending',
                                    'awaiting_payment',
                                    'payment_review',
                                  ].includes(reservation.status)
                                ) {
                                  handleStatusUpdate(
                                    reservation.booking_id,
                                    'confirmed'
                                  );
                                } else {
                                  setStatusChange({
                                    bookingId:
                                      reservation.booking_id,
                                    currentStatus:
                                      reservation.status,
                                    newStatus: 'confirmed',
                                  });
                                }
                              }}
                              className="min-w-0 rounded-lg bg-green-600 px-1.5 py-2 text-[10px] font-medium leading-tight text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[96px] sm:flex-1 sm:px-3 sm:text-sm sm:leading-normal sm:flex-none"
                            >
                              {isUpdating
                                ? 'Updating...'
                                : 'Approve'}
                            </button>
                          )}

                          {reservation.status !== 'rejected' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => {
                                if (
                                  [
                                    'pending',
                                    'awaiting_payment',
                                    'payment_review',
                                  ].includes(reservation.status)
                                ) {
                                  handleStatusUpdate(
                                    reservation.booking_id,
                                    'rejected'
                                  );
                                } else {
                                  setStatusChange({
                                    bookingId:
                                      reservation.booking_id,
                                    currentStatus:
                                      reservation.status,
                                    newStatus: 'rejected',
                                  });
                                }
                              }}
                              className="min-w-0 rounded-lg border border-red-200 px-1.5 py-2 text-[10px] font-medium leading-tight text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[96px] sm:flex-1 sm:px-3 sm:text-sm sm:leading-normal sm:flex-none"
                            >
                              {isUpdating
                                ? 'Updating...'
                                : 'Reject'}
                            </button>
                          )}

                          {['confirmed', 'rejected'].includes(
                            reservation.status
                          ) && (
                            <button
                              type="button"
                              disabled={deletingBookingId === reservation.booking_id}
                              onClick={() =>
                                handleDeleteBooking(
                                  reservation.booking_id
                                )
                              }
                              className="min-w-0 rounded-lg border border-neutral-300 px-1.5 py-2 text-[10px] font-medium leading-tight text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[96px] sm:flex-1 sm:px-3 sm:text-sm sm:leading-normal sm:flex-none"
                            >
                              {deletingBookingId === reservation.booking_id
                                ? 'Removing...'
                                : 'Remove'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <img
              src={noReservationsImage}
              alt="No reservations"
              className="h-20 w-20 object-contain"
            />

            <p className="text-xl font-bold text-black">
              {activeTab === 'today'
                ? 'No reservations for today'
                : activeTab === 'soon'
                  ? 'No upcoming customer reservations'
                  : 'No customer bookings yet'}
            </p>
          </div>
        )}
      </main>

      {selectedModification && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 px-5 py-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModificationModal();
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modification-request-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-6">
              <div>
                <h2 id="modification-request-title" className="text-xl font-semibold text-neutral-900">
                  Modification Request
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Review the customer's requested booking changes.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModificationModal}
                className="text-2xl leading-none text-neutral-400 hover:text-neutral-700"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-amber-900">
                    Pending Modification
                  </p>

                  <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                    Pending
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Current dates
                  </p>

                  <p className="mt-1 text-sm text-neutral-600">
                    {formatDate(
                      selectedModification.check_in_date
                    )}{' '}
                    to{' '}
                    {formatDate(
                      selectedModification.check_out_date
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Requested dates
                  </p>

                  <p className="mt-1 text-sm text-neutral-600">
                    {formatDate(
                      selectedModification.requested_check_in
                    )}{' '}
                    to{' '}
                    {formatDate(
                      selectedModification.requested_check_out
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Current guests
                  </p>

                  <p className="mt-1 text-sm text-neutral-600">
                    {selectedModification.num_of_guests} guest
                    {Number(
                      selectedModification.num_of_guests
                    ) === 1
                      ? ''
                      : 's'}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Requested guests
                  </p>

                  <p className="mt-1 text-sm text-neutral-600">
                    {selectedModification.requested_guests} guest
                    {Number(
                      selectedModification.requested_guests
                    ) === 1
                      ? ''
                      : 's'}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Requested special request
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                    {selectedModification.requested_special_requests ||
                      'No special request provided.'}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Reason
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                    {selectedModification.modification_reason ||
                      selectedModification.request_reason ||
                      'N/A'}
                  </p>
                </div>

                {Number(
                  selectedModification.modification_payment_amount ??
                    selectedModification.payment_amount ??
                    0
                ) > 0 && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="font-semibold text-blue-900">
                      Additional Payment
                    </p>

                    <p className="mt-1 text-2xl font-bold text-blue-900">
                      ₱
                      {formatAmount(
                        selectedModification.modification_payment_amount ??
                          selectedModification.payment_amount
                      )}
                    </p>

                    <p className="mt-2 text-xs capitalize text-blue-700">
                      Payment status:{' '}
                      {(
                        selectedModification.modification_payment_status ??
                        selectedModification.payment_status ??
                        'pending'
                      ).replaceAll('_', ' ')}
                    </p>

                    {!selectedModification.modification_proof_of_payment && (
                      <p className="mt-3 text-sm font-medium text-red-600">
                        No payment proof uploaded.
                      </p>
                    )}
                  </div>
                )}

                {selectedModification.modification_proof_of_payment && (
                  <div className="rounded-xl border border-neutral-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-neutral-900">
                      Modification Proof of Payment
                    </p>
                    <button
                      type="button"
                      onClick={() => handleViewModificationPayment(selectedModification)}
                      className="block w-full cursor-zoom-in rounded-lg bg-neutral-50 p-2 transition hover:bg-neutral-100"
                      aria-label="View full modification proof of payment"
                    >
                      <img
                        src={buildAssetUrl(selectedModification.modification_proof_of_payment)}
                        alt="Modification proof of payment"
                        className="mx-auto max-h-72 w-full rounded-md object-contain"
                        loading="lazy"
                      />
                    </button>
                  </div>
                )}

                {Number(
                  selectedModification.modification_refund_amount ??
                    selectedModification.refund_amount ??
                    0
                ) > 0 && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <p className="font-semibold text-purple-900">
                      Refund Amount
                    </p>

                    <p className="mt-1 text-2xl font-bold text-purple-900">
                      ₱
                      {formatAmount(
                        selectedModification.modification_refund_amount ??
                          selectedModification.refund_amount
                      )}
                    </p>

                    <p className="mt-2 text-sm text-purple-700">
                      A refund is required because the requested
                      booking is lower in total cost.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-neutral-200 p-6">
              <button
                type="button"
                disabled={
                  updatingRequestId ===
                  Number(
                    selectedModification.modification_request_id
                  )
                }
                onClick={() =>
                  setModificationChange({
                    requestId: Number(
                      selectedModification.modification_request_id
                    ),
                    action: 'reject',
                  })
                }
                className="flex-1 rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject Change
              </button>

              <button
                type="button"
                disabled={
                  updatingRequestId ===
                  Number(
                    selectedModification.modification_request_id
                  )
                }
                onClick={() =>
                  setModificationChange({
                    requestId: Number(
                      selectedModification.modification_request_id
                    ),
                    action: 'approve',
                  })
                }
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Approve Change
              </button>
            </div>
          </div>
        </div>
      )}

      {statusChange && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">
              Change Booking Status
            </h2>

            <p className="mt-3 text-sm text-neutral-600">
              Are you sure you want to change this booking from{' '}
              <span className="font-semibold capitalize">
                {statusChange.currentStatus.replace('_', ' ')}
              </span>{' '}
              to{' '}
              <span className="font-semibold capitalize">
                {statusChange.newStatus}
              </span>
              ?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatusChange(null)}
                disabled={
                  updatingBookingId === statusChange.bookingId
                }
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleStatusUpdate(
                    statusChange.bookingId,
                    statusChange.newStatus
                  );

                  setStatusChange(null);
                }}
                disabled={
                  updatingBookingId === statusChange.bookingId
                }
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingBookingId === statusChange.bookingId
                  ? 'Updating...'
                  : 'Yes, change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modificationChange && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">
              {modificationChange.action === 'approve'
                ? 'Approve Modification?'
                : 'Reject Modification?'}
            </h2>

            <p className="mt-3 text-sm text-neutral-600">
              {modificationChange.action === 'approve'
                ? 'This will apply the requested changes to the booking.'
                : 'The original booking will remain unchanged.'}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModificationChange(null)}
                disabled={
                  updatingRequestId ===
                  modificationChange.requestId
                }
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  handleModificationUpdate(
                    modificationChange.requestId,
                    modificationChange.action
                  )
                }
                disabled={
                  updatingRequestId ===
                  modificationChange.requestId
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  modificationChange.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {updatingRequestId ===
                modificationChange.requestId
                  ? 'Processing...'
                  : modificationChange.action === 'approve'
                    ? 'Yes, approve'
                    : 'Yes, reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(customerInfo || isCustomerLoading || customerError) && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">
              Customer Information
            </h2>

            {isCustomerLoading ? (
              <p className="mt-5 text-sm text-neutral-500">
                Loading customer information...
              </p>
            ) : customerError ? (
              <p className="mt-5 text-sm text-red-600">
                {customerError}
              </p>
            ) : customerInfo ? (
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3">
                  <div>
                    <p className="font-semibold text-neutral-900">Government ID</p>
                    <p className="text-neutral-600">
                      {customerInfo.validIdPath && customerInfo.validIdPath !== 'not_uploaded'
                        ? 'ID uploaded'
                        : 'No ID uploaded'}
                    </p>
                  </div>
                  {customerInfo.validIdPath && customerInfo.validIdPath !== 'not_uploaded' && (
                    <button
                      type="button"
                      onClick={handleViewGovernmentId}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      View Government ID
                    </button>
                  )}
                </div>

                <div>
                  <p className="font-semibold text-neutral-900">
                    Full Name
                  </p>

                  <p className="text-neutral-600">
                    {customerInfo.fullName}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-neutral-900">
                    Contact Number
                  </p>

                  <p className="text-neutral-600">
                    {customerInfo.contactNum}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-neutral-900">
                    Email
                  </p>

                  <p className="text-neutral-600">
                    {customerInfo.email}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-neutral-900">
                    Booking Status
                  </p>

                  <p className="capitalize text-neutral-600">
                    {customerInfo.bookingStatus?.replaceAll(
                      '_',
                      ' '
                    )}
                  </p>
                </div>

                {paymentDetails?.hasAdditionalPayment && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="font-semibold text-blue-900">
                      Additional Payment Required
                    </p>

                    <p className="mt-1 text-2xl font-bold text-blue-900">
                      ₱
                      {formatAmount(
                        paymentDetails.additionalPayment
                      )}
                    </p>

                    <p className="mt-2 text-xs capitalize text-blue-700">
                      Payment status:{' '}
                      {paymentDetails.paymentStatus.replaceAll(
                        '_',
                        ' '
                      )}
                    </p>
                  </div>
                )}

                {paymentDetails?.hasRefund && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <p className="font-semibold text-purple-900">
                      Refund Required
                    </p>

                    <p className="mt-1 text-2xl font-bold text-purple-900">
                      ₱
                      {formatAmount(
                        paymentDetails.refundAmount
                      )}
                    </p>
                  </div>
                )}

                {customerInfo.bookingStatus === 'cancelled' && (
                  <div>
                    <p className="font-semibold text-neutral-900">
                      Cancellation Reason
                    </p>

                    <p className="text-neutral-600">
                      {customerInfo.cancellationReason ||
                        'No reason provided.'}
                    </p>

                    {customerInfo.cancelledAt && (
                      <p className="mt-1 text-xs text-neutral-400">
                        Cancelled on {customerInfo.cancelledAt}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              {customerInfo &&
                customerInfo.bookingStatus !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={handleViewPaymentProof}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    Verify Payment
                  </button>
                )}

              <button
                type="button"
                onClick={closeCustomerModal}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentProofOpen && (
        <div
          className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 px-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePaymentProofModal();
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-proof-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="payment-proof-title" className="text-lg font-semibold text-neutral-900">
                  {paymentProofTitle}
                </h2>

                {paymentDetails?.hasAdditionalPayment && (
                  <p className="mt-1 text-sm text-blue-700">
                    Additional payment:{' '}
                    <span className="font-bold">
                      ₱
                      {formatAmount(
                        paymentDetails.additionalPayment
                      )}
                    </span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closePaymentProofModal}
                className="text-2xl leading-none text-neutral-400 hover:text-neutral-700"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex justify-center rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              {paymentProof ? (
                <img
                  src={paymentProof}
                  alt={paymentProofTitle}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <p className="text-sm text-neutral-500">
                  No proof of payment available.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closePaymentProofModal}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}