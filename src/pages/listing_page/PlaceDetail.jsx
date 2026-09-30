import { useState } from 'react';
import ListingHeader from '../../components/ListingHeader';
import { useNavigate } from 'react-router-dom';
import { getListingDraft, updateListingDraft } from '../../lib/listingDraft';

export default function PropertyDetails() {
  const navigate = useNavigate();

  const draft = getListingDraft();
  const [propertyName, setPropertyName] = useState(draft.buildingName || '');
  const [propertyDescription, setPropertyDescription] = useState(draft.description || '');

  const updateField = (field, setValue) => (event) => {
    const value = event.target.value;
    setValue(value);
    updateListingDraft({ [field]: value });
  };

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
          <h1 className="text-center text-[23px] md:text-[24px] font-semibold leading-tight mb-8">
            Property Name &amp; Description
          </h1>

          {/* Property Name */}
          <p className="text-[15px] font-medium mb-2">Property Name</p>
          <input
            type="text"
            value={propertyName}
            onChange={updateField('buildingName', setPropertyName)}
            placeholder="Property Name"
            className="w-full h-[52px] border border-black rounded-[19px] px-5 text-[15px] placeholder:text-neutral-500 focus:outline-none focus:bg-neutral-50"
          />

          {/* Divider */}
          <hr className="border-neutral-300 my-7" />

          {/* Property Description */}
          <p className="text-[15px] font-medium mb-2">Property Description</p>
          <textarea
            value={propertyDescription}
            onChange={updateField('description', setPropertyDescription)}
            placeholder="Property Description"
            rows={7}
            className="w-full border border-black rounded-[19px] px-5 py-4 text-[15px] placeholder:text-neutral-500 focus:outline-none focus:bg-neutral-50 resize-none mb-6"
          />

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
            onClick={() => navigate('/host/listing/PlaceImages')}
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