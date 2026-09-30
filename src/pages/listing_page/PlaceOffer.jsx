import { useState } from 'react';
import ListingHeader from '../../components/ListingHeader';
import { useNavigate } from 'react-router-dom';
import { getListingDraft, updateListingDraft } from '../../lib/listingDraft';

const amenities = [
  { id: 'wifi', title: 'WiFi', icon: '📶' },
  { id: 'kitchen', title: 'Kitchen', icon: '🍳' },
  { id: 'freeParking', title: 'Free parking', icon: '🚗' },
  { id: 'airConditioning', title: 'Air conditioning', icon: '❄️' },
  { id: 'tv', title: 'TV', icon: '📺' },
  { id: 'washer', title: 'Washer', icon: '🧺' },
  { id: 'pool', title: 'Pool', icon: '🏊' },
  { id: 'heating', title: 'Heating', icon: '🔥' },
  { id: 'workspace', title: 'Workspace', icon: '💻' },
  { id: 'gym', title: 'Gym', icon: '🏋️' },
  { id: 'garage', title: 'Garage', icon: '🚪' },
  { id: 'petsAllowed', title: 'Pets allowed', icon: '🐾' },
];

export default function PlaceOffer() {
  const draft = getListingDraft();
  const [selectedAmenities, setSelectedAmenities] = useState(
    draft.amenityIds || []
  );
  const navigate = useNavigate();

  const toggleAmenity = (id) => {
    setSelectedAmenities((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      updateListingDraft({
        amenityIds: next,
        amenities: next.map((amenityId) =>
          amenities.find((amenity) => amenity.id === amenityId)?.title
        ),
      });
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">

      {/* Header */}
      <ListingHeader
        onOpenQuestions={() => console.log('Questions')}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col">

        <div className="w-full max-w-[720px] mx-auto pt-10 md:pt-11 px-6">

          {/* Heading */}
          <h1 className="text-center text-[23px] md:text-[24px] font-semibold leading-tight mb-6">
            What the place has to offer
          </h1>

          {/* Amenity cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {amenities.map((amenity) => {
              const selected = selectedAmenities.includes(amenity.id);

              return (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenity(amenity.id)}
                  aria-pressed={selected}
                  className={`
                    flex flex-col items-center justify-center
                    text-center
                    border border-neutral-300
                    rounded-xl
                    px-3 py-4
                    transition
                    cursor-pointer
                    ${selected ? 'border-[#df766c] bg-[#df766c] text-white' : 'bg-white hover:border-neutral-400 hover:bg-neutral-50'}
                  `}
                >
                  <h2 className="text-[14px] md:text-[15px] font-medium leading-tight mb-2">
                    {amenity.title}
                  </h2>

                  <span className="text-xl" aria-hidden="true">
                    {amenity.icon}
                  </span>
                </button>
              );
            })}
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
            disabled={selectedAmenities.length === 0}
            onClick={() => navigate('/host/listing/PlaceLocation')}
            className={`
              w-full sm:w-[142px] h-[50px]
              rounded-full
              border border-black
              text-[20px]
              transition
              ${
                selectedAmenities.length > 0
                  ? 'bg-black text-white hover:bg-neutral-800 cursor-pointer'
                  : 'bg-neutral-200 text-black cursor-not-allowed'
              }
            `}
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}