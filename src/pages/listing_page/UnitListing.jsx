import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../lib/api';
import {
  getListingDraft,
  updateListingDraft,
} from '../../lib/listingDraft';
import ListingHeader from '../../components/ListingHeader';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function UnitListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [selectedProperty, setSelectedProperty] = useState(() => {
    const draft = getListingDraft();
    return draft.propertyCategory || null;
  });

  useEffect(() => {
    if (!editId) {
      return;
    }

    setLoading(true);

    fetch(`${API_BASE_URL}/get_listing.php?building_id=${editId}`, {
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load listing');
        }

        return data;
      })
      .then((data) => {
        updateListingDraft({
          editingBuildingId: data.building_id,
          buildingName: data.building_name,
          location: data.location,
          unitName: data.unit_name,
          description: data.description,
          maxGuests: data.max_guests,
          ratePerNight: data.rate_per_night,
          status: data.status,

          // Keep the property category when editing.
          propertyCategory: data.property_category || 'home',
        });

        setSelectedProperty(data.property_category || 'home');
      })
      .catch((error) => {
        console.error('Error loading listing:', error);
        setLoading(false);
      });
  }, [editId]);

  const propertyTypes = [
    {
      id: 'home',
      title: 'Home-type property',
      description:
        'Standalone units rented as a whole, such as individual apartments/flats, single bungalows, villas, and guest houses. They offer a residential experience for travelers seeking privacy and self-sufficient stays.',
    },
    {
      id: 'hotel',
      title: 'Hotel-type property',
      description:
        'Standalone units rented as a whole, such as individual apartments/flats, single bungalows, villas, and guest houses. They offer a residential experience for travelers seeking privacy and self-sufficient stays.',
    },
    {
      id: 'unique',
      title: 'Unique-type property',
      description:
        'Standalone units rented as a whole, such as individual apartments/flats, single bungalows, villas, and guest houses. They offer a residential experience for travelers seeking privacy and self-sufficient stays.',
    },
  ];

  const handlePropertySelect = (propertyId) => {
    setSelectedProperty(propertyId);

    updateListingDraft({
      propertyCategory: propertyId,
    });
  };

  const handleContinue = () => {
    if (!selectedProperty) {
      return;
    }

    updateListingDraft({
      propertyCategory: selectedProperty,
    });

    navigate('/host/listing/PlaceDescription');
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">

      {/* Header */}
      <ListingHeader
        onOpenQuestions={() => console.log('Questions')}
        onSaveAndExit={() => console.log('Save & Exit')}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col">

        <div className="w-full max-w-[636px] mx-auto pt-10 md:pt-11">

          {/* Heading */}
          <h1 className="text-center text-[23px] md:text-[24px] font-semibold leading-tight mb-5">
            What type of property are you listing?
          </h1>

          {/* Property cards */}
          <div className="space-y-5">
            {propertyTypes.map((property) => {
              const selected = selectedProperty === property.id;

              return (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handlePropertySelect(property.id)}
                  className={`
                    block w-full text-left
                    border border-black
                    rounded-[19px]
                    px-6 py-4
                    transition
                    cursor-pointer
                    ${
                      selected
                        ? 'bg-neutral-100'
                        : 'bg-white hover:bg-neutral-50'
                    }
                  `}
                >
                  <h2 className="text-[20px] md:text-[21px] font-medium leading-tight">
                    {property.title}
                  </h2>

                  <p className="mt-1.5 text-[15px] md:text-[15.5px] leading-[1.15] font-normal">
                    {property.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="mt-auto grid grid-cols-2 gap-3 px-4 pb-6 pt-8 sm:flex sm:items-center sm:justify-between sm:px-10">

          {/* Exit */}
          <button
            type="button"
            onClick={() => navigate('/host/listings')}
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
            Exit
          </button>

          {/* Continue */}
          <button
            type="button"
            disabled={!selectedProperty}
            onClick={handleContinue}
            className={`
              w-full sm:w-[142px] h-[50px]
              rounded-full
              border border-black
              text-[20px]
              transition
              ${
                selectedProperty
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