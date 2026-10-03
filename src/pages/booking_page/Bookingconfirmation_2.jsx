
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import gcashQrImage from "../../images/gcash_qr.jpg";
import Header from "../../components/Header";
import Footer from "../../components/Footer_Lite";
import { API_BASE_URL } from "../../lib/api";

function PlusIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function ChevronDownIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-400"
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

function CheckIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-white"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function FileUploadBox({
  file,
  onChange,
  onRemove,
  error,
  hint = "PNG or JPG, 1mb maximum file size",
}) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  return (
    <div className="relative w-28">
      <label
        className={`flex flex-col items-center justify-center gap-2 border rounded-xl w-28 h-28 cursor-pointer hover:bg-gray-50 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      >
        <input
          type="file"
          accept="image/png, image/jpeg"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />

        {file && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name || 'Uploaded image'}
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <>
            <span
              className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                error
                  ? "border-red-300 text-red-500"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              <PlusIcon className="w-5 h-5" />
            </span>

            <span className="text-[10px] text-gray-400 text-center px-2 leading-tight">
              {file ? file.name : hint}
            </span>
          </>
        )}
      </label>

      {file && onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${file.name}`}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white p-0 text-base leading-none text-gray-900 shadow-md transition hover:bg-red-50 hover:text-red-600"
        >
          &times;
        </button>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 max-w-28">
          {error}
        </p>
      )}
    </div>
  );
}

const VEHICLE_TYPES = [
  "Car",
  "Motorcycle",
  "Van",
  "SUV",
  "Truck",
];

const MAX_FILE_SIZE = 1024 * 1024;
const GUEST_BOOKINGS_KEY = "guest_bookings_cache";

function readGuestBookings() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(GUEST_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistGuestBooking(booking) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = readGuestBookings();
  const next = [
    ...existing.filter((item) => Number(item.bookingId) !== Number(booking.bookingId)),
    booking,
  ];

  localStorage.setItem(GUEST_BOOKINGS_KEY, JSON.stringify(next));
}

