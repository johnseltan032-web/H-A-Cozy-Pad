import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ListingHeader from '../../components/ListingHeader';
import { getListingDraft, updateListingDraft } from '../../lib/listingDraft';

const BUILDING_OPTIONS = Array.from({ length: 10 }, (_, index) => `Shore ${index + 1}`);

export default function UnitSelection() {
  const navigate = useNavigate();
  const draft = getListingDraft();
  const [building, setBuilding] = useState(draft.building || 'Shore 1');
  const [tower, setTower] = useState(draft.tower || '');
  const [unitNumber, setUnitNumber] = useState(draft.unitNumber || '');
  const [maxGuests, setMaxGuests] = useState(draft.maxGuests || 4);

  const saveAndExit = () => {
    updateListingDraft({
      building,
      tower: tower.trim(),
      unitNumber: unitNumber.trim(),
      maxGuests: Number(maxGuests),
      unitSelection: [{ building, tower: tower.trim(), unitNumber: unitNumber.trim(), maxGuests: Number(maxGuests) }],
      unitCount: 1,
    });
    navigate('/host/listings');
  };

  const handleContinue = () => {
    if (!building || !tower.trim() || !unitNumber.trim()) {
      return;
    }

    updateListingDraft({
      building,
      tower: tower.trim(),
      unitNumber: unitNumber.trim(),
      maxGuests: Number(maxGuests),
      unitSelection: [{ building, tower: tower.trim(), unitNumber: unitNumber.trim(), maxGuests: Number(maxGuests) }],
      unitCount: 1,
    });

    navigate('/host/listing/PlaceOffer');
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <ListingHeader
        onOpenQuestions={() => console.log('Questions')}
        onSaveAndExit={saveAndExit}
      />

      <main className="flex-1 flex flex-col">
        <div className="w-full max-w-[560px] mx-auto pt-10 md:pt-11 px-6">
          <h1 className="text-center text-[23px] md:text-[24px] font-semibold leading-tight mb-8">
            Unit details
          </h1>

          <div className="space-y-5">
            <label className="block text-[15px] font-medium">
              Building
              <select
                value={building}
                onChange={(event) => setBuilding(event.target.value)}
                className="mt-2 h-[52px] w-full rounded-full border border-black bg-white px-4 text-[15px] outline-none focus:bg-neutral-50"
              >
                {BUILDING_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[15px] font-medium">
              Tower
              <input
                type="text"
                value={tower}
                onChange={(event) => setTower(event.target.value)}
                placeholder="Tower code or name"
                className="mt-2 h-[52px] w-full rounded-full border border-black bg-white px-4 text-[15px] placeholder:text-neutral-400 outline-none focus:bg-neutral-50"
              />
            </label>

            <label className="block text-[15px] font-medium">
              Unit number
              <input
                type="text"
                value={unitNumber}
                onChange={(event) => setUnitNumber(event.target.value)}
                placeholder="Unit number"
                className="mt-2 h-[52px] w-full rounded-full border border-black bg-white px-4 text-[15px] placeholder:text-neutral-400 outline-none focus:bg-neutral-50"
              />
            </label>

            <label className="block text-[15px] font-medium">
              Max guests
              <select
                value={maxGuests}
                onChange={(event) => setMaxGuests(Number(event.target.value))}
                className="mt-2 h-[52px] w-full rounded-full border border-black bg-white px-4 text-[15px] outline-none focus:bg-neutral-50"
              >
                {[1, 2, 3, 4].map((option) => (
                  <option key={option} value={option}>
                    {option} guest{option > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="listing-step-actions mt-auto grid grid-cols-2 gap-3 px-4 pb-6 pt-8 sm:flex sm:items-center sm:justify-between sm:px-10">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-[142px] h-[50px] rounded-full border border-black bg-white text-[20px] hover:bg-neutral-100 transition"
          >
            Exit
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!building || !tower.trim() || !unitNumber.trim()}
            className={`w-full sm:w-[142px] h-[50px] rounded-full border border-black text-[20px] transition ${
              building && tower.trim() && unitNumber.trim()
                ? 'bg-black text-white hover:bg-neutral-800 cursor-pointer'
                : 'bg-neutral-200 text-black cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}
