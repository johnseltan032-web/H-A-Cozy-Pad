import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ListingHeader from '../../components/ListingHeader';

import {
  clearListingDraft,
  getListingDraft,
} from '../../lib/listingDraft';

import { API_BASE_URL } from '../../lib/api';

function ImagePlaceholderIcon() {
  return (
    <svg
      className="w-6 h-6 text-neutral-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 15.5l-5-5L5 20" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className="w-4 h-4 text-black shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function ListingPublish() {
  const navigate = useNavigate();
  const location = useLocation();

  const draft = getListingDraft();

  const images = location.state?.images || [];
  const firstImage =
    images[0]?.preview ||
    (images[0]?.file instanceof File
      ? URL.createObjectURL(images[0].file)
      : null);

  const isEditing = !!draft.editingBuildingId;

  const propertyName =
    draft.buildingName || 'Property Name';

  const propertyPlace =
    [draft.city, draft.country]
      .filter(Boolean)
      .join(', ') || 'Property Place';

  const [agreed, setAgreed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');

  const publishListing = async () => {
    if (!agreed) {
      setError(
        'Please accept the Terms and Conditions.'
      );
      return;
    }

    if (!isEditing && images.length === 0) {
      setError(
        'Please upload at least one property image.'
      );
      return;
    }

    /*
     * Make sure listing availability was selected.
     */
    if (
      !draft.availableFrom ||
      !draft.availableUntil
    ) {
      setError(
        'Please select when the listing can be booked.'
      );
      return;
    }

    /*
     * Make sure the end date is not before
     * the start date.
     */
    if (
      draft.availableUntil <
      draft.availableFrom
    ) {
      setError(
        'The availability end date cannot be before the start date.'
      );
      return;
    }

    setIsPublishing(true);
    setError('');

    const fullLocation = [
      draft.street,
      draft.city,
      draft.state,
      draft.country,
      draft.zip,
    ]
      .filter(Boolean)
      .join(', ') || draft.location || '';

    try {
      const formData = new FormData();

      formData.append(
        'buildingId',
        draft.editingBuildingId || ''
      );

      formData.append(
        'buildingName',
        draft.building || draft.buildingName || ''
      );
      formData.append('propertyName', draft.buildingName || '');

      formData.append(
        'location',
        fullLocation
      );

      formData.append('locationSearch', draft.search || '');
      formData.append('country', draft.country || '');
      formData.append('state', draft.state || '');
      formData.append('city', draft.city || '');
      formData.append('street', draft.street || '');
      formData.append('unitLocation', draft.unit || '');
      formData.append('zip', draft.zip || '');
      formData.append('bathrooms', draft.bathrooms || '0');
      formData.append('bedroomDetails', JSON.stringify(draft.bedrooms || []));

      if (
        draft.latitude !== null &&
        draft.latitude !== undefined
      ) {
        formData.append(
          'latitude',
          draft.latitude
        );
      }

      if (
        draft.longitude !== null &&
        draft.longitude !== undefined
      ) {
        formData.append(
          'longitude',
          draft.longitude
        );
      }

      formData.append(
        'tower',
        draft.tower || ''
      );

      formData.append(
        'unitNumber',
        draft.unitNumber || ''
      );

      formData.append(
        'description',
        draft.description || ''
      );

      formData.append(
        'maxGuests',
        draft.maxGuests || ''
      );

      formData.append(
        'ratePerNight',
        draft.ratePerNight || ''
      );

      /*
       * Listing availability
       */
      formData.append(
        'availableFrom',
        draft.availableFrom
      );

      formData.append(
        'availableUntil',
        draft.availableUntil
      );

      /*
       * Amenities
       */
      (draft.amenities || []).forEach(
        (amenity) => {
          formData.append(
            'amenities[]',
            amenity
          );
        }
      );

      /*
       * Images
       */
      images.forEach((image) => {
        const file = image?.file ?? image;

        if (file instanceof File) {
          formData.append(
            'images[]',
            file
          );
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/${
          isEditing
            ? 'edit_listing.php'
            : 'create_listing.php'
        }`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            'Unable to publish listing'
        );
      }

      clearListingDraft();

      navigate('/host/listings');

    } catch (publishError) {
      setError(
        publishError.message ||
          'Unable to publish listing.'
      );

      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">

      {/* Header */}
      <ListingHeader
        onOpenQuestions={() =>
          console.log('Questions')
        }
      />

      {/* Main */}
      <main className="flex-1 flex flex-col">

        <div className="w-full max-w-[560px] mx-auto pt-10 md:pt-11 px-6">

          {/* Heading */}
          <h1 className="text-center text-[23px] md:text-[24px] font-semibold leading-tight mb-8">
            Publish
          </h1>

          {/* Summary card */}
          <div className="flex items-center gap-4 border border-black rounded-[19px] px-5 py-4 mb-7">

            <div className="w-14 h-14 rounded-xl bg-neutral-200 overflow-hidden shrink-0">
              {firstImage ? (
                <img
                  src={firstImage}
                  alt="Listing preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImagePlaceholderIcon />
                </div>
              )}
            </div>

            <div>

              <p className="text-[15px] font-semibold leading-tight">
                {propertyName}
              </p>

              <div className="flex items-center gap-1.5 mt-1">
                <PinIcon />

                <p className="text-[13px] text-neutral-600 leading-tight">
                  {propertyPlace}
                </p>
              </div>

              <p className="text-[12px] text-neutral-500 mt-1">
                {images.length}{' '}
                {images.length === 1
                  ? 'photo'
                  : 'photos'}{' '}
                selected
              </p>

            </div>

          </div>

          {/* Divider */}
          <hr className="border-neutral-300 mb-6" />

          {/* Terms */}
          <h2 className="text-[15px] font-semibold mb-3">
            Accept Terms &amp; Condition
          </h2>

          <label className="flex items-start gap-3 cursor-pointer">

            <span
              onClick={() =>
                setAgreed((prev) => !prev)
              }
              className="
                w-6
                h-6
                mt-0.5
                rounded-md
                border
                border-black
                flex
                items-center
                justify-center
                shrink-0
                bg-white
              "
            >
              {agreed && (
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>

            <span
              onClick={() =>
                setAgreed((prev) => !prev)
              }
              className="text-[14px] leading-snug text-neutral-800"
            >
              I acknowledge that I have read and agree
              to the Terms and Conditions and Privacy
              Policy. Additionally, I confirm my compliance
              with all relevant local laws and regulations.
            </span>

          </label>

          {error && (
            <p className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}

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
              w-full sm:w-[142px]
              h-[50px]
              rounded-full
              border
              border-black
              bg-white
              text-[20px]
              hover:bg-neutral-100
              transition
            "
          >
            Back
          </button>

          {/* Publish */}
          <button
            type="button"
            disabled={!agreed || isPublishing}
            onClick={publishListing}
            className={`
              w-full sm:w-[142px]
              h-[50px]
              rounded-full
              border
              text-[20px]
              transition
              ${
                agreed && !isPublishing
                  ? 'border-neutral-400 bg-neutral-300 text-black hover:bg-neutral-400 cursor-pointer'
                  : 'border-neutral-300 bg-neutral-100 text-neutral-400 cursor-not-allowed'
              }
            `}
          >
            {isPublishing
              ? 'Publishing...'
              : 'Publish'}
          </button>

        </div>

      </main>
    </div>
  );
}