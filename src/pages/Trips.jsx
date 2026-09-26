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

export default function Trips() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [showCancelBox, setShowCancelBox] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [showModifyBox, setShowModifyBox] = useState(false);
  const [modificationForm, setModificationForm] = useState({
    checkIn: "",
    checkOut: "",
    guests: "",
    specialRequests: "",
    reason: "",
  });
  const [isSubmittingModification, setIsSubmittingModification] = useState(false);
  const [proofOfPayment, setProofOfPayment] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    function handleAuthChange(event) {
      if (event.detail?.loggedIn && event.detail?.user) {
        setUser(event.detail.user);
      } else {
        setUser(null);
      }
    }

    fetch(`${API_BASE_URL}/check_auth.php`, { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setUser(data.authenticated ? data.user : null))
      .catch(() => setUser(null));

    window.addEventListener("auth-changed", handleAuthChange);

    async function loadBookings() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/get_booking.php`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load trips");
        }

        setBookings(data.bookings || []);
      } catch (err) {
        console.error("Trips error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadBookings();

    return () => window.removeEventListener("auth-changed", handleAuthChange);
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

  setError("");
  setSuccessMessage("");
  setProofOfPayment(null);

  setModificationForm({
    checkIn: booking.checkIn || "",
    checkOut: booking.checkOut || "",
    guests: booking.guests || "",
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
    !modificationForm.guests ||
    !String(modificationForm.reason || '').trim()
  ) {
    setError("Please complete the required modification details.");
    return;
  }

  if (modificationForm.checkOut <= modificationForm.checkIn) {
    setError("Check-out date must be after check-in date.");
    return;
  }

  const booking = bookings.find(
    (item) => item.bookingId === selectedBooking
  );

  if (!booking) {
    setError("Unable to find the selected booking.");
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
    setError("Please upload your proof of payment for the additional amount.");
    return;
  }

  if (proofOfPayment) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(proofOfPayment.type)) {
      setError("Proof of payment must be a JPG, PNG, or WEBP image.");
      return;
    }

    if (proofOfPayment.size > 10 * 1024 * 1024) {
      setError("Proof of payment must not exceed 10MB.");
      return;
    }
  }

  try {
    setIsSubmittingModification(true);
    setError("");
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
      Number(modificationForm.guests)
    );
    formData.append(
      "requestedSpecialRequests",
      modificationForm.specialRequests.trim()
    );

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
      setSuccessMessage(
        `Modification request submitted. Additional payment of PHP ${difference.toLocaleString(
          "en-PH",
          { minimumFractionDigits: 2 }
        )} has been submitted for verification.`
      );
    } else if (difference < 0) {
      setSuccessMessage(
        `Modification request submitted. You are eligible for a refund of PHP ${Math.abs(
          difference
        ).toLocaleString("en-PH", {
          minimumFractionDigits: 2,
        })}. Please wait for the owner to process the refund.`
      );
    } else {
      setSuccessMessage(
        `Modification request for booking #${selectedBooking} has been submitted.`
      );
    }
  } catch (err) {
    console.error("Modification request error:", err);
    setError(err.message);
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
        `Booking #${selectedBooking} has been cancelled successfully.`
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
        onOpenSignIn={() => navigate("/")}
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
              className="mb-1 text-sm font-medium text-gray-600 transition hover:text-black"
            >
              <span aria-hidden="true">←</span> Back to home
            </button>
          </div>

        {isLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
            Loading your trips...
          </div>
        )}

        {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {successMessage && (
          <p className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{successMessage}</p>
        )}

        {!isLoading && !error && bookings.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">No trips yet</p>
            <p className="mt-2 text-sm text-gray-500">Your saved trips will appear here.</p>
          </div>
        )}

        {!isLoading && !error && bookings.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">All bookings</h2>
                <span className="text-xs text-gray-500">{bookings.length} total</span>
              </div>
              <div className="space-y-3">
                {bookings.map((booking) => (
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
                        <p className="text-sm font-semibold">Booking #{booking.bookingId}</p>
                        <p className="mt-1 truncate text-sm text-gray-600">{booking.unitName || "Cozy Pad stay"}</p>
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
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Booking #{booking.bookingId}</p>
                          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{booking.unitName || "Your Cozy Pad stay"}</h2>
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

                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={openModificationBox} className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">Request to change</button>
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
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-semibold">
                Cancel booking?
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to cancel booking #{selectedBooking}?
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

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => {
                    setShowCancelBox(false);
                    setCancelReason("");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Keep booking
                </button>

                <button
                  type="button"
                  disabled={isCancelling || !cancelReason.trim()}
                  onClick={handleCancelBooking}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCancelling
                    ? "Cancelling..."
                    : "Confirm cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showModifyBox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-semibold">
                Request to change booking
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Submit the changes you would like the owner to review.
              </p>

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
                  min="1"
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
      accept="image/jpeg,image/png,image/webp"
      onChange={(e) =>
        setProofOfPayment(e.target.files?.[0] || null)
      }
      disabled={isSubmittingModification}
      className="mt-2 block w-full rounded-lg border border-gray-300 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium"
    />

    <p className="mt-1 text-xs text-gray-500">
      JPG, PNG, or WEBP only. Maximum size: 10MB.
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

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingModification}
                  onClick={closeModificationBox}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    isSubmittingModification ||
                    !modificationForm.checkIn ||
                    !modificationForm.checkOut ||
                    !modificationForm.guests ||
                    !modificationForm.reason.trim() ||
                    (modificationDifference > 0 && !proofOfPayment)
                  }
                  onClick={handleModificationRequest}
                  className="rounded-lg bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingModification
                    ? "Submitting..."
                    : "Submit request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </main>
      <Footer />
    </div>
  );
}