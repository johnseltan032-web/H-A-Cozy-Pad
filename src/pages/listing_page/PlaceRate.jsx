import { useEffect, useState } from 'react';
import ListingHeader from '../../components/ListingHeader';
import { useNavigate } from 'react-router-dom';
import { getListingDraft, updateListingDraft } from '../../lib/listingDraft';

let bedroomIdCounter = 0;
let bedIdCounter = 0;

function makeBed() {
  return {
    id: bedIdCounter++,
    bedType: 'Queen Bed',
    numBeds: 1,
  };
}

function makeBedroom() {
  return {
    id: bedroomIdCounter++,
    beds: [makeBed()],
  };
}

const BED_TYPES = [
  'Queen Bed',
  'King Bed',
  'Full Bed',
  'Twin Bed',
  'Bunk Bed',
  'Sofa Bed',
];

function Counter({ label, value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-[15px] font-medium mb-2">{label}</p>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-9 h-9 rounded-full border border-black flex items-center justify-center text-lg hover:bg-neutral-100 transition disabled:opacity-30 disabled:hover:bg-transparent"
          disabled={value <= min}
        >
          −
        </button>

        <span className="w-5 text-center text-[15px]">
          {value}
        </span>

        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-9 h-9 rounded-full border border-black flex items-center justify-center text-lg hover:bg-neutral-100 transition disabled:opacity-30 disabled:hover:bg-transparent"
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

function BedTypeRow({ bed, onChange, onRemove, canRemove }) {
  return (
    <div className="flex flex-wrap items-end gap-3 sm:flex-nowrap sm:gap-4">
      <div className="min-w-0 flex-1 basis-[160px]">
        <p className="text-[13px] text-neutral-600 mb-1">
          Bed type
        </p>

        <div className="relative">
          <select
            value={bed.bedType}
            onChange={(e) =>
              onChange({
                bedType: e.target.value,
              })
            }
            className="w-full h-[46px] border border-black rounded-full pl-4 pr-9 text-[15px] appearance-none bg-white focus:outline-none focus:bg-neutral-50"
          >
            {BED_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <svg
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col items-center text-center">
        <p className="text-[13px] text-neutral-600 mb-1">
          Number of Bed
        </p>

        <div className="flex items-center justify-center gap-4 h-[46px] px-4 border border-black rounded-full">
          <button
            type="button"
            aria-label="Decrease number of beds"
            onClick={() =>
              onChange({
                numBeds: Math.max(1, bed.numBeds - 1),
              })
            }
            className="text-lg leading-none hover:text-neutral-500 transition disabled:opacity-30 disabled:hover:text-black"
            disabled={bed.numBeds <= 1}
          >
            −
          </button>

          <span className="w-4 text-center text-[15px]">
            {bed.numBeds}
          </span>

          <button
            type="button"
            aria-label="Increase number of beds"
            onClick={() =>
              onChange({
                numBeds: bed.numBeds + 1,
              })
            }
            className="text-lg leading-none hover:text-neutral-500 transition"
          >
            +
          </button>
        </div>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove bed type"
          className="h-[46px] flex items-center text-[13px] text-neutral-500 hover:text-black underline transition shrink-0"
        >
          Remove
        </button>
      )}
    </div>
  );
}

export default function RoomsRates() {
  const navigate = useNavigate();
  const draft = getListingDraft();

  const [bedrooms, setBedrooms] = useState(
    draft.bedrooms?.length ? draft.bedrooms : [makeBedroom()]
  );

  const [bathrooms, setBathrooms] = useState(
    draft.bathrooms || 0
  );

  const [nightlyRate, setNightlyRate] = useState(
    draft.ratePerNight || ''
  );

  /*
   * Listing availability
   */
  const [availableFrom, setAvailableFrom] = useState(
    draft.availableFrom || ''
  );

  const [availableUntil, setAvailableUntil] = useState(
    draft.availableUntil || ''
  );

  useEffect(() => {
    updateListingDraft({
      bedrooms,
      bathrooms,
      ratePerNight: nightlyRate,
      availableFrom,
      availableUntil,
    });
  }, [bedrooms, bathrooms, nightlyRate, availableFrom, availableUntil]);

  const addBedroom = () => {
    setBedrooms((prev) => [
      ...prev,
      makeBedroom(),
    ]);
  };

  const removeBedroom = (id) => {
    setBedrooms((prev) =>
      prev.length > 1
        ? prev.filter((b) => b.id !== id)
        : prev
    );
  };

  const addBedType = (bedroomId) => {
    setBedrooms((prev) =>
      prev.map((b) =>
        b.id === bedroomId
          ? {
              ...b,
              beds: [
                ...b.beds,
                makeBed(),
              ],
            }
          : b
      )
    );
  };

  const updateBedType = (
    bedroomId,
    bedId,
    patch
  ) => {
    setBedrooms((prev) =>
      prev.map((b) =>
        b.id === bedroomId
          ? {
              ...b,
              beds: b.beds.map((bed) =>
                bed.id === bedId
                  ? {
                      ...bed,
                      ...patch,
                    }
                  : bed
              ),
            }
          : b
      )
    );
  };

  const removeBedType = (
    bedroomId,
    bedId
  ) => {
    setBedrooms((prev) =>
      prev.map((b) =>
        b.id === bedroomId &&
        b.beds.length > 1
          ? {
              ...b,
              beds: b.beds.filter(
                (bed) => bed.id !== bedId
              ),
            }
          : b
      )
    );
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">

      {/* Header */}
      <ListingHeader
        onOpenQuestions={() =>
          console.log('Questions')
        }
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col">

        <div className="w-full max-w-[560px] mx-auto pt-10 md:pt-11 px-6">

          {/* Heading */}
          <h1 className="text-center text-[23px] md:text-[24px] font-semibold leading-tight mb-8">
            Rooms &amp; Rates
          </h1>

          {/* Bedrooms */}
          <div className="space-y-5">
            {bedrooms.map((bedroom, index) => (
              <div key={bedroom.id}>

                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[16px] font-semibold">
                    Bedroom {index + 1}
                  </h2>

                  {bedrooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeBedroom(
                          bedroom.id
                        )
                      }
                      className="text-[13px] text-neutral-500 hover:text-black underline transition"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="border border-black rounded-[19px] p-5">

                  <div className="space-y-4 mb-3">
                    {bedroom.beds.map((bed) => (
                      <BedTypeRow
                        key={bed.id}
                        bed={bed}
                        canRemove={
                          bedroom.beds.length > 1
                        }
                        onChange={(patch) =>
                          updateBedType(
                            bedroom.id,
                            bed.id,
                            patch
                          )
                        }
                        onRemove={() =>
                          removeBedType(
                            bedroom.id,
                            bed.id
                          )
                        }
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      addBedType(
                        bedroom.id
                      )
                    }
                    className="text-[14px] underline hover:text-neutral-600 transition"
                  >
                    Add bed type
                  </button>

                </div>
              </div>
            ))}
          </div>

          {/* Add bedroom */}
          <button
            type="button"
            onClick={addBedroom}
            className="mt-4 w-full h-[46px] rounded-full border border-black text-[15px] font-medium flex items-center justify-center gap-2 hover:bg-neutral-100 transition"
          >
            <span className="text-lg leading-none">
              +
            </span>

            Add Bedroom
          </button>

          {/* Divider */}
          <hr className="border-neutral-300 my-7" />

          {/* Bathrooms */}
          <div className="mb-8 flex items-start justify-center">
            <Counter
              label="Number of Bathrooms"
              value={bathrooms}
              min={0}
              onChange={(value) => {
                setBathrooms(value);

                updateListingDraft({
                  bathrooms: value,
                });
              }}
            />
          </div>

          {/* Rate */}
          <h2 className="text-center text-[16px] font-semibold mb-4">
            How will you manage your rate?
          </h2>

          <div className="mb-8">

            <p className="text-[13px] text-neutral-600 mb-1">
              Nightly rate
            </p>

            <div className="relative">

              <input
                type="number"
                min="0"
                value={nightlyRate}
                onChange={(e) => {
                  setNightlyRate(
                    e.target.value
                  );

                  updateListingDraft({
                    ratePerNight:
                      e.target.value,
                  });
                }}
                placeholder="0"
                className="w-full h-[52px] border border-black rounded-full pl-5 pr-28 text-[15px] placeholder:text-neutral-400 focus:outline-none focus:bg-neutral-50"
              />

              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[14px] text-neutral-600">
                PHP / night
              </span>

            </div>
          </div>

          {/* Listing Availability */}
          <h2 className="text-center text-[16px] font-semibold mb-3">
            When can the listing be booked?
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-8">

            {/* Available From */}
            <div>

              <p className="text-[12px] text-neutral-600 mb-1">
                Available from
              </p>

              <input
                type="date"
                value={availableFrom}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setAvailableFrom(value);

                  /*
                   * If the new start date is
                   * after the current end date,
                   * clear the end date.
                   */
                  if (
                    availableUntil &&
                    value > availableUntil
                  ) {
                    setAvailableUntil('');

                    updateListingDraft({
                      availableFrom: value,
                      availableUntil: '',
                    });
                  } else {
                    updateListingDraft({
                      availableFrom: value,
                    });
                  }
                }}
                className="w-full h-[44px] border border-black rounded-full px-4 text-[13px] focus:outline-none focus:bg-neutral-50"
              />

            </div>

            {/* Available Until */}
            <div>

              <p className="text-[12px] text-neutral-600 mb-1">
                Available until
              </p>

              <input
                type="date"
                value={availableUntil}
                min={availableFrom || undefined}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setAvailableUntil(value);

                  updateListingDraft({
                    availableUntil:
                      value,
                  });
                }}
                className="w-full h-[44px] border border-black rounded-full px-4 text-[13px] focus:outline-none focus:bg-neutral-50"
              />

            </div>

          </div>

        </div>

        {/* Bottom buttons */}
        <div className="listing-step-actions mt-auto grid grid-cols-2 gap-3 px-4 pb-6 pt-8 sm:flex sm:items-center sm:justify-between sm:px-10">

          {/* Back */}
          <button
            type="button"
            onClick={() =>
              window.history.back()
            }
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
            onClick={() => navigate('/host/listing/PlaceDetail')}
            className="
              w-full sm:w-[142px] h-[50px]
              rounded-full
              border border-neutral-400
              bg-neutral-300 text-black
              text-[20px]
              hover:bg-neutral-400
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