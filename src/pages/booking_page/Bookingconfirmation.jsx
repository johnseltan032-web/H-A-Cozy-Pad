import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer_Lite";
import { API_BASE_URL } from "../../lib/api";

function ImagePlaceholderIcon() {
  return (
    <svg
      className="w-5 h-5 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function getPropertyImageUrl(imagePath) {
  if (!imagePath) return null;

  const normalizedPath = String(imagePath)
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^api\//i, '');

  return `${API_BASE_URL.replace(/\/$/, '')}/${normalizedPath}`;
}

function MapPinIcon() {
  return (
    <svg
      className="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronDownIcon({
  className = "w-4 h-4 text-gray-400",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

export default function BookingConfirmation({
  isMenuOpen,
  setIsMenuOpen,
  user,
  onLogout,
  onOpenSignIn,
  onOpenRegister,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const booking = location.state || {};
  const isCustomer = String(user?.role || '').toLowerCase() === 'customer';
  const canMakeBooking = !user || isCustomer;
  const bookingProperties = Array.isArray(booking.properties) && booking.properties.length > 0
    ? booking.properties
    : [booking.property || {}];
  const property = bookingProperties[0] || {};
  const bookingUnitIds = bookingProperties.map((selectedProperty) => selectedProperty.unit_id).join(',');

  const [checkIn, setCheckIn] = useState(
    booking.checkIn || ""
  );

  const [checkOut, setCheckOut] = useState(
    booking.checkOut || ""
  );

  const guestCount = Number(booking.guests ?? 1);

  const [guests, setGuests] = useState(
    Math.max(0, guestCount)
  );

  const [paymentType, setPaymentType] = useState("full_payment");
  const [paymentMethod, setPaymentMethod] = useState("gcash");

  const [isAvailable, setIsAvailable] =
    useState(null);

  const [availabilityError, setAvailabilityError] =
    useState("");
  const [accountError, setAccountError] = useState('');

  /*
   * CARD INFORMATION
   */
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardFirstName, setCardFirstName] =
    useState("");
  const [cardLastName, setCardLastName] =
    useState("");
  const [zipCode, setZipCode] = useState("");


  const [errors, setErrors] = useState({
    checkIn: "",
    checkOut: "",
    guests: "",
    cardNumber: "",
    expiration: "",
    cvv: "",
    cardFirstName: "",
    cardLastName: "",
    zipCode: "",
  });

  const nightRate = bookingProperties.reduce(
    (totalRate, selectedProperty) => totalRate + Number(selectedProperty.rate_per_night || 0),
    0
  );

  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.round(
            (new Date(checkOut) -
              new Date(checkIn)) /
              86400000
          )
        )
      : 1;

  const total = nightRate * nights;
  const propertyImage = getPropertyImageUrl(property.images?.[0]);

  const setFieldError = (field, message) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  };

  const clearFieldError = (field) => {
    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  
  const handleCheckInChange = (value) => {
    setCheckIn(value);

    if (!value) {
      setFieldError(
        "checkIn",
        "Check-in date is required."
      );
      return;
    }

    if (value < new Date().toISOString().split('T')[0]) {
      setFieldError(
        "checkIn",
        "Check-in date cannot be in the past."
      );
      return;
    }

    if (checkOut && value >= checkOut) {
      setFieldError(
        "checkIn",
        "Check-in must be before check-out."
      );

      setFieldError(
        "checkOut",
        "Check-out must be after check-in."
      );

      return;
    }

    clearFieldError("checkIn");

    if (
      checkOut &&
      checkOut > value
    ) {
      clearFieldError("checkOut");
    }
  };

  const handleCheckOutChange = (value) => {
    setCheckOut(value);

    if (!value) {
      setFieldError(
        "checkOut",
        "Check-out date is required."
      );
      return;
    }

    if (checkIn && value <= checkIn) {
      setFieldError(
        "checkOut",
        "Check-out must be after check-in."
      );

      setFieldError(
        "checkIn",
        "Check-in must be before check-out."
      );

      return;
    }

    clearFieldError("checkOut");

    if (
      checkIn &&
      value > checkIn
    ) {
      clearFieldError("checkIn");
    }
  };

  /*
   * CARD NUMBER
   */
  const handleCardNumberChange = (e) => {
    const value = e.target.value;

    setCardNumber(value);

    if (!value.trim()) {
      setFieldError(
        "cardNumber",
        "Card number is required."
      );
      return;
    }

    const digitsOnly = value.replace(/\s/g, "");

    if (!/^\d+$/.test(digitsOnly)) {
      setFieldError(
        "cardNumber",
        "Card number can only contain numbers."
      );
      return;
    }

    if (
      digitsOnly.length < 13 ||
      digitsOnly.length > 19
    ) {
      setFieldError(
        "cardNumber",
        "Please enter a valid card number."
      );
      return;
    }

    clearFieldError("cardNumber");
  };

  const handleExpirationChange = (e) => {
    let value = e.target.value;

    value = value.replace(/\D/g, "");

    value = value.slice(0, 4);

    if (value.length >= 3) {
      value =
        value.slice(0, 2) +
        "/" +
        value.slice(2);
    }

    setExpiration(value);

    if (!value) {
      setFieldError(
        "expiration",
        "Expiration date is required."
      );
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(value)) {
      setFieldError(
        "expiration",
        "Use MM/YY format."
      );
      return;
    }

    const [monthString, yearString] =
      value.split("/");

    const month = Number(monthString);
    const year = Number(`20${yearString}`);

    if (month < 1 || month > 12) {
      setFieldError(
        "expiration",
        "Please enter a valid month."
      );
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (
      year < currentYear ||
      (year === currentYear &&
        month < currentMonth)
    ) {
      setFieldError(
        "expiration",
        "Card expiration date has passed."
      );
      return;
    }

    clearFieldError("expiration");
  };

  
  const handleCvvChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, "")
      .slice(0, 4);

    setCvv(value);

    if (!value) {
      setFieldError(
        "cvv",
        "CVV is required."
      );
      return;
    }

    if (
      value.length !== 3 &&
      value.length !== 4
    ) {
      setFieldError(
        "cvv",
        "CVV must be 3 or 4 digits."
      );
      return;
    }

    clearFieldError("cvv");
  };

  const handleCardFirstNameChange = (e) => {
    const value = e.target.value;

    setCardFirstName(value);

    if (!value.trim()) {
      setFieldError(
        "cardFirstName",
        "First name is required."
      );
      return;
    }

    clearFieldError("cardFirstName");
  };

  const handleCardLastNameChange = (e) => {
    const value = e.target.value;

    setCardLastName(value);

    if (!value.trim()) {
      setFieldError(
        "cardLastName",
        "Last name is required."
      );
      return;
    }

    clearFieldError("cardLastName");
  };

  const handleZipCodeChange = (e) => {
    const value = e.target.value;

    setZipCode(value);

    if (!value.trim()) {
      setFieldError(
        "zipCode",
        "ZIP code is required."
      );
      return;
    }

    if (!/^\d{4,6}$/.test(value.trim())) {
      setFieldError(
        "zipCode",
        "Please enter a valid ZIP code."
      );
      return;
    }

    clearFieldError("zipCode");
  };

  const validateForm = () => {
    const newErrors = {
      checkIn: "",
      checkOut: "",
      guests: "",
      cardNumber: "",
      expiration: "",
      cvv: "",
      cardFirstName: "",
      cardLastName: "",
      zipCode: "",
    };

    let isValid = true;

    if (!Number.isSafeInteger(guests) || guests < 0) {
      newErrors.guests = "Guest count must be a nonnegative whole number.";
      isValid = false;
    }

    if (!checkIn) {
      newErrors.checkIn =
        "Check-in date is required.";
      isValid = false;
    }

    if (checkIn && checkIn < new Date().toISOString().split('T')[0]) {
      newErrors.checkIn =
        "Check-in date cannot be in the past.";
      isValid = false;
    }

    if (!checkOut) {
      newErrors.checkOut =
        "Check-out date is required.";
      isValid = false;
    }

    if (
      checkIn &&
      checkOut &&
      checkOut <= checkIn
    ) {
      newErrors.checkIn =
        "Check-in must be before check-out.";

      newErrors.checkOut =
        "Check-out must be after check-in.";

      isValid = false;
    }


    if (isAvailable === false) {
      isValid = false;
    }

    if (availabilityError) {
      isValid = false;
    }

    if (paymentMethod === "card") {
 
      if (!cardNumber.trim()) {
        newErrors.cardNumber =
          "Card number is required.";
        isValid = false;
      } else {
        const digitsOnly =
          cardNumber.replace(/\s/g, "");

        if (!/^\d+$/.test(digitsOnly)) {
          newErrors.cardNumber =
            "Card number can only contain numbers.";
          isValid = false;
        } else if (
          digitsOnly.length < 13 ||
          digitsOnly.length > 19
        ) {
          newErrors.cardNumber =
            "Please enter a valid card number.";
          isValid = false;
        }
      }

      if (!expiration) {
        newErrors.expiration =
          "Expiration date is required.";
        isValid = false;
      } else if (
        !/^\d{2}\/\d{2}$/.test(expiration)
      ) {
        newErrors.expiration =
          "Use MM/YY format.";
        isValid = false;
      } else {
        const [monthString, yearString] =
          expiration.split("/");

        const month = Number(monthString);
        const year = Number(`20${yearString}`);

        if (month < 1 || month > 12) {
          newErrors.expiration =
            "Please enter a valid month.";
          isValid = false;
        }

        const now = new Date();
        const currentMonth =
          now.getMonth() + 1;
        const currentYear =
          now.getFullYear();

        if (
          year < currentYear ||
          (year === currentYear &&
            month < currentMonth)
        ) {
          newErrors.expiration =
            "Card expiration date has passed.";
          isValid = false;
        }
      }


      if (!cvv) {
        newErrors.cvv =
          "CVV is required.";
        isValid = false;
      } else if (
        cvv.length !== 3 &&
        cvv.length !== 4
      ) {
        newErrors.cvv =
          "CVV must be 3 or 4 digits.";
        isValid = false;
      }

      if (!cardFirstName.trim()) {
        newErrors.cardFirstName =
          "First name is required.";
        isValid = false;
      }

      if (!cardLastName.trim()) {
        newErrors.cardLastName =
          "Last name is required.";
        isValid = false;
      }


      if (!zipCode.trim()) {
        newErrors.zipCode =
          "ZIP code is required.";
        isValid = false;
      } else if (
        !/^\d{4,6}$/.test(zipCode.trim())
      ) {
        newErrors.zipCode =
          "Please enter a valid ZIP code.";
        isValid = false;
      }
    }

    setErrors(newErrors);

    return isValid;
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstError =
        document.querySelector(
          '[data-error="true"]'
        );

      if (firstError) {
        firstError.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 50);
  };


  const handleConfirm = () => {
    if (!canMakeBooking) {
      setAccountError('Please use a customer account or continue as a guest.');
      return;
    }

    setAccountError('');
    const isValid = validateForm();

    if (!isValid) {
      scrollToFirstError();
      return;
    }

    navigate("/booking-confirmation-2", {
      state: {
        ...booking,
        checkIn,
        checkOut,
        guests,
        paymentType,
        paymentMethod,
      },
    });
  };

  const handleIncreaseGuests = () => {
    setGuests((value) => {
      return value + 1;
    });
    clearFieldError("guests");
  };


  useEffect(() => {
    if (!bookingProperties.length || !checkIn || !checkOut || checkOut <= checkIn) {
      return undefined;
    }

    const controller = new AbortController();

    const parseJsonResponse = async (response) => {
      const text = await response.text();
      if (!text) return {};

      try {
        return JSON.parse(text);
      } catch {
        return { error: 'Unexpected server response. Please try again.' };
      }
    };

    Promise.all(bookingProperties.map((selectedProperty) =>
      fetch(
        `${API_BASE_URL}/check_availability.php?unit_id=${encodeURIComponent(selectedProperty.unit_id)}&check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}&guests=${encodeURIComponent(guests)}`,
        { signal: controller.signal }
      ).then(async (response) => {
        const data = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(data.error || 'Unable to check room availability.');
        }
        return Boolean(data.available);
      })
    ))
      .then((availabilityResults) => {
        setIsAvailable(availabilityResults.every(Boolean));
        setAvailabilityError(availabilityResults.every(Boolean) ? '' : 'One or more selected units are unavailable for these dates.');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setIsAvailable(null);
          setAvailabilityError(error.message);
        }
      });

    return () => controller.abort();
  }, [
    bookingUnitIds,
    checkIn,
    checkOut,
    guests,
  ]);

  return (
    <div className="bg-white text-black font-sans min-h-screen flex flex-col">
      <Header
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        user={user}
        onLogout={onLogout}
        onOpenSignIn={onOpenSignIn}
        onOpenRegister={onOpenRegister}
      />

      <main className="grow px-5 md:px-10 lg:px-[52px] py-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-bold">
              Booking Confirmation
            </h2>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100 cursor-pointer"
            >
              Back
            </button>
          </div>

          {user && !isCustomer && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
              <p className="text-sm font-semibold text-amber-950">
                {accountError || 'Please use a customer account or continue as a guest.'}
              </p>
              <p className="mt-1 text-sm text-amber-900">You can sign out to book as a guest, or sign in with a customer account.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={onOpenSignIn} className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Log In</button>
                <button type="button" onClick={onOpenRegister} className="rounded-full border border-amber-900 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100">Sign Up</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="border border-gray-200 rounded-xl p-5 md:p-6 space-y-4 h-fit">
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  {propertyImage ? (
                    <img
                      src={propertyImage}
                      alt={property.property_name || property.building_name || "Property"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholderIcon />
                  )}
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">{property.property_name || property.building_name || "Property Name"}</p>
                  <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <MapPinIcon />
                    {property.building_name || "Property Place"}
                  </p>
                  {bookingProperties.length > 1 && (
                    <div className="mt-1 text-xs text-[#d65f54]">
                      <p className="font-medium">{bookingProperties.length} units selected for this group</p>
                      <p className="mt-0.5 text-gray-500">
                        {bookingProperties.map((selectedProperty) => selectedProperty.unit_name || selectedProperty.unit_id).join(' + ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 mb-1">Date</p>
                  <div className="flex items-center gap-2 flex-wrap" data-error={errors.checkIn || errors.checkOut ? "true" : "false"}>
                    <DatePill
                      label="Check-in"
                      value={checkIn}
                      onChange={handleCheckInChange}
                      min={new Date().toISOString().split("T")[0]}
                      max={checkOut || undefined}
                      error={errors.checkIn}
                    />
                    <span className="text-gray-300">-</span>
                    <DatePill
                      label="Check-out"
                      value={checkOut}
                      onChange={handleCheckOutChange}
                      min={checkIn || new Date().toISOString().split("T")[0]}
                      error={errors.checkOut}
                    />
                  </div>
                  {errors.checkIn && <p className="mt-2 text-xs text-red-600">{errors.checkIn}</p>}
                  {errors.checkOut && <p className="mt-1 text-xs text-red-600">{errors.checkOut}</p>}
                  {availabilityError && <p className="mt-2 text-xs text-red-600">{availabilityError}</p>}
                  {!availabilityError && isAvailable === false && <p className="mt-2 text-xs text-red-600">This room is not available for the selected dates.</p>}
                  {isAvailable === true && <p className="mt-2 text-xs text-green-600">Room is available.</p>}
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-gray-500 mb-1">Number of guests</p>
                  <div className="flex items-center border border-gray-200 rounded-lg" data-error={errors.guests ? "true" : "false"}>
                    <button type="button" onClick={() => { setGuests((value) => Math.max(0, value - 1)); clearFieldError("guests"); }} className="p-2 text-gray-500 hover:text-gray-900" aria-label="Decrease guests">
                      <MinusIcon />
                    </button>
                    <span className="w-5 text-center text-sm text-gray-900">{guests}</span>
                    <button type="button" onClick={handleIncreaseGuests} className="p-2 text-gray-500 hover:text-gray-900" aria-label="Increase guests">
                      <PlusIcon />
                    </button>
                  </div>
                  {errors.guests && <p className="mt-2 max-w-40 text-xs text-red-600">{errors.guests}</p>}
                </div>
              </div>

              <hr className="border-gray-100" />
              <div>
                <p className="text-sm font-medium text-gray-700 text-center mb-2">Price detail</p>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{nights} night{nights > 1 ? "s" : ""} x {bookingProperties.length > 1 ? "combined " : ""}PHP {nightRate.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  <span>PHP {total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between items-baseline">
                <span className="text-base font-semibold text-gray-900">Total PHP</span>
                <span className="text-base font-semibold text-gray-900">PHP {total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            </section>

            <section className="border border-gray-200 rounded-xl p-5 md:p-6 space-y-4 h-fit">
              <p className="text-base font-semibold text-gray-900">
                Payment type
              </p>
              <div className="space-y-3">
                <PaymentRow
                  name="paymentType"
                  icon={<WalletIcon />}
                  label="Reservation fee - PHP 1,000.00"
                  selected={paymentType === "reservation_fee"}
                  onSelect={() => setPaymentType("reservation_fee")}
                />

                {paymentType === "reservation_fee" && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                    The reservation fee is fixed at PHP 1,000.00, regardless of the length of stay. The remaining balance is due separately.
                  </p>
                )}

                <PaymentRow
                  name="paymentType"
                  icon={<WalletIcon />}
                  label={`Full payment - PHP ${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                  selected={paymentType === "full_payment"}
                  onSelect={() => setPaymentType("full_payment")}
                />
              </div>

              <hr className="border-gray-100" />

              <p className="text-base font-semibold text-gray-900">
                Payment method
              </p>

              <PaymentRow
                name="paymentMethod"
                icon={<WalletIcon />}
                label="GCash"
                selected={paymentMethod === "gcash"}
                onSelect={() => setPaymentMethod("gcash")}
              />

              <PaymentRow
                name="paymentMethod"
                icon={<WalletIcon />}
                label="Bank Transfer"
                selected={paymentMethod === "bank_transfer"}
                onSelect={() => setPaymentMethod("bank_transfer")}
              />

              <hr className="border-gray-100" />

              <p className="text-[11px] text-center text-gray-500">
                By selecting the button, I agree
                to the booking terms.
              </p>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  !checkIn ||
                  !checkOut ||
                  checkOut <= checkIn ||
                  !canMakeBooking ||
                  isAvailable !== true ||
                  !Number.isSafeInteger(guests) ||
                  guests < 0 ||
                  Object.values(errors).some(Boolean)
                }
                className="block w-full border border-transparent bg-[#f26b5e] text-white text-sm font-medium text-center rounded-full py-3 hover:bg-[#df5b4f] transition-colors cursor-pointer disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Confirm & Pay
              </button>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/*
 * DATE PILL
 */
function DatePill({
  label,
  value,
  onChange,
  min,
  max,
  error,
}) {
  return (
    <label
      className={`flex items-center gap-1.5 border rounded-lg px-2 py-1.5 hover:border-gray-300 cursor-pointer ${
        error
          ? "border-red-500"
          : "border-gray-200"
      }`}
      data-error={error ? "true" : "false"}
    >
      <CalendarIcon />

      <span className="flex flex-col leading-tight">
        <span className="text-[10px] text-gray-400">
          {label}
        </span>

        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="bg-transparent text-[11px] text-gray-800 outline-none"
          aria-label={label}
        />
      </span>
    </label>
  );
}

function PaymentRow({
  name = "payment",
  icon,
  label,
  selected,
  onSelect,
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
          {icon}
        </span>

        <span className="text-sm text-gray-800">
          {label}
        </span>
      </span>

      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />

      <RadioDot selected={selected} />
    </label>
  );
}


function RadioDot({ selected }) {
  return (
    <span
      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
        selected
          ? "border-gray-900"
          : "border-gray-300"
      }`}
    >
      {selected && (
        <span className="w-2 h-2 rounded-full bg-gray-900" />
      )}
    </span>
  );
}
