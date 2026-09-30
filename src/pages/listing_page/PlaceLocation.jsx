import { useEffect, useState } from 'react';
import ListingHeader from '../../components/ListingHeader';
import { useNavigate } from 'react-router-dom';
import { getListingDraft, updateListingDraft } from '../../lib/listingDraft';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconPng,
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng
});

const DefaultIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapClickHandler({ onLocationPick }) {
  useMapEvents({
    click(e) {
      onLocationPick(e.latlng);
    },
  });

  return null;
}

function MapViewUpdater({ location }) {
  const map = useMapEvents({});

  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 15);
    }
  }, [location, map]);

  return null;
}

export default function Location() {
  const navigate = useNavigate();
  const draft = getListingDraft();

  const [search, setSearch] = useState(draft.search || '');
  const [country, setCountry] = useState(draft.country || '');
  const [state, setState] = useState(draft.state || '');
  const [city, setCity] = useState(draft.city || '');
  const [street, setStreet] = useState(draft.street || '');
  const [unit, setUnit] = useState(draft.unit || '');
  const [zip, setZip] = useState(draft.zip || '');

  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({});

  const savedLatitude = Number(draft.latitude);
  const savedLongitude = Number(draft.longitude);

  const hasSavedLocation =
    Number.isFinite(savedLatitude) && Number.isFinite(savedLongitude);

  const defaultCenter = hasSavedLocation
    ? [savedLatitude, savedLongitude]
    : [14.5995, 120.9842];

  const [selectedLocation, setSelectedLocation] = useState(
    hasSavedLocation
      ? { lat: savedLatitude, lng: savedLongitude }
      : null
  );

  const updateField = (field, setValue) => (event) => {
    const value = event.target.value;

    setValue(value);
    updateListingDraft({ [field]: value });

    // Remove the error when the user starts filling the field
    if (value.trim()) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleLocationPick = ({ lat, lng }) => {
    const location = { lat, lng };

    setSelectedLocation(location);

    updateListingDraft({
      latitude: lat,
      longitude: lng,
    });
  };

  useEffect(() => {
    const query = search.trim();

    if (query.length < 3) {
      const timeoutId = window.setTimeout(() => {
        setSuggestions([]);
        setIsSearching(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const params = new URLSearchParams({
          q: query,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
        });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error('Location search failed');
        }

        setSuggestions(await response.json());
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [search]);

  const selectSuggestion = (suggestion) => {
    const address = suggestion.address || {};

    const nextLocation = {
      lat: Number(suggestion.lat),
      lng: Number(suggestion.lon),
    };

    const nextFields = {
      search: suggestion.display_name,
      street: [address.house_number, address.road]
        .filter(Boolean)
        .join(' '),
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        '',
      state: address.state || address.region || '',
      country: address.country || '',
      zip: address.postcode || '',
      latitude: nextLocation.lat,
      longitude: nextLocation.lng,
    };

    setSearch(nextFields.search);
    setStreet(nextFields.street);
    setCity(nextFields.city);
    setState(nextFields.state);
    setCountry(nextFields.country);
    setZip(nextFields.zip);

    setSelectedLocation(nextLocation);
    setSuggestions([]);

    // Clear validation errors for fields populated by search
    setErrors((prev) => ({
      ...prev,
      country: '',
      state: '',
      city: '',
      street: '',
    }));

    updateListingDraft(nextFields);
  };

  // Validate required fields
  const validateForm = () => {
    const newErrors = {};

    if (!country.trim()) {
      newErrors.country = 'Country or Region is required.';
    }

    if (!state.trim()) {
      newErrors.state = 'State/Province is required.';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required.';
    }

    if (!street.trim()) {
      newErrors.street = 'Street Address is required.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) {
      return;
    }

    navigate('/host/listing/PlaceRate');
  };

  const inputClass =
    'w-full h-[52px] border border-black rounded-full px-5 text-[15px] placeholder:text-neutral-500 focus:outline-none focus:bg-neutral-50';

  const errorInputClass =
    'w-full h-[52px] border border-red-500 rounded-full px-5 text-[15px] placeholder:text-neutral-500 focus:outline-none focus:bg-neutral-50';

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">

      {/* Header */}
      <ListingHeader
        onOpenQuestions={() => console.log('Questions')}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col">

        <div className="w-full max-w-[560px] mx-auto pt-10 md:pt-11 px-6">

          {/* Heading */}
          <h1 className="text-center text-[23px] md:text-[24px] font-semibold leading-tight mb-6">
            Where is your place located?
          </h1>

          {/* Search bar */}
          <div className="relative mb-6">

            <input
              type="text"
              value={search}
              onChange={updateField('search', setSearch)}
              placeholder="Search for property or location"
              className="w-full h-[52px] border border-black rounded-full pl-11 pr-5 text-[15px] placeholder:text-neutral-500 focus:outline-none focus:bg-neutral-50"
            />

            {(isSearching || suggestions.length > 0) && (
              <div className="absolute z-[1000] left-0 right-0 top-[58px] overflow-hidden rounded-2xl border border-black bg-white shadow-lg">

                {isSearching && (
                  <p className="px-5 py-3 text-sm text-neutral-500">
                    Searching locations...
                  </p>
                )}

                {!isSearching &&
                  suggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="block w-full border-b border-neutral-200 px-5 py-3 text-left text-sm last:border-b-0 hover:bg-neutral-100"
                    >
                      {suggestion.display_name}
                    </button>
                  ))}
              </div>
            )}

            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>

          {/* Property location fields */}
          <h2 className="text-[16px] font-semibold mb-3">
            Property Location
          </h2>

          <div className="space-y-4">

            {/* Country */}
            <div>
              <input
                type="text"
                value={country}
                onChange={updateField('country', setCountry)}
                placeholder="Country or Region"
                className={errors.country ? errorInputClass : inputClass}
              />

              {errors.country && (
                <p className="mt-1 ml-5 text-sm text-red-500">
                  {errors.country}
                </p>
              )}
            </div>

            {/* State + City */}
            <div className="flex gap-4">

              {/* State */}
              <div className="w-1/2">
                <input
                  type="text"
                  value={state}
                  onChange={updateField('state', setState)}
                  placeholder="State/Province"
                  className={
                    errors.state
                      ? errorInputClass
                      : inputClass
                  }
                />

                {errors.state && (
                  <p className="mt-1 ml-5 text-sm text-red-500">
                    {errors.state}
                  </p>
                )}
              </div>

              {/* City */}
              <div className="w-1/2">
                <input
                  type="text"
                  value={city}
                  onChange={updateField('city', setCity)}
                  placeholder="City"
                  className={
                    errors.city
                      ? errorInputClass
                      : inputClass
                  }
                />

                {errors.city && (
                  <p className="mt-1 ml-5 text-sm text-red-500">
                    {errors.city}
                  </p>
                )}
              </div>

            </div>

            {/* Street Address */}
            <div>
              <input
                type="text"
                value={street}
                onChange={updateField('street', setStreet)}
                placeholder="Street Address"
                className={
                  errors.street
                    ? errorInputClass
                    : inputClass
                }
              />

              {errors.street && (
                <p className="mt-1 ml-5 text-sm text-red-500">
                  {errors.street}
                </p>
              )}
            </div>

            {/* Building / Unit - OPTIONAL */}
            <input
              type="text"
              value={unit}
              onChange={updateField('unit', setUnit)}
              placeholder="Building, Floor or Unit Number (Optional)"
              className={inputClass}
            />

            {/* ZIP - OPTIONAL */}
            <input
              type="text"
              value={zip}
              onChange={updateField('zip', setZip)}
              placeholder="ZIP/Postal Code (Optional)"
              className={inputClass}
            />

          </div>

          {/* Map */}
          <div className="relative z-0 mt-6 mb-6 overflow-hidden rounded-[19px] border border-black">

            <div className="h-[300px]">

              <MapContainer
                center={defaultCenter}
                zoom={hasSavedLocation ? 15 : 12}
                scrollWheelZoom
                style={{
                  height: '100%',
                  width: '100%',
                }}
              >

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler
                  onLocationPick={handleLocationPick}
                />

                <MapViewUpdater
                  location={selectedLocation}
                />

                {selectedLocation && (
                  <Marker
                    position={[
                      selectedLocation.lat,
                      selectedLocation.lng,
                    ]}
                  />
                )}

              </MapContainer>

            </div>

            <p className="border-t border-black bg-white px-4 py-3 text-[13px] text-neutral-600">
              {selectedLocation
                ? `Selected coordinates: ${selectedLocation.lat.toFixed(
                    5
                  )}, ${selectedLocation.lng.toFixed(5)}`
                : 'Click the map to select the property location.'}
            </p>

          </div>

        </div>

        {/* Bottom buttons */}
        <div className="listing-step-actions mt-auto grid grid-cols-2 gap-3 px-4 pb-6 pt-8 sm:flex sm:items-center sm:justify-between sm:px-10">

          {/* Back */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="
              w-full sm:w-[142px] h-[50px]
              rounded-full
              border border-black
              bg-white
              text-[20px]
              hover:bg-neutral-100
              transition
            "
          >
            Back
          </button>

          {/* Continue */}
          <button
            type="button"
            onClick={handleContinue}
            className="
              w-full sm:w-[142px] h-[50px]
              rounded-full
              border border-black
              bg-black text-white
              text-[20px]
              hover:bg-neutral-800
              transition
            "
          >
            Continue
          </button>

        </div>

      </main>

    </div>
  );
}