import React, { useEffect, useState } from 'react';
import ListingHeader from '../../components/ListingHeader';
import { useNavigate } from 'react-router-dom';
import { getListingDraft, updateListingDraft } from '../../lib/listingDraft';

export default function PricesDiscounts() {
  const navigate = useNavigate();
  const draft = getListingDraft();

  const [basePrice, setBasePrice] = useState(draft.basePrice || '');

  const [discounts, setDiscounts] = useState(draft.discounts || [
    {
      id: 'newListing1',
      percent: '20%',
      title: 'New Listing Promotion',
      description: 'Offer 20% off your first 3 books',
      checked: false,
    },
    {
      id: 'newListing2',
      percent: '20%',
      title: 'New Listing Promotion',
      description: 'Offer 20% off your first 3 books',
      checked: false,
    },
  ]);

  useEffect(() => {
    updateListingDraft({ basePrice, discounts });
  }, [basePrice, discounts]);

  const toggleDiscount = (id) => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, checked: !d.checked } : d))
    );
  };

  const updateDiscount = (id, field, value) => {
    setDiscounts((prev) =>
      prev.map((discount) =>
        discount.id === id ? { ...discount, [field]: value } : discount
      )
    );
  };

  const addDiscount = () => {
    setDiscounts((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        percent: '10%',
        title: 'Custom offer',
        description: '',
        checked: true,
      },
    ]);
  };

  const removeDiscount = (id) => {
    setDiscounts((prev) => prev.filter((discount) => discount.id !== id));
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

        <div className="w-full max-w-[560px] mx-auto pt-10 md:pt-11 px-6">

          {/* Heading */}
          <h1 className="text-center text-[23px] md:text-[24px] font-semibold leading-tight mb-8">
            Prices &amp; Discounts
          </h1>

          {/* Base Price */}
          <p className="text-[15px] font-medium mb-2">Base Price</p>
          <div className="relative mb-6">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] text-neutral-500 pointer-events-none">
              PHP
            </span>
            <input
              type="number"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0"
              className="w-full h-[50px] border border-black rounded-[19px] pl-16 pr-5 text-[15px] placeholder:text-neutral-400 focus:outline-none focus:bg-neutral-50"
            />
          </div>

          {/* View similar listing */}
          <div className="flex justify-center mb-8">
            <button
              type="button"
              onClick={() => console.log('View Similar Listing')}
              className="h-[42px] px-6 rounded-full border border-black bg-white text-[14px] font-medium hover:bg-neutral-100 transition"
            >
              View Similar Listing
            </button>
          </div>

          {/* Add Discounts */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold">Add Discounts</h2>
            <button
              type="button"
              onClick={addDiscount}
              className="text-sm font-medium underline"
            >
              Add custom discount
            </button>
          </div>

          <div className="space-y-4 mb-8">
            {discounts.map((discount) => (
              <div
                key={discount.id}
                className={`w-full border border-black rounded-[19px] px-5 py-4 transition ${discount.checked ? 'bg-neutral-50' : 'bg-white'}`}
              >
                <div className="grid gap-3 sm:grid-cols-[90px_1fr_auto]">
                  <input
                    value={discount.percent || ''}
                    onChange={(event) => updateDiscount(discount.id, 'percent', event.target.value)}
                    placeholder="10%"
                    className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-black"
                  />
                  <input
                    value={discount.title || ''}
                    onChange={(event) => updateDiscount(discount.id, 'title', event.target.value)}
                    placeholder="Offer title"
                    className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => removeDiscount(discount.id)}
                    className="text-xs text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={discount.description || ''}
                  onChange={(event) => updateDiscount(discount.id, 'description', event.target.value)}
                  placeholder="Offer description"
                  className="mt-3 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-black"
                />
                <label className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={Boolean(discount.checked)}
                    onChange={() => toggleDiscount(discount.id)}
                  />
                  Show this offer to guests
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="mt-auto grid grid-cols-2 gap-3 px-4 pb-6 pt-8 sm:flex sm:items-center sm:justify-between sm:px-10">

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