export default function AdditionalInformation({
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
  const bookingProperties = Array.isArray(booking.properties) && booking.properties.length > 0
    ? booking.properties
    : [booking.property || {}];
  const property = bookingProperties[0] || {};

  const [submitError, setSubmitError] = useState("");
  const [accountError, setAccountError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [savedBookingId, setSavedBookingId] = useState(
    booking.bookingId || null
  );
  const [isGuestBooking, setIsGuestBooking] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [govId, setGovId] = useState(null);
  const [proofOfPayment, setProofOfPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(
    booking.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'gcash'
  );
  const [isGcashQrOpen, setIsGcashQrOpen] = useState(false);

  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicles, setVehicles] = useState([
    { type: "Car", count: 1 },
  ]);

  const [specialRequest, setSpecialRequest] = useState("");

  /*
   * FIELD ERRORS
   */
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    govId: "",
    proofOfPayment: "",
    vehicles: "",
  });

  /*
   * Helper for updating one field error
   */
  const setFieldError = (field, message) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  };

  /*
   * Clear one field error
   */
  const clearFieldError = (field) => {
    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  /*
   * VALIDATE FIRST NAME
   */
  const handleFirstNameChange = (e) => {
    const value = e.target.value;

    setFirstName(value);

    if (value.trim()) {
      clearFieldError("firstName");
    } else {
      setFieldError("firstName", "First name is required.");
    }
  };

  /*
   * VALIDATE LAST NAME
   */
  const handleLastNameChange = (e) => {
    const value = e.target.value;

    setLastName(value);

    if (value.trim()) {
      clearFieldError("lastName");
    } else {
      setFieldError("lastName", "Last name is required.");
    }
  };

  /*
   * VALIDATE EMAIL
   */
  const handleEmailChange = (e) => {
    const value = e.target.value;

    setEmail(value);

    if (!value.trim()) {
      setFieldError("email", "Email address is required.");
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      setFieldError(
        "email",
        "Please enter a valid email address."
      );
      return;
    }

    clearFieldError("email");
  };

  /*
   * VALIDATE PHONE
   */
  const handlePhoneChange = (e) => {
    const value = e.target.value;

    setPhone(value);

    if (!value.trim()) {
      setFieldError("phone", "Phone number is required.");
      return;
    }

    const phoneRegex = /^\d{11}$/;

    if (!phoneRegex.test(value)) {
      setFieldError(
        "phone",
        "Enter an 11-digit phone number using numbers only."
      );
      return;
    }

    clearFieldError("phone");
  };

  /*
   * VALIDATE GOVERNMENT ID
   */
  const handleGovIdChange = (file) => {
    clearFieldError("govId");

    if (!file) {
      setGovId(null);
      setFieldError(
        "govId",
        "Government-issued ID is required."
      );
      return;
    }

    if (
      file.type !== "image/png" &&
      file.type !== "image/jpeg"
    ) {
      setGovId(null);
      setFieldError(
        "govId",
        "Please upload a PNG or JPG image."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setGovId(null);
      setFieldError(
        "govId",
        "File size must not exceed 1MB."
      );
      return;
    }

    setGovId(file);
    clearFieldError("govId");
  };

  /*
   * VALIDATE PROOF OF PAYMENT
   */
  const handleProofOfPaymentChange = (file) => {
    clearFieldError("proofOfPayment");

    if (!file) {
      setProofOfPayment(null);
      setFieldError(
        "proofOfPayment",
        "Proof of payment is required."
      );
      return;
    }

    if (
      file.type !== "image/png" &&
      file.type !== "image/jpeg"
    ) {
      setProofOfPayment(null);
      setFieldError(
        "proofOfPayment",
        "Please upload a PNG or JPG image."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setProofOfPayment(null);
      setFieldError(
        "proofOfPayment",
        "File size must not exceed 1MB."
      );
      return;
    }

    setProofOfPayment(file);
    clearFieldError("proofOfPayment");
  };

  /*
   * VEHICLE UPDATE
   */
  const updateVehicle = (index, patch) => {
    setVehicles((prev) =>
      prev.map((v, i) =>
        i === index ? { ...v, ...patch } : v
      )
    );

    clearFieldError("vehicles");
  };

  const addVehicleType = () => {
    setVehicles((prev) => [
      ...prev,
      { type: "Car", count: 1 },
    ]);

    clearFieldError("vehicles");
  };

  const removeVehicleType = (index) => {
    setVehicles((prev) =>
      prev.filter((_, i) => i !== index)
    );

    clearFieldError("vehicles");
  };

  /*
   * VALIDATE ENTIRE FORM
   */
  const validateForm = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      govId: "",
      proofOfPayment: "",
      vehicles: "",
    };

    let isValid = true;

    // First name
    if (!firstName.trim()) {
      newErrors.firstName =
        "First name is required.";
      isValid = false;
    }

    // Last name
    if (!lastName.trim()) {
      newErrors.lastName =
        "Last name is required.";
      isValid = false;
    }

    // Email
    if (!email.trim()) {
      newErrors.email =
        "Email address is required.";
      isValid = false;
    } else {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        newErrors.email =
          "Please enter a valid email address.";
        isValid = false;
      }
    }

    // Phone
    if (!phone.trim()) {
      newErrors.phone =
        "Phone number is required.";
      isValid = false;
    } else {
      const phoneRegex = /^\d{11}$/;

      if (!phoneRegex.test(phone)) {
        newErrors.phone =
          "Enter an 11-digit phone number using numbers only.";
        isValid = false;
      }
    }

    // Government ID
    if (!govId) {
      newErrors.govId =
        "Government-issued ID is required.";
      isValid = false;
    } else if (
      govId.type !== "image/png" &&
      govId.type !== "image/jpeg"
    ) {
      newErrors.govId =
        "Please upload a PNG or JPG image.";
      isValid = false;
    } else if (govId.size > MAX_FILE_SIZE) {
      newErrors.govId =
        "File size must not exceed 1MB.";
      isValid = false;
    }

    // Proof of payment
    if (!proofOfPayment) {
      newErrors.proofOfPayment =
        "Proof of payment is required.";
      isValid = false;
    } else if (
      proofOfPayment.type !== "image/png" &&
      proofOfPayment.type !== "image/jpeg"
    ) {
      newErrors.proofOfPayment =
        "Please upload a PNG or JPG image.";
      isValid = false;
    } else if (
      proofOfPayment.size > MAX_FILE_SIZE
    ) {
      newErrors.proofOfPayment =
        "File size must not exceed 1MB.";
      isValid = false;
    }

    // Vehicle
    if (hasVehicle) {
      if (!vehicles.length) {
        newErrors.vehicles =
          "Please add at least one vehicle.";
        isValid = false;
      }

      const invalidVehicle = vehicles.some(
        (vehicle) =>
          !vehicle.type ||
          !Number.isInteger(vehicle.count) ||
          vehicle.count < 1
      );

      if (invalidVehicle) {
        newErrors.vehicles =
          "Please enter valid vehicle information.";
        isValid = false;
      }
    }

    setErrors(newErrors);

    return isValid;
  };

  /*
   * SUBMIT FORM
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (booking.bookingId) return;

    if (!isCustomer) {
      setAccountError('Only customer accounts can make bookings.');
      return;
    }

    setSubmitError("");

    // Validate before sending request
    const isValid = validateForm();

    if (!isValid) {
      // Scroll to the first error
      setTimeout(() => {
        const firstError = document.querySelector(
          '[data-error="true"]'
        );

        if (firstError) {
          firstError.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 50);

      return;
    }

    setShowBookingConfirmation(true);
  };

  const submitBooking = async () => {
    setShowBookingConfirmation(false);
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const totalGuests = Number(booking.guests ?? 0);
      const createdBookings = [];
      let remainingGuests = totalGuests;

      for (const selectedProperty of bookingProperties) {
        const guestsForUnit = totalGuests;
        const formData = new FormData();

        formData.append("unitId", selectedProperty.unit_id || "");
        formData.append("checkIn", booking.checkIn || "");
        formData.append("checkOut", booking.checkOut || "");
        formData.append("guests", String(guestsForUnit));
        formData.append("guestName", `${firstName} ${lastName}`.trim());
        formData.append("guestContactNum", phone);
        formData.append("guestEmail", email.trim().toLowerCase());
        formData.append("paymentMethod", paymentMethod);
        formData.append(
          "vehicleType",
          hasVehicle
            ? vehicles.map((vehicle) => `${vehicle.type} (${vehicle.count})`).join(", ")
            : ""
        );
        formData.append("specialRequests", specialRequest);

        if (govId) formData.append("govId", govId);
        if (proofOfPayment) formData.append("proofOfPayment", proofOfPayment);

        const response = await fetch(`${API_BASE_URL}/create_booking.php`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const text = await response.text();
        let data = {};

        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { error: 'Unexpected server response. Please try again.' };
          }
        }

        const bookingId = data.bookingId ?? data.booking_id;
        if (!response.ok || !data.success || !bookingId) {
          throw new Error(data.error || 'Unable to create booking.');
        }

        createdBookings.push({ bookingId, data, selectedProperty });
        remainingGuests -= guestsForUnit;
      }

      const firstBooking = createdBookings[0];
      setIsGuestBooking(Boolean(firstBooking.data.guestBooking));
      setSavedBookingId(firstBooking.bookingId);

      if (firstBooking.data.guestBooking) {
        const guestName = `${firstName.trim()} ${lastName.trim()}`.trim();
        persistGuestBooking({
          bookingId: Number(firstBooking.bookingId),
          status: firstBooking.data.status || "payment_review",
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: totalGuests,
          guestName,
          guestContactNum: phone.trim(),
          unitName: firstBooking.selectedProperty?.unit_name || "Property stay",
          propertyName: firstBooking.selectedProperty?.property_name || firstBooking.selectedProperty?.building_name || "Property",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      setSubmitError(
        error.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="max-w-[640px] mx-auto md:max-w-[980px] xl:max-w-[1120px]">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-bold">
              Additional Information
            </h2>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100 cursor-pointer"
            >
              Back
            </button>
          </div>

          {!isCustomer && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
              <p className="text-sm font-semibold text-amber-950">
                {accountError || 'Only customer accounts can make bookings.'}
              </p>
              <p className="mt-1 text-sm text-amber-900">Please log in or create a customer account to continue.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={onOpenSignIn} className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Log In</button>
                <button type="button" onClick={onOpenRegister} className="rounded-full border border-amber-900 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100">Sign Up</button>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-8 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-8 md:space-y-0"
          >
            {/* 1. Full Name */}
            <section>
              <h3 className="text-sm font-semibold mb-3">
                1. Full Name
              </h3>

              <div
                className={`border rounded-xl overflow-hidden ${
                  errors.firstName ||
                  errors.lastName
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                data-error={
                  errors.firstName ||
                  errors.lastName
                    ? "true"
                    : "false"
                }
              >
                <input
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  onBlur={() => {
                    if (!firstName.trim()) {
                      setFieldError(
                        "firstName",
                        "First name is required."
                      );
                    }
                  }}
                  placeholder="First Name"
                  className="w-full px-4 py-3 text-sm placeholder-gray-400 focus:outline-none border-b border-gray-300"
                />

                <input
                  type="text"
                  value={lastName}
                  onChange={handleLastNameChange}
                  onBlur={() => {
                    if (!lastName.trim()) {
                      setFieldError(
                        "lastName",
                        "Last name is required."
                      );
                    }
                  }}
                  placeholder="Last Name"
                  className="w-full px-4 py-3 text-sm placeholder-gray-400 focus:outline-none"
                />
              </div>

              {errors.firstName && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.firstName}
                </p>
              )}

              {errors.lastName && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.lastName}
                </p>
              )}
            </section>

            {/* 2. Contact Information */}
            <section>
              <h3 className="text-sm font-semibold mb-3">
                2. Contact Information
              </h3>

              <div
                className={`border rounded-xl overflow-hidden ${
                  errors.email || errors.phone
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                data-error={
                  errors.email || errors.phone
                    ? "true"
                    : "false"
                }
              >
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => {
                    if (!email.trim()) {
                      setFieldError(
                        "email",
                        "Email address is required."
                      );
                    }
                  }}
                  placeholder="Email Address"
                  className="w-full px-4 py-3 text-sm placeholder-gray-400 focus:outline-none border-b border-gray-300"
                />

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => {
                    if (!phone.trim()) {
                      setFieldError(
                        "phone",
                        "Phone number is required."
                      );
                    }
                  }}
                  placeholder="Phone number"
                  className="w-full px-4 py-3 text-sm placeholder-gray-400 focus:outline-none"
                />
              </div>

              {errors.email && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.email}
                </p>
              )}

              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.phone}
                </p>
              )}
            </section>

            {/* 3. Government ID */}
            <section>
              <h3 className="text-sm font-semibold mb-3">
                3. Government-Issued ID
              </h3>

              <div
                data-error={
                  errors.govId ? "true" : "false"
                }
              >
                <FileUploadBox
                  file={govId}
                  onChange={handleGovIdChange}
                  onRemove={() => { setGovId(null); clearFieldError("govId"); }}
                  error={errors.govId}
                />
              </div>
            </section>

            {/* 4. Payment method and proof */}
            <section>
              <h3 className="mb-3 text-sm font-semibold">4. Payment method and proof</h3>
              <div className="mb-4 space-y-3 rounded-xl border border-gray-200 p-4">
                <p className="m-0 text-sm font-medium text-gray-900">Choose how you paid</p>
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                  <span className="text-sm text-gray-800">GCash</span>
                  <input
                    type="radio"
                    name="guestPaymentMethod"
                    value="gcash"
                    checked={paymentMethod === 'gcash'}
                    onChange={() => setPaymentMethod('gcash')}
                    className="h-4 w-4 accent-neutral-900"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                  <span className="text-sm text-gray-800">Bank Transfer</span>
                  <input
                    type="radio"
                    name="guestPaymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="h-4 w-4 accent-neutral-900"
                  />
                </label>
                {paymentMethod === 'gcash' ? (
                  <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                    <button
                      type="button"
                      onClick={() => setIsGcashQrOpen(true)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                    >
                      Generate GCash QR Code
                    </button>
                    <p className="m-0 text-sm leading-relaxed text-gray-600">Open the GCash QR code, pay the amount shown in your booking, then upload your payment receipt below.</p>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                    <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center">
                      <p className="m-0 max-w-xs text-sm text-gray-500">Official bank-transfer QR code will be displayed here once provided.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
                      <p className="m-0 font-medium text-gray-800">Bank details</p>
                      <p className="mb-0 mt-2">Bank name, account name, and account number will be provided here.</p>
                    </div>
                    <p className="m-0 text-sm leading-relaxed text-gray-600">Transfer the amount shown in your booking using the official bank details, then upload your transfer receipt below. Payment details are not available yet.</p>
                  </div>
                )}
              </div>

              <div
                data-error={
                  errors.proofOfPayment
                    ? "true"
                    : "false"
                }
              >
                <FileUploadBox
                  file={proofOfPayment}
                  onChange={handleProofOfPaymentChange}
                  onRemove={() => { setProofOfPayment(null); clearFieldError("proofOfPayment"); }}
                  error={errors.proofOfPayment}
                />
              </div>
            </section>

            {/* 5. Vehicle Information */}
            <section className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  5. Vehicle Information
                </h3>

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  Do you have a vehicle? (Optional)

                  <span
                    onClick={() => {
                      setHasVehicle((v) => !v);
                      clearFieldError("vehicles");
                    }}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      hasVehicle
                        ? "bg-gray-900 border-gray-900"
                        : "border-gray-300"
                    }`}
                  >
                    {hasVehicle && <CheckIcon />}
                  </span>
                </label>
              </div>

              {hasVehicle && (
                <div className="space-y-3">
                  {vehicles.map((vehicle, index) => (
                    <div
                      key={index}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 border rounded-xl p-4 ${
                        errors.vehicles
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      data-error={
                        errors.vehicles
                          ? "true"
                          : "false"
                      }
                    >
                      <div className="flex-1">
                        <p className="text-[11px] text-gray-500 mb-1">
                          Vehicle type
                        </p>

                        <div className="relative">
                          <select
                            value={vehicle.type}
                            onChange={(e) =>
                              updateVehicle(index, {
                                type: e.target.value,
                              })
                            }
                            className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none pr-8"
                          >
                            {VEHICLE_TYPES.map(
                              (type) => (
                                <option
                                  key={type}
                                  value={type}
                                >
                                  {type}
                                </option>
                              )
                            )}
                          </select>

                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                            <ChevronDownIcon />
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] text-gray-500 mb-1">
                          Number of Vehicle
                        </p>

                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              updateVehicle(index, {
                                count: Math.max(
                                  1,
                                  vehicle.count - 1
                                ),
                              })
                            }
                            className="p-2 text-gray-500 hover:text-gray-900"
                            aria-label="Decrease number of vehicles"
                          >
                            <MinusIcon />
                          </button>

                          <span className="w-6 text-center text-sm">
                            {vehicle.count}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateVehicle(index, {
                                count:
                                  vehicle.count + 1,
                              })
                            }
                            className="p-2 text-gray-500 hover:text-gray-900"
                            aria-label="Increase number of vehicles"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeVehicleType(index)
                          }
                          className="text-xs text-gray-400 hover:text-gray-700 self-start sm:self-center"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}

                  {errors.vehicles && (
                    <p className="text-sm text-red-600">
                      {errors.vehicles}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={addVehicleType}
                    className="text-sm font-medium underline cursor-pointer"
                  >
                    Add vehicle type
                  </button>
                </div>
              )}
            </section>

            {/* 6. Special Request */}
            <section>
              <h3 className="text-sm font-semibold mb-3">
                6. Special Request
              </h3>

              <textarea
                value={specialRequest}
                onChange={(e) =>
                  setSpecialRequest(e.target.value)
                }
                placeholder="Special Request"
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm placeholder-gray-400 focus:outline-none resize-none"
              />
            </section>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                Boolean(savedBookingId) ||
                !isCustomer
              }
              className="w-full sm:w-auto sm:mx-auto sm:block md:col-span-2 bg-gray-900 text-white text-sm font-medium rounded-full px-10 py-3 hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savedBookingId
                ? "Booking saved"
                : isSubmitting
                ? "Saving booking..."
                : "Confirm & Pay"}
            </button>

            {/* Server / unexpected error */}
            {submitError && (
              <p className="text-sm text-red-600 text-center md:col-span-2">
                {submitError}
              </p>
            )}
          </form>
        </div>
      </main>

      <Footer />

      {isGcashQrOpen && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/60 px-4 py-6"
          role="presentation"
          onClick={() => setIsGcashQrOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="gcash-qr-title"
            className="relative max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="gcash-qr-title" className="m-0 text-lg font-semibold text-gray-900">GCash QR Code</h2>
              <button
                type="button"
                onClick={() => setIsGcashQrOpen(false)}
                aria-label="Close GCash QR code"
                className="rounded-full px-2 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100"
              >
                &times;
              </button>
            </div>
            <img
              src={gcashQrImage}
              alt="GCash payment QR code"
              className="mx-auto h-auto max-h-[70vh] w-full max-w-64 object-contain"
            />
            <p className="mb-0 mt-4 text-sm leading-relaxed text-gray-600">
              Scan this QR code, pay the amount shown in your booking, then upload your payment receipt.
            </p>
          </section>
        </div>
      )}

      {showBookingConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-confirmation-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-center shadow-2xl sm:p-7">
            <h2
              id="booking-confirmation-title"
              className="text-xl font-semibold text-gray-900"
            >
              Are you sure about the booking details?
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              {booking.checkIn} to {booking.checkOut} · {booking.guests ?? 0} guest{Number(booking.guests ?? 0) === 1 ? "" : "s"}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowBookingConfirmation(false)}
                className="rounded-full border border-gray-300 px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Review details
              </button>
              <button
                type="button"
                onClick={submitBooking}
                className="rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Yes, book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking success modal */}
      {savedBookingId && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
        >
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-center shadow-2xl sm:p-7">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckIcon />
            </div>

            <h2
              id="booking-success-title"
              className="text-xl font-semibold text-gray-900"
            >
              {isGuestBooking ? 'Booking request submitted' : 'Booking confirmed'}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {isGuestBooking
                ? 'Your booking request is saved for review.'
                : 'Your booking has been saved. What would you like to do next?'}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-full border border-gray-900 px-5 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Browse home
              </button>

              {isGuestBooking ? (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/trips')}
                  className="rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  View trips
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};