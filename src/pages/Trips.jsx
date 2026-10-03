import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import Header from "../components/Header";
import Footer from "../components/Footer_Lite";

function CalendarIcon() {
  return (
    <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function GuestIcon() {
  return (
    <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c.5-3.4 3-5.5 7-5.5s6.5 2.1 7 5.5" />
    </svg>
  );
}

function daysUntilCheckIn(checkIn) {
  const [year, month, day] = String(checkIn || "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  const checkInDay = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((checkInDay - today) / 86400000);
}

function bookingReference(bookingNumber) {
  return `#${bookingNumber}`;
}

const allowedProofImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/pjpeg",
]);

function validateProofImage(file) {
  if (!file) {
    return "Please upload a proof of payment image.";
  }

  const mimeType = (file.type || "").toLowerCase();
  const extension = (file.name || "").split(".").pop()?.toLowerCase() || "";
  const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

  const isAllowedMime = allowedProofImageTypes.has(mimeType);
  const isAllowedExtension = allowedExtensions.has(extension);

  if (!isAllowedMime && !isAllowedExtension) {
    return "Proof of payment must be a JPG, PNG, WEBP, HEIC, or HEIF image.";
  }

  if (file.size > 10 * 1024 * 1024) {
    return "Proof of payment must not exceed 10MB.";
  }

  return "";
}

export default function Trips({ onOpenSignIn }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const getBookingNumber = (bookingId) => {
    const bookingIndex = bookings.findIndex(
      (booking) => booking.bookingId === bookingId
    );
    return bookingIndex === -1 ? "" : bookingIndex + 1;
  };

  const [showCancelBox, setShowCancelBox] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [showModificationReminder, setShowModificationReminder] = useState(false);
  const [showModifyBox, setShowModifyBox] = useState(false);
  const [modificationForm, setModificationForm] = useState({
    checkIn: "",
    checkOut: "",
    guests: "",
    specialRequests: "",
    reason: "",
  });
  const [isSubmittingModification, setIsSubmittingModification] = useState(false);
  const [modificationRequestError, setModificationRequestError] = useState("");
  const [proofOfPayment, setProofOfPayment] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [modificationSuccessMessage, setModificationSuccessMessage] = useState("");

  const GUEST_BOOKINGS_KEY = "guest_bookings_cache";

  const readGuestBookings = () => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(GUEST_BOOKINGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let isCurrent = true;
    let latestRequest = 0;

    function handleAuthChange(event) {
      if (event.detail?.loggedIn && event.detail?.user) {
        setUser(event.detail.user);
      } else {
        setUser(null);
      }
      loadBookings();
    }

    window.addEventListener("auth-changed", handleAuthChange);

    async function loadBookings() {
      const requestId = ++latestRequest;
      try {
        setIsLoading(true);
        setError("");

        const authResponse = await fetch(`${API_BASE_URL}/check_auth.php`, {
          credentials: "include",
        });

        const authData = await authResponse.json().catch(() => ({}));
        const isAuthenticated = Boolean(authData.authenticated || authData.user);
        if (!isCurrent || requestId !== latestRequest) return;
        setUser(isAuthenticated ? authData.user : null);

        if (!isAuthenticated) {
          const cachedGuestBookings = readGuestBookings();
          setBookings(cachedGuestBookings);
          setRequiresSignIn(cachedGuestBookings.length === 0);
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/get_booking.php`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();
        if (!isCurrent || requestId !== latestRequest) return;

        if (response.status === 401) {
          const cachedGuestBookings = readGuestBookings();
          setBookings(cachedGuestBookings);
          setRequiresSignIn(cachedGuestBookings.length === 0);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || "Unable to load trips");
        }

        setRequiresSignIn(false);
        setBookings(data.bookings || []);
      } catch (err) {
        if (!isCurrent || requestId !== latestRequest) return;
        console.error("Trips error:", err);
        setError(err.message);
      } finally {
        if (isCurrent && requestId === latestRequest) setIsLoading(false);
      }
    }

    loadBookings();

    return () => {
      isCurrent = false;
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, []);

function openModificationBox() {
  if (!selectedBooking) {
    return;
  }

  const booking = bookings.find(
    (item) => item.bookingId === selectedBooking
  );

  if (!booking) {
    return;
  }

  setModificationRequestError("");
  setSuccessMessage("");
  setModificationSuccessMessage("");
  setProofOfPayment(null);

  setModificationForm({
    checkIn: booking.checkIn || "",
    checkOut: booking.checkOut || "",
    guests: booking.guests ?? "",
    specialRequests: "",
    reason: "",
  });

  setShowModifyBox(true);
}

function closeModificationBox() {
  if (isSubmittingModification) {
    return;
  }

  setShowModifyBox(false);
  setModificationRequestError("");
  setProofOfPayment(null);

  setModificationForm({
    checkIn: "",
    checkOut: "",
    guests: "",
    specialRequests: "",
    reason: "",
  });
}

async function handleModificationRequest() {
  if (!selectedBooking) {
    return;
  }

  if (
    !modificationForm.checkIn ||
    !modificationForm.checkOut ||
    modificationForm.guests === "" ||
    !String(modificationForm.reason || '').trim()
  ) {
    setModificationRequestError("Please complete the required modification details.");
    return;
  }

  const requestedGuestCount = Number(modificationForm.guests);
  if (!Number.isSafeInteger(requestedGuestCount) || requestedGuestCount < 0) {
    setModificationRequestError("Guest count must be a nonnegative whole number.");
    return;
  }

  if (modificationForm.checkOut <= modificationForm.checkIn) {
    setModificationRequestError("Check-out date must be after check-in date.");
    return;
  }

  const booking = bookings.find(
    (item) => item.bookingId === selectedBooking
  );

  if (!booking) {
    setModificationRequestError("Unable to find the selected booking.");
    return;
  }

  const ratePerNight = Number(
    booking.ratePerNight ??
    booking.rate_per_night ??
    booking.rate ??
    0
  );

  const oldNights = Math.max(
    1,
    Math.round(
      (new Date(booking.checkOut) - new Date(booking.checkIn)) /
        86400000
    )
  );

  const newNights = Math.max(
    1,
    Math.round(
      (new Date(modificationForm.checkOut) -
        new Date(modificationForm.checkIn)) /
        86400000
    )
  );

  const difference = (newNights - oldNights) * ratePerNight;

  if (difference > 0 && !proofOfPayment) {
    setModificationRequestError("Please upload your proof of payment for the additional amount.");
    return;
  }

  if (proofOfPayment) {
    const validationError = validateProofImage(proofOfPayment);

    if (validationError) {
      setModificationRequestError(validationError);
      return;
    }
  }

  try {
    setIsSubmittingModification(true);
    setModificationRequestError("");
    setSuccessMessage("");

    const formData = new FormData();

    formData.append("bookingId", selectedBooking);
    formData.append("requestType", "modification");
    formData.append(
      "requestReason",
      String(modificationForm.reason || '').trim()
    );
    formData.append(
      "requestedCheckIn",
      modificationForm.checkIn
    );
    formData.append(
      "requestedCheckOut",
      modificationForm.checkOut
    );
    formData.append(
      "requestedGuests",
      requestedGuestCount
    );
    formData.append(
      "requestedSpecialRequests",
      modificationForm.specialRequests.trim()
    );

    const computedPaymentAmount = difference > 0 ? Number(Math.abs(difference).toFixed(2)) : 0;
    const computedRefundAmount = difference < 0 ? Number(Math.abs(difference).toFixed(2)) : 0;

    formData.append("paymentAmount", String(computedPaymentAmount));
    formData.append("refundAmount", String(computedRefundAmount));

    if (proofOfPayment) {
      formData.append("proofOfPayment", proofOfPayment);
    }

    const response = await fetch(
      `${API_BASE_URL}/submit_booking_request.php`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to submit modification request"
      );
    }

    setShowModifyBox(false);
    setProofOfPayment(null);

    setModificationForm({
      checkIn: "",
      checkOut: "",
      guests: "",
      specialRequests: "",
      reason: "",
    });

    if (difference > 0) {
      setModificationSuccessMessage(
        `Modification request submitted. Additional payment of PHP ${difference.toLocaleString(
          "en-PH",
          { minimumFractionDigits: 2 }
        )} has been submitted for verification.`
      );
    } else if (difference < 0) {
      setModificationSuccessMessage(
        `Modification request submitted. You are eligible for a refund of PHP ${Math.abs(
          difference
        ).toLocaleString("en-PH", {
          minimumFractionDigits: 2,
        })}. Please wait for the owner to process the refund.`
      );
    } else {
      setModificationSuccessMessage(
        `Modification request for booking ${bookingReference(getBookingNumber(selectedBooking))} has been submitted.`
      );
    }
  } catch (err) {
    console.error("Modification request error:", err);
    setModificationRequestError(err.message);
  } finally {
    setIsSubmittingModification(false);
  }
}

const selectedBookingData = bookings.find(
  (booking) => booking.bookingId === selectedBooking
);

const modificationRate = Number(
  selectedBookingData?.ratePerNight ??
  selectedBookingData?.rate_per_night ??
  selectedBookingData?.rate ??
  0
);

const originalNights = selectedBookingData
  ? Math.max(
      1,
      Math.round(
        (new Date(selectedBookingData.checkOut) -
          new Date(selectedBookingData.checkIn)) /
          86400000
      )
    )
  : 0;

const requestedNights =
  modificationForm.checkIn && modificationForm.checkOut
    ? Math.max(
        1,
        Math.round(
          (new Date(modificationForm.checkOut) -
            new Date(modificationForm.checkIn)) /
            86400000
        )
      )
    : 0;

const modificationDifference =
  modificationRate * (requestedNights - originalNights);

  async function handleCancelBooking() {
    if (!selectedBooking || !cancelReason.trim()) {
      return;
    }

    try {
      setIsCancelling(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/cancel_booking.php`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: selectedBooking,
            cancelReason: cancelReason.trim(),
          }),
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Unable to cancel booking");
      }

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.bookingId === selectedBooking
            ? {
                ...booking,
                status: "cancelled",
                cancellationReason: data.cancellationReason,
              }
            : booking
        )
      );

      setShowCancelBox(false);
      setCancelReason("");
      setSuccessMessage(
        `Booking ${bookingReference(getBookingNumber(selectedBooking))} has been cancelled successfully.`
      );
    } catch (err) {
      console.error("Cancel booking error:", err);
      setError(err.message);
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fdfdfd] text-[#222]">
      <Header
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        user={user}
        onLogout={() => setUser(null)}
        onOpenSignIn={onOpenSignIn || (() => navigate("/"))}
        onOpenRegister={() => navigate("/")}
      />
      <main className="grow px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-gray-200 pb-8">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                Your travel dashboard
              </p>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Your trips</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">
                Keep track of upcoming stays, booking details, and requests in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100 cursor-pointer"
            >
              <span aria-hidden="true">←</span> Back to home
            </button>
          </div>

        {isLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
            Loading your trips...
          </div>
        )}

        {requiresSignIn && !isLoading && (
          <section className="border-t border-gray-200 py-8">
            <p className="text-base font-semibold">Sign in to view your reservations</p>
            <p className="mt-2 text-sm text-gray-600">You can browse this page as a guest, but saved trips are linked to your account.</p>
            <button type="button" onClick={onOpenSignIn} className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 cursor-pointer">
              Sign in
            </button>
          </section>
        )}

        {error && !requiresSignIn && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {successMessage && (
          <p className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{successMessage}</p>
        )}

        {!isLoading && !error && !requiresSignIn && bookings.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">No trips yet</p>
            <p className="mt-2 text-sm text-gray-500">Your saved trips will appear here.</p>
          </div>
        )}

        {!isLoading && !error && !requiresSignIn && bookings.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">All bookings</h2>
                <span className="text-xs text-gray-500">{bookings.length} total</span>
              </div>
              <div className="space-y-3">
                {bookings.map((booking, index) => (
                  <label
                    key={booking.bookingId}
                    className={`block cursor-pointer rounded-xl border bg-white p-4 transition hover:border-gray-400 ${
                      selectedBooking === booking.bookingId ? "border-black shadow-sm" : "border-gray-200"
                    }`}
                  >
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        name="selectedBooking"
                        value={booking.bookingId}
                        checked={selectedBooking === booking.bookingId}
                        onChange={() => setSelectedBooking(booking.bookingId)}
                        className="mt-1 h-4 w-4 accent-black"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Booking {bookingReference(index + 1)}</p>
                        <p className="mt-1 truncate text-sm text-gray-600">{booking.propertyName || booking.unitName || "Cozy Pad stay"}</p>
                        <p className="mt-3 text-xs text-gray-500">{booking.checkIn} - {booking.checkOut}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section className="min-h-107.5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-9">
              {selectedBooking ? (
                (() => {
                  const booking = bookings.find((item) => item.bookingId === selectedBooking);
                  return (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-7">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Booking {bookingReference(getBookingNumber(booking.bookingId))}</p>
                          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{booking.propertyName || booking.unitName || "Your Cozy Pad stay"}</h2>
                        </div>
                        <span className="rounded-full bg-[#fff0c2] px-3 py-1.5 text-xs font-semibold capitalize text-[#765400]">{booking.status.replaceAll("_", " ")}</span>
                      </div>

                      <div className="grid gap-6 border-b border-gray-200 py-8 sm:grid-cols-3">
                        <div><div className="flex items-center gap-2"><CalendarIcon /><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Check-in</p></div><p className="mt-2 pl-7 font-medium">{booking.checkIn}</p></div>
                        <div><div className="flex items-center gap-2"><CalendarIcon /><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Check-out</p></div><p className="mt-2 pl-7 font-medium">{booking.checkOut}</p></div>
                        <div><div className="flex items-center gap-2"><GuestIcon /><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Guests</p></div><p className="mt-2 pl-7 font-medium">{booking.guests}</p></div>
                      </div>

                      <div className="grid gap-4 py-7 text-sm sm:grid-cols-2">
                        {booking.guestName && <p><span className="text-gray-500">Guest</span><br /><span className="mt-1 inline-block font-medium">{booking.guestName}</span></p>}
                        {booking.vehicleType && <p><span className="text-gray-500">Vehicle</span><br /><span className="mt-1 inline-block font-medium">{booking.vehicleType}</span></p>}
                      </div>

                      <div className="flex flex-wrap items-start gap-3">
                        {(() => {
                          const eligibleToReschedule = daysUntilCheckIn(booking.checkIn) >= 15;
                          return (
                            <div>
                              {!eligibleToReschedule && (
                                <p className="mb-2 max-w-sm text-sm text-amber-700" role="status">
                                  Rescheduling is available only at least 15 days before check-in.
                                </p>
                              )}
                              <button
                                type="button"
                                disabled={!eligibleToReschedule}
                                onClick={() => setShowModificationReminder(true)}
                                className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${
                                  eligibleToReschedule
                                    ? "bg-black text-white hover:bg-gray-800"
                                    : "cursor-not-allowed bg-gray-200 text-gray-500"
                                }`}
                              >
                                Request to change
                              </button>
                            </div>
                          );
                        })()}
                        <button type="button" onClick={() => { setError(""); setSuccessMessage(""); setShowCancelBox(true); }} className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold transition hover:border-red-500 hover:text-red-600">Cancel booking</button>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="flex h-full min-h-90 items-center justify-center text-center">
                  <div><p className="text-xl font-semibold">Select a trip to view details</p><p className="mt-2 text-sm text-gray-500">Your booking information and actions will appear here.</p></div>
                </div>
              )}
            </section>
          </div>
        )}

        {showCancelBox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
            <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
              <h2 className="text-xl font-semibold">
                Cancel booking?
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to cancel booking {bookingReference(getBookingNumber(selectedBooking))}?
              </p>

              <label className="mt-5 block text-sm font-medium text-gray-700">
                Why are you cancelling?
              </label>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please tell us why you want to cancel..."
                rows={4}
                disabled={isCancelling}
                className="mt-2 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-red-500 disabled:bg-gray-100"
              />

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => {
                    setShowCancelBox(false);
                    setCancelReason("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Keep booking
                </button>

                <button
                  type="button"
                  disabled={isCancelling || !cancelReason.trim()}
                  onClick={handleCancelBooking}
                  className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isCancelling
                    ? "Cancelling..."
                    : "Confirm cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showModificationReminder && (
          <div
            className="fixed inset-0 z-[4000] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modification-reminder-title"
          >
            <section className="max-h-[calc(100dvh-3rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
              <h2 id="modification-reminder-title" className="text-xl font-semibold text-gray-900">
                Rescheduling policy
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please review these terms before requesting a booking change:
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-gray-700">
                <li><strong>15-day notice:</strong> Rescheduling requests must be made at least 15 days before check-in.</li>
                <li><strong>Same length of stay:</strong> The number of nights must remain the same.</li>
                <li><strong>Subject to availability:</strong> The original unit is not guaranteed for your new dates.</li>
                <li><strong>Rates may change:</strong> New dates may have different rates, including weekends, holidays, and peak seasons.</li>
                <li><strong>Non-refundable cancellations:</strong> Cancelled bookings are non-refundable.</li>
              </ul>
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                The host may have turned down other inquiries to reserve your dates. Changes made close to check-in can make those dates difficult to rebook.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShowModificationReminder(false)}
                  className="w-full rounded-full border border-gray-300 px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModificationReminder(false);
                    openModificationBox();
                  }}
                  className="w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Continue
                </button>
              </div>
            </section>
          </div>
        )}

        {showModifyBox && (
          <div
            className="host-booking-editor-overlay fixed inset-0 z-[4000] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modify-booking-title"
          >
            <div className="host-booking-editor-dialog max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-semibold">
                <span id="modify-booking-title">Request to change booking</span>
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Submit the changes you would like the owner to review.
              </p>

              {modificationRequestError && (
                <p
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  role="alert"
                >
                  {modificationRequestError}
                </p>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-in
                  </label>

                  <input
                    type="date"
                    value={modificationForm.checkIn}
                    onChange={(e) =>
                      setModificationForm((current) => ({
                        ...current,
                        checkIn: e.target.value,
                      }))
                    }
                    disabled={isSubmittingModification}
                    className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-yellow-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-out
                  </label>

                  <input
                    type="date"
                    value={modificationForm.checkOut}
                    onChange={(e) =>
                      setModificationForm((current) => ({
                        ...current,
                        checkOut: e.target.value,
                      }))
                    }
                    disabled={isSubmittingModification}
                    className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-yellow-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Number of guests
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={modificationForm.guests}
                  onChange={(e) =>
                    setModificationForm((current) => ({
                      ...current,
                      guests: e.target.value,
                    }))
                  }
                  disabled={isSubmittingModification}
                  className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-yellow-500 disabled:bg-gray-100"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Special requests
                </label>

                <textarea
                  value={modificationForm.specialRequests}
                  onChange={(e) =>
                    setModificationForm((current) => ({
                      ...current,
                      specialRequests: e.target.value,
                    }))
                  }
                  placeholder="Any updated special requests..."
                  rows={3}
                  disabled={isSubmittingModification}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-yellow-500 disabled:bg-gray-100"
                />
              </div>

              {modificationForm.checkIn &&
  modificationForm.checkOut &&
  modificationDifference !== 0 && (
    <div
      className={`mt-4 rounded-xl border p-4 ${
        modificationDifference > 0
          ? "border-yellow-200 bg-yellow-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      {modificationDifference > 0 ? (
        <>
          <p className="text-sm font-semibold text-yellow-800">
            Additional payment required
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            Your new booking is{" "}
            {requestedNights - originalNights} night
            {requestedNights - originalNights !== 1 ? "s" : ""} longer.
          </p>
          <p className="mt-2 text-lg font-bold text-yellow-900">
            PHP{" "}
            {modificationDifference.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="mt-1 text-xs text-yellow-700">
            Please upload your proof of payment below.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-green-800">
            Refund applicable
          </p>
          <p className="mt-1 text-sm text-green-700">
            Your new booking is shorter than your current booking.
          </p>
          <p className="mt-2 text-lg font-bold text-green-900">
            PHP{" "}
            {Math.abs(modificationDifference).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="mt-1 text-xs text-green-700">
            No payment is required. Please wait for the owner to process
            your refund.
          </p>
        </>
      )}
    </div>
  )}

  <div className="mt-4">
    <label className="block text-sm font-medium text-gray-700">
      Proof of payment
    </label>

    <input
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
      onChange={(e) => {
        const selectedFile = e.target.files?.[0] || null;

        if (!selectedFile) {
          setProofOfPayment(null);
          return;
        }

        const validationError = validateProofImage(selectedFile);

        if (validationError) {
          setProofOfPayment(null);
          setModificationRequestError(validationError);
          e.target.value = "";
          return;
        }

        setModificationRequestError("");
        setProofOfPayment(selectedFile);
      }}
      disabled={isSubmittingModification}
      className="mt-2 block w-full rounded-lg border border-gray-300 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium"
    />

    <p className="mt-1 text-xs text-gray-500">
      JPG, PNG, WEBP, HEIC, or HEIF. Maximum size: 10MB.
    </p>

    {proofOfPayment && (
      <p className="mt-2 text-xs text-green-600">
        Selected: {proofOfPayment.name}
      </p>
    )}
  </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Reason for change
                </label>

                <textarea
                  value={modificationForm.reason}
                  onChange={(e) =>
                    setModificationForm((current) => ({
                      ...current,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Why do you want to change your booking?"
                  rows={3}
                  disabled={isSubmittingModification}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-yellow-500 disabled:bg-gray-100"
                />
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isSubmittingModification}
                  onClick={closeModificationBox}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    isSubmittingModification ||
                    !modificationForm.checkIn ||
                    !modificationForm.checkOut ||
                    modificationForm.guests === "" ||
                    !Number.isSafeInteger(Number(modificationForm.guests)) ||
                    Number(modificationForm.guests) < 0 ||
                    !modificationForm.reason.trim() ||
                    (modificationDifference > 0 && !proofOfPayment)
                  }
                  onClick={handleModificationRequest}
                  className="w-full rounded-lg bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmittingModification
                    ? "Submitting..."
                    : "Submit request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {modificationSuccessMessage && (
          <div
            className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 px-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modification-success-title"
          >
            <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-center shadow-2xl sm:p-7">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
              <h2 id="modification-success-title" className="text-xl font-semibold text-gray-900">
                Request submitted
              </h2>
              <p className="mt-2 text-sm text-gray-500">{modificationSuccessMessage}</p>
              <button
                type="button"
                onClick={() => setModificationSuccessMessage("")}
                className="mt-6 w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      </main>
      <Footer />
    </div>
  );
}