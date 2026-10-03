import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { API_BASE_URL } from '../lib/api';

const PLACEHOLDER_AMENITIES = Array.from(
  { length: 8 },
  (_, i) => ({
    id: i + 1,
    name: 'Kitchen',
  })
);

function normalizeAmenities(amenities) {
  if (!amenities) return [];

  if (Array.isArray(amenities)) {
    return amenities
      .map((item) =>
        typeof item === 'string'
          ? item.trim()
          : item?.name || ''
      )
      .filter(Boolean)
      .map((name, index) => ({
        id: `${name}-${index}`,
        name,
      }));
  }

  return String(amenities)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `${name}-${index}`,
      name,
    }));
}

function formatAvailabilityDate(dateString) {
  if (!dateString) return '';

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function PropertyDetail({
  isMenuOpen,
  setIsMenuOpen,
  onOpenSignIn,
  onOpenRegister,
  unitId,
  user,
  onLogout,
}) {
  const { unitId: routeUnitId } = useParams();
  const location = useLocation();

  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAllAmenities, setShowAllAmenities] =
    useState(false);

  const [checkIn, setCheckIn] = useState(() => location.state?.checkIn || new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(() => location.state?.checkOut || '');
  const [guests, setGuests] = useState(() => Number(location.state?.guests ?? 1));

  const [isDateRangeAvailable, setIsDateRangeAvailable] =
    useState(null);

  const [availabilityError, setAvailabilityError] =
    useState('');

  // Selected image index for the full-screen viewer
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function fetchUnits() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/available_listings.php`
        );

        if (!response.ok) {
          throw new Error(
            `Request failed with status ${response.status}`
          );
        }
        
        const data = await response.json();

        if (isMounted) {
          setUnits(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError.message ||
              'Failed to load listing.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUnits();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedUnitId =
    unitId ?? routeUnitId;

  const unit = selectedUnitId
    ? units.find(
        (item) =>
          String(item.unit_id) ===
          String(selectedUnitId)
      )
    : units[0];

  const propertyAmenities =
    normalizeAmenities(unit?.amenities);

  const visibleAmenities = showAllAmenities
    ? (
        propertyAmenities.length
          ? propertyAmenities
          : PLACEHOLDER_AMENITIES
      )
    : (
        propertyAmenities.length
          ? propertyAmenities.slice(0, 8)
          : PLACEHOLDER_AMENITIES.slice(0, 8)
      );

  // All uploaded images
  const propertyImages = Array.isArray(unit?.images)
    ? unit.images.filter(Boolean)
    : [];

  /*
   * ---------------------------------------------------------
   * LISTING AVAILABILITY
   * ---------------------------------------------------------
   *
   * The listing can only be selected for dates inside the
   * availability period configured by the host.
   */

  const availableFrom = unit?.available_from || '';
  const availableUntil = unit?.available_until || '';

  const hasListingAvailability =
    Boolean(
      availableFrom &&
      availableUntil
    );

  const isSelectedDatesInsideListingAvailability =
    hasListingAvailability &&
    checkIn &&
    checkOut &&
    checkIn >= availableFrom &&
    checkOut <= availableUntil;

  useEffect(() => {
    if (!unit || !checkIn || !checkOut) {
      setIsDateRangeAvailable(null);
      setAvailabilityError('');
      return undefined;
    }

    if (!hasListingAvailability) {
      setIsDateRangeAvailable(false);
      setAvailabilityError(
        'This listing does not currently have a valid availability period.'
      );
      return undefined;
    }

    if (checkOut <= checkIn) {
      setIsDateRangeAvailable(null);
      setAvailabilityError('');
      return undefined;
    }

    if (checkIn < availableFrom) {
      setIsDateRangeAvailable(false);
      setAvailabilityError(
        `This listing is only available from ${formatAvailabilityDate(
          availableFrom
        )} to ${formatAvailabilityDate(
          availableUntil
        )}.`
      );
      return undefined;
    }

    if (checkOut > availableUntil) {
      setIsDateRangeAvailable(false);
      setAvailabilityError(
        `This listing is only available from ${formatAvailabilityDate(
          availableFrom
        )} to ${formatAvailabilityDate(
          availableUntil
        )}.`
      );
      return undefined;
    }

    const controller =
      new AbortController();

    setAvailabilityError('');
    setIsDateRangeAvailable(null);

    fetch(
      `${API_BASE_URL}/check_availability.php?unit_id=${encodeURIComponent(
        unit.unit_id
      )}&check_in=${encodeURIComponent(
        checkIn
      )}&check_out=${encodeURIComponent(
        checkOut
      )}&guests=${encodeURIComponent(
        guests
      )}`,
      {
        signal: controller.signal,
      }
    )
      .then(async (response) => {
        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Unable to check availability'
          );
        }

        setIsDateRangeAvailable(
          Boolean(data.available)
        );
      })
      .catch(
        (availabilityRequestError) => {
          if (
            availabilityRequestError.name !==
            'AbortError'
          ) {
            setIsDateRangeAvailable(null);

            setAvailabilityError(
              availabilityRequestError.message
            );
          }
        }
      );

    return () =>
      controller.abort();
  }, [
    unit,
    checkIn,
    checkOut,
    guests,
    availableFrom,
    availableUntil,
    hasListingAvailability,
  ]);

  const handleCheckInChange = (event) => {
    const value = event.target.value;

    setCheckIn(value);

    if (
      availableUntil &&
      checkOut &&
      checkOut > availableUntil
    ) {
      setCheckOut('');
    }

    if (
      availableUntil &&
      value >= availableUntil &&
      checkOut &&
      checkOut <= value
    ) {
      setCheckOut('');
    }
  };

  const handleCheckOutChange = (event) => {
    const value = event.target.value;

    setCheckOut(value);
  };

  const handleReserve = () => {
    if (
      !unit ||
      isDateRangeAvailable !== true ||
      !isSelectedDatesInsideListingAvailability
    ) {
      return;
    }

    navigate(
      '/booking-confirmation',
      {
        state: {
          property: unit,
          checkIn,
          checkOut,
          guests,
        },
      }
    );
  };

  return (
    <div className="bg-white text-black font-sans min-h-screen flex flex-col">

      {/* Header */}
      <Header
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        user={user}
        onLogout={onLogout}
        onOpenSignIn={onOpenSignIn}
        onOpenRegister={onOpenRegister}
      />

      <main className="grow px-5 md:px-10 lg:px-[52px] py-10">

        {/* Loading */}
        {loading && (
          <div className="max-w-[1200px] mx-auto py-20 text-center text-neutral-500">
            Loading listing…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="max-w-[1200px] mx-auto py-20 text-center text-red-600">
            Couldn&apos;t load this listing:{' '}
            {error}
          </div>
        )}

        {/* No listing */}
        {!loading && !error && !unit && (
          <div className="max-w-[1200px] mx-auto py-20 text-center text-neutral-500">
            No available units found.
          </div>
        )}

        {/* Listing */}
        {!loading && !error && unit && (
          <div className="max-w-[1200px] mx-auto flex flex-col gap-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {unit.property_name || unit.building_name}
                </h1>

                <p className="text-neutral-600 mt-1">
                  {unit.building_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
            </div>

            <div className="w-full">

              {/* Image Gallery */}
              <div className="relative grid grid-cols-2 gap-3">

                {/* Main image */}
                <div className="col-span-2 h-56 md:h-72 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">

                  {propertyImages[0] ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex(0)
                      }
                      className="w-full h-full cursor-pointer"
                    >
                      <img
                        src={`${API_BASE_URL}/${propertyImages[0]}`}
                        alt={
                          unit.property_name || unit.building_name
                        }
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      No image
                    </div>
                  )}

                </div>

                {/* Second image */}
                <div className="h-28 md:h-32 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">

                  {propertyImages[1] ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex(1)
                      }
                      className="w-full h-full cursor-pointer"
                    >
                      <img
                        src={`${API_BASE_URL}/${propertyImages[1]}`}
                        alt={`${unit.property_name || unit.building_name} image 2`}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      No image
                    </div>
                  )}

                </div>

                {/* Third image */}
                <div className="h-28 md:h-32 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">

                  {propertyImages[2] ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex(2)
                      }
                      className="w-full h-full cursor-pointer"
                    >
                      <img
                        src={`${API_BASE_URL}/${propertyImages[2]}`}
                        alt={`${unit.property_name || unit.building_name} image 3`}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      No image
                    </div>
                  )}

                </div>

                {propertyImages.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex(0)}
                    className="absolute bottom-3 right-3 z-10 rounded-lg bg-white/75 px-3 py-1.5 text-xs font-medium text-black shadow-md backdrop-blur-sm hover:bg-white/85 cursor-pointer"
                  >
                    Show all photos
                  </button>
                )}

              </div>

            </div>

            {/* =====================================================
                DETAILS + BOOKING
            ====================================================== */}

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">

              {/* Details */}
              <div>

                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Description</h2>
                  <a
                    href={getGoogleMapsUrl(unit)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-black"
                  >
                    <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#4285f4] text-xs font-bold text-white">G</span>
                    Google Maps
                  </a>
                </div>

                <p className="text-neutral-700 leading-relaxed">
                  {unit.description || 'No description provided for this unit yet.'}
                </p>

                <section className="mt-7 border-y border-neutral-200 py-6">
                  <h2 className="text-lg font-semibold mb-4">Property details</h2>

                  <div className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-neutral-500">Bathrooms / toilets</p>
                      <p className="mt-1 font-medium">{unit.bathrooms ?? 0}</p>
                    </div>
                  </div>

                  {Array.isArray(unit.bedroom_details) && unit.bedroom_details.length > 0 && (
                    <div className="mt-5">
                      <p className="text-sm text-neutral-500">Bedrooms and beds</p>
                      <div className="mt-2 space-y-2 text-sm">
                        {unit.bedroom_details.map((bedroom, index) => (
                          <p key={bedroom.id || index}>
                            <span className="font-medium">Bedroom {index + 1}:</span>{' '}
                            {(bedroom.beds || []).map((bed) => `${bed.numBeds || 1} ${bed.bedType || 'bed'}`).join(', ')}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

              </div>

              {/* Booking */}
              <div className="border border-neutral-300 rounded-xl p-5 h-fit">

                <p className="text-xl font-bold mb-4">
                  ₱
                  {Number(
                    unit.rate_per_night ?? 0
                  ).toFixed(2)}

                  <span className="text-sm font-normal text-neutral-500">
                    {' '}
                    / night
                  </span>
                </p>

                {/* Listing availability */}
                <div className="mb-4 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">

                  <p className="text-[11px] text-neutral-500 uppercase mb-1">
                    Available dates
                  </p>

                  {hasListingAvailability ? (
                    <p className="text-sm text-neutral-800">
                      {formatAvailabilityDate(
                        availableFrom
                      )}{' '}
                      to{' '}
                      {formatAvailabilityDate(
                        availableUntil
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">
                      Availability period not configured
                    </p>
                  )}

                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2 mb-3">

                  <label className="border border-neutral-300 rounded-lg px-3 py-2 flex flex-col focus-within:border-neutral-300">

                    <span className="text-[11px] text-neutral-500 uppercase">
                      Check-in
                    </span>

                    <input
                      type="date"
                      value={checkIn}
                      min={availableFrom || undefined}
                      max={availableUntil || undefined}
                      disabled={!hasListingAvailability}
                      onChange={handleCheckInChange}
                      className="booking-input bg-transparent outline-none focus:outline-none focus-visible:outline-none focus:ring-0 text-sm disabled:text-neutral-400"
                    />

                  </label>

                  <label className="border border-neutral-300 rounded-lg px-3 py-2 flex flex-col focus-within:border-neutral-300">

                    <span className="text-[11px] text-neutral-500 uppercase">
                      Check-out
                    </span>

                    <input
                      type="date"
                      value={checkOut}
                      min={
                        checkIn &&
                        checkIn >= availableFrom
                          ? checkIn
                          : availableFrom || undefined
                      }
                      max={availableUntil || undefined}
                      disabled={!hasListingAvailability}
                      onChange={handleCheckOutChange}
                      className="booking-input bg-transparent outline-none focus:outline-none focus-visible:outline-none focus:ring-0 text-sm disabled:text-neutral-400"
                    />

                  </label>

                </div>

                {/* Guests */}
                <label className="block border border-neutral-300 rounded-lg px-3 py-2 mb-4 focus-within:border-neutral-300">

                  <span className="text-[11px] text-neutral-500 uppercase block">
                    Pax
                  </span>
                  <span className="mt-1 block text-xs text-neutral-500">
                    Up to {unit.max_guests} reservations can overlap for this unit; pax per reservation is not capped.
                  </span>

                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={guests}
                    onChange={(event) =>
                      setGuests(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="booking-input bg-transparent outline-none focus:outline-none focus-visible:outline-none focus:ring-0 text-sm w-full"
                  />

                </label>

                {/* Reserve */}
                <button
                  type="button"
                  onClick={handleReserve}
                  disabled={
                    unit.status !==
                      'available' ||
                    !hasListingAvailability ||
                    !isSelectedDatesInsideListingAvailability ||
                    isDateRangeAvailable !==
                      true
                  }
                  className="w-full py-3 rounded-full bg-black text-white font-medium disabled:bg-neutral-300 disabled:cursor-not-allowed hover:bg-neutral-800 cursor-pointer"
                >
                  {unit.status !==
                  'available'
                    ? 'Unavailable'
                    : !hasListingAvailability
                    ? 'Unavailable'
                    : availabilityError
                    ? 'Dates unavailable'
                    : isDateRangeAvailable ===
                      false
                    ? 'Dates unavailable'
                    : 'Reserve'}
                </button>

                {availabilityError && (
                  <p className="mt-2 text-xs text-red-600">
                    {availabilityError}
                  </p>
                )}

                {!availabilityError &&
                  checkIn &&
                  checkOut &&
                  checkOut > checkIn &&
                  isDateRangeAvailable ===
                    false && (
                    <p className="mt-2 text-xs text-red-600">
                      This room is already
                      booked for the selected
                      dates.
                    </p>
                  )}

              </div>

            </div>

            <hr className="border-neutral-200" />

            {/* =====================================================
                AMENITIES 
            ====================================================== */}

            <section>

              <h2 className="text-xl font-bold mb-5">
                What&apos;s this place offer
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">

                {visibleAmenities.map(
                  (amenity) => (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-2"
                    >

                      <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200" />

                      <span className="text-sm">
                        {amenity.name}
                      </span>

                    </div>
                  )
                )}

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAllAmenities(
                    (value) => !value
                  )
                }
                className="text-sm font-medium underline cursor-pointer"
              >
                {showAllAmenities
                  ? 'Show less'
                  : 'Show all amenities'}
              </button>

            </section>

          </div>
        )}

      </main>

      <Footer />
      <Chatbot />

      {/* =========================================================
          FULL-SCREEN IMAGE VIEWER
      ========================================================== */}

      {selectedImageIndex !== null &&
        propertyImages.length > 0 && (
          <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImageIndex(null)}
          >

            {/* Close button */}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedImageIndex(null);
              }}
              className="absolute top-5 right-5 z-30 w-11 h-10 rounded-full bg-white/90 text-black text-3xl leading-none flex items-center justify-center hover:bg-white cursor-pointer"
              aria-label="Close image"
            >
              ×
            </button>

            {/* Previous image */}
            {propertyImages.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();

                  setSelectedImageIndex((currentIndex) => {
                    if (currentIndex === null) return 0;

                    return currentIndex === 0
                      ? propertyImages.length - 1
                      : currentIndex - 1;
                  });
                }}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/90 text-black text-4xl leading-none flex items-center justify-center hover:bg-white cursor-pointer shadow-lg"
                aria-label="Previous image"
              >
                &lsaquo;
              </button>
            )}

            {/* Full image */}
            <img
              src={`${API_BASE_URL}/${propertyImages[selectedImageIndex]}`}
              alt={`${unit?.building_name || 'Property'} image ${
                selectedImageIndex + 1
              }`}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(event) => event.stopPropagation()}
            />

            {/* Next image */}
            {propertyImages.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();

                  setSelectedImageIndex((currentIndex) => {
                    if (currentIndex === null) return 0;

                    return currentIndex === propertyImages.length - 1
                      ? 0
                      : currentIndex + 1;
                  });
                }}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/90 text-black text-4xl leading-none flex items-center justify-center hover:bg-white cursor-pointer shadow-lg"
                aria-label="Next image"
              >
                ›
              </button>
            )}

            {/* Image counter */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
              {selectedImageIndex + 1} / {propertyImages.length}
            </div>

          </div>
        )}

    </div>
  );
}

function getGoogleMapsUrl(unit) {
  return unit?.google_maps_url || '#';
}