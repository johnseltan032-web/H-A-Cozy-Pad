import { useEffect, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';
import {
  clearListingDraft,
} from '../../lib/listingDraft';
import { useNavigate } from 'react-router-dom';

const amenities = [
  'WiFi',
  'Kitchen',
  'Free parking',
  'Air conditioning',
  'TV',
  'Washer',
  'Pool',
  'Heating',
  'Workspace',
  'Gym',
  'Garage',
  'Pets allowed',
];

export default function DashboardListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    buildingName: '',
    propertyCategory: 'home',
    unitName: 'Entire place',
    location: '',
    description: '',
    propertySize: '',
    bathrooms: 0,
    bedroomDetails: [],
    maxGuests: '',
    ratePerNight: '',
    basePrice: '',
    discounts: [],
    availableFrom: '',
    availableUntil: '',
    amenities: [],
  });
  const [editImages, setEditImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [removeImageIds, setRemoveImageIds] = useState([]);

  const getPropertyCategoryLabel = (propertyCategory) => {
    switch (propertyCategory) {
      case 'home':
        return 'Home-type property';

      case 'hotel':
        return 'Hotel-type property';

      case 'unique':
        return 'Unique-type property';

      default:
        return 'Unknown';
    }
  };

  const deleteListing = async () => {
    if (!selectedBuildingId) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/delete_listing.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId: selectedBuildingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete listing');
      }

      setListings((currentListings) =>
        currentListings.filter(
          (listing) => listing.building_id !== selectedBuildingId
        )
      );

      setSelectedBuildingId(null);
      setSelectedListing(null);
      setIsDeleteConfirmOpen(false);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/available_listings.php`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || `Unable to load listings (${response.status})`
          );
        }

        return data;
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error(data.error || 'Unable to load listings');
        }

        setListings(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching listings:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const handleAddListing = () => {
    // Remove the previous listing's selections
    // so the new listing starts completely fresh.
    clearListingDraft();

    setSelectedBuildingId(null);

    navigate('/host/listing');
  };

  const openEditModal = async () => {
    if (!selectedBuildingId) {
      return;
    }

    setIsEditOpen(true);
    setIsLoadingEdit(true);
    setEditError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/get_listing.php?building_id=${selectedBuildingId}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load listing');
      }

      setEditForm({
        buildingName: data.building_name || '',
        propertyCategory: data.property_category || 'home',
        unitName: data.unit_name || 'Entire place',
        location: data.location || '',
        description: data.description || '',
        propertySize: data.property_size || '',
        bathrooms: data.bathrooms || 0,
        bedroomDetails: data.bedroom_details || [],
        maxGuests: data.max_guests || '',
        ratePerNight: data.rate_per_night || '',
        basePrice: data.base_price || '',
        discounts: data.discounts || [],
        availableFrom: data.available_from || '',
        availableUntil: data.available_until || '',
        amenities: data.amenities || [],
      });
      setEditImages(data.images || []);
      setNewImages([]);
      setRemoveImageIds([]);
    } catch (editLoadError) {
      setEditError(editLoadError.message);
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const getListingImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return `${API_BASE_URL.replace(/\/$/, '')}/${imagePath.replace(/^\/+/, '')}`;
  };

  const openListingDetails = (listing) => {
    setSelectedListing(listing);
    setSelectedBuildingId(listing.building_id);
  };

  const closeEditModal = () => {
    if (isSavingEdit) {
      return;
    }

    setIsEditOpen(false);
    setEditError('');
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const toggleAmenity = (amenity) => {
    setEditForm((currentForm) => ({
      ...currentForm,
      amenities: currentForm.amenities.includes(amenity)
        ? currentForm.amenities.filter((item) => item !== amenity)
        : [...currentForm.amenities, amenity],
    }));
  };

  const updateBedroom = (bedroomIndex, patch) => {
    setEditForm((currentForm) => ({
      ...currentForm,
      bedroomDetails: currentForm.bedroomDetails.map((bedroom, index) =>
        index === bedroomIndex ? { ...bedroom, ...patch } : bedroom
      ),
    }));
  };

  const addBedroom = () => {
    setEditForm((currentForm) => ({
      ...currentForm,
      bedroomDetails: [
        ...currentForm.bedroomDetails,
        { id: `bedroom-${Date.now()}`, beds: [{ bedType: 'Queen Bed', numBeds: 1 }] },
      ],
    }));
  };

  const removeBedroom = (bedroomIndex) => {
    setEditForm((currentForm) => ({
      ...currentForm,
      bedroomDetails: currentForm.bedroomDetails.filter((_, index) => index !== bedroomIndex),
    }));
  };

  const updateDiscount = (discountIndex, field, value) => {
    setEditForm((currentForm) => ({
      ...currentForm,
      discounts: currentForm.discounts.map((discount, index) =>
        index === discountIndex ? { ...discount, [field]: value } : discount
      ),
    }));
  };

  const addDiscount = () => {
    setEditForm((currentForm) => ({
      ...currentForm,
      discounts: [
        ...currentForm.discounts,
        {
          id: `discount-${Date.now()}`,
          percent: '10%',
          title: 'Custom offer',
          description: '',
          checked: true,
        },
      ],
    }));
  };

  const removeDiscount = (discountIndex) => {
    setEditForm((currentForm) => ({
      ...currentForm,
      discounts: currentForm.discounts.filter((_, index) => index !== discountIndex),
    }));
  };

  const handleNewImages = (event) => {
    const selectedImages = Array.from(event.target.files || []);
    setNewImages((currentImages) => [...currentImages, ...selectedImages]);
    event.target.value = '';
  };

  const removeExistingImage = (imageId) => {
    setEditImages((currentImages) =>
      currentImages.filter((image) => image.image_id !== imageId)
    );
    setRemoveImageIds((currentIds) => [...currentIds, imageId]);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setIsSavingEdit(true);
    setEditError('');

    try {
      const body = new FormData();
      body.append('buildingId', selectedBuildingId);

      Object.entries(editForm).forEach(([field, value]) => {
        if (field === 'amenities') {
          value.forEach((amenity) => body.append('amenities[]', amenity));
        } else if (field === 'bedroomDetails' || field === 'discounts') {
          body.append(field, JSON.stringify(value));
        } else {
          body.append(field, value);
        }
      });

      removeImageIds.forEach((imageId) => body.append('removeImageIds[]', imageId));
      newImages.forEach((image) => body.append('images[]', image));

      const response = await fetch(`${API_BASE_URL}/edit_listing.php`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update listing');
      }

      setListings((currentListings) =>
        currentListings.map((listing) =>
          listing.building_id === selectedBuildingId
            ? {
                ...listing,
                building_name: editForm.buildingName,
                property_category: editForm.propertyCategory,
                unit_name: editForm.unitName,
                location: editForm.location,
                available_from: editForm.availableFrom,
                available_until: editForm.availableUntil,
              }
            : listing
        )
      );
      setIsEditOpen(false);
    } catch (editSaveError) {
      setEditError(editSaveError.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="bg-white text-black font-sans min-h-screen">
      <HostHeader activeNav="Listing" />

      <main className="px-5 md:px-10 lg:px-13 py-10">
        <div className="mb-5 flex items-center justify-between gap-2 sm:mb-10 md:gap-4">
          <h1 className="text-xl font-bold sm:text-2xl md:text-4xl">
            Your Listing
          </h1>

          <div className="flex w-auto shrink-0 flex-wrap justify-end gap-1.5 sm:gap-2 md:gap-3">
            <button
              type="button"
              disabled={!selectedBuildingId || isDeleting}
              onClick={() => {
                if (selectedBuildingId && window.confirm('Delete this listing?')) {
                  deleteListing();
                }
              }}
              title="Delete listing"
              aria-label="Delete listing"
              className="hidden h-10 w-10 items-center justify-center gap-2 border border-neutral-300 rounded-md hover:bg-neutral-100 bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed md:flex md:h-auto md:w-auto md:px-4 md:py-2.5"
            >
              {isDeleting ? <span className="sr-only">Deleting...</span> : null}
              <svg aria-hidden="true" className="h-5 w-5 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></svg>
              <span className="hidden md:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>

            <button
              type="button"
              disabled={!selectedBuildingId}
              onClick={openEditModal}
              title="Edit listing"
              aria-label="Edit listing"
              className="hidden h-10 w-10 items-center justify-center gap-2 border border-neutral-300 rounded-md hover:bg-neutral-100 bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed md:flex md:h-auto md:w-auto md:px-4 md:py-2.5"
            >
              <svg aria-hidden="true" className="h-5 w-5 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 5 5 5M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></svg>
              <span className="hidden md:inline">Edit</span>
            </button>

            <button
              type="button"
              onClick={handleAddListing}
              title="Add listing"
              aria-label="Add listing"
              className="flex h-10 w-10 items-center justify-center gap-2 border border-neutral-300 rounded-md hover:bg-neutral-100 bg-transparent cursor-pointer md:h-auto md:w-auto md:px-4 md:py-2.5"
            >
              <svg aria-hidden="true" className="h-5 w-5 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span className="hidden md:inline">Add</span>
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading listings...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : listings.length === 0 ? (
          <div className="py-20 text-center text-neutral-500">
            <p className="text-2xl font-medium">
              No listings yet
            </p>

            <p className="mt-2">
              Add your first housing listing to see it here.
            </p>
          </div>
        ) : (
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="text-left border-b border-neutral-200">
                <th className="pb-3 font-semibold text-base w-2/5">
                  Listing
                </th>

                <th className="pb-3 font-semibold text-base">
                  Type
                </th>

                <th className="pb-3 font-semibold text-base">
                  Location
                </th>

                <th className="pb-3 font-semibold text-base">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {listings.map((listing) => (
                <tr
                  key={listing.unit_id}
                  onClick={() => setSelectedBuildingId(listing.building_id)}
                  className={`border-b border-neutral-100 cursor-pointer transition-colors ${
                    selectedBuildingId === listing.building_id
                      ? 'bg-neutral-100'
                      : ''
                  }`}
                >
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 shrink-0 rounded-lg bg-neutral-300 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-6 h-6 text-neutral-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                          />

                          <circle
                            cx="9"
                            cy="9"
                            r="2"
                          />

                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>

                      <span className="text-base">
                        {listing.building_name} - {listing.unit_name}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 text-base align-middle">
                    {getPropertyCategoryLabel(
                      listing.property_category
                    )}
                  </td>

                  <td className="py-4 text-base align-middle">
                    {listing.location}
                  </td>

                  <td className="py-4 text-base align-middle">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>

                      {listing.status
                        ? listing.status.charAt(0).toUpperCase() +
                          listing.status.slice(1)
                        : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {!loading && !error && listings.length > 0 && (
          <div className="space-y-3 md:hidden">
            {listings.map((listing) => {
              const imagePath = Array.isArray(listing.images) ? listing.images[0] : null;
              const imageUrl = getListingImageUrl(imagePath);

              return (
                <div key={listing.unit_id} className="flex items-center gap-3 border-b border-neutral-200 pb-3">
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-neutral-500">No photo</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-sm font-medium text-neutral-900">
                      {listing.building_name || listing.unit_name}
                    </p>
                    {listing.unit_name && listing.building_name && (
                      <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{listing.unit_name}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openListingDetails(listing)}
                    className="shrink-0 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900"
                  >
                    Detail
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedListing && !isEditOpen && (
        <div className="fixed inset-0 z-[3200] flex items-end justify-center bg-black/40 sm:items-center sm:px-5 sm:py-8 md:hidden" onClick={() => setSelectedListing(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-summary-title"
            className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overflow-y-auto p-5 sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Property summary</p>
                  <h2 id="listing-summary-title" className="mt-1 text-xl font-semibold">
                    {selectedListing.building_name || selectedListing.unit_name}
                  </h2>
                </div>
                <button type="button" onClick={() => setSelectedListing(null)} aria-label="Close property details" className="text-2xl leading-none text-neutral-500">&times;</button>
              </div>

              {Array.isArray(selectedListing.images) && selectedListing.images[0] && (
                <img src={getListingImageUrl(selectedListing.images[0])} alt="" className="mb-5 aspect-video w-full rounded-xl object-cover" />
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div><dt className="text-neutral-500">Unit</dt><dd className="mt-1 font-medium">{selectedListing.unit_name || 'Not specified'}</dd></div>
                <div><dt className="text-neutral-500">Type</dt><dd className="mt-1 font-medium">{getPropertyCategoryLabel(selectedListing.property_category)}</dd></div>
                <div className="col-span-2"><dt className="text-neutral-500">Location</dt><dd className="mt-1 font-medium break-words">{selectedListing.location || 'Not specified'}</dd></div>
                <div><dt className="text-neutral-500">Guests</dt><dd className="mt-1 font-medium">{selectedListing.max_guests || 'Not specified'}</dd></div>
                <div><dt className="text-neutral-500">Rate per night</dt><dd className="mt-1 font-medium">{selectedListing.rate_per_night ? `₱${Number(selectedListing.rate_per_night).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'Not specified'}</dd></div>
                {selectedListing.description && <div className="col-span-2"><dt className="text-neutral-500">Description</dt><dd className="mt-1 whitespace-pre-wrap break-words">{selectedListing.description}</dd></div>}
              </dl>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-7">
              <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isDeleting} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 disabled:opacity-50">Delete</button>
              <button type="button" onClick={() => { setSelectedListing(null); openEditModal(); }} className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white">Edit</button>
            </div>
          </section>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[3300] flex items-center justify-center bg-black/45 px-4 md:hidden" onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl sm:p-6" onClick={(event) => event.stopPropagation()}>
            <h2 id="confirm-delete-title" className="text-lg font-semibold">Delete this listing?</h2>
            <p className="mt-2 text-sm leading-5 text-neutral-600">This will permanently remove {selectedListing?.building_name || selectedListing?.unit_name || 'this property'} and its listing details.</p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeleting} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm disabled:opacity-50">Cancel</button>
              <button type="button" onClick={deleteListing} disabled={isDeleting} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{isDeleting ? 'Deleting...' : 'Delete listing'}</button>
            </div>
          </section>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-[3400] flex items-center justify-center bg-black/40 px-5 py-8">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-500">Listing details</p>
                <h2 className="mt-1 text-2xl font-bold">Edit listing</h2>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingEdit}
                aria-label="Close edit listing"
                className="text-2xl leading-none text-neutral-400 hover:text-black disabled:opacity-40"
              >
                &times;
              </button>
            </div>

            {isLoadingEdit ? (
              <p className="py-12 text-center text-neutral-500">Loading listing...</p>
            ) : (
              <form onSubmit={saveEdit} className="mt-6 space-y-4">
                <label className="block text-sm font-medium">
                  Listing name
                  <input
                    name="buildingName"
                    value={editForm.buildingName}
                    onChange={handleEditChange}
                    required
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Property category
                    <select
                      name="propertyCategory"
                      value={editForm.propertyCategory}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                    >
                      <option value="home">Home-type property</option>
                      <option value="hotel">Hotel-type property</option>
                      <option value="unique">Unique-type property</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium">
                    Property type
                    <select
                      name="unitName"
                      value={editForm.unitName}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                    >
                      <option value="Entire place">Entire place</option>
                      <option value="Room">Room</option>
                      <option value="Hostel shared-room">Hostel shared-room</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Location
                  <input
                    name="location"
                    value={editForm.location}
                    onChange={handleEditChange}
                    required
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Description
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    required
                    rows={4}
                    className="mt-1 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Property size
                    <input
                      name="propertySize"
                      value={editForm.propertySize}
                      onChange={handleEditChange}
                      placeholder="e.g. 45 sqm"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Bathrooms
                    <input
                      name="bathrooms"
                      type="number"
                      min="0"
                      value={editForm.bathrooms}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                    />
                  </label>
                </div>

                <fieldset className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <legend className="text-sm font-medium">Bedrooms and beds</legend>
                    <button type="button" onClick={addBedroom} className="text-sm font-medium underline">Add bedroom</button>
                  </div>
                  {editForm.bedroomDetails.length === 0 ? (
                    <p className="mt-3 text-sm text-neutral-500">No bedrooms recorded.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {editForm.bedroomDetails.map((bedroom, bedroomIndex) => {
                        const bed = bedroom.beds?.[0] || { bedType: 'Queen Bed', numBeds: 1 };
                        return (
                          <div key={bedroom.id || bedroomIndex} className="flex items-end gap-3">
                            <label className="flex-1 text-xs text-neutral-500">
                              Bedroom {bedroomIndex + 1} bed type
                              <select
                                value={bed.bedType}
                                onChange={(event) => updateBedroom(bedroomIndex, { beds: [{ ...bed, bedType: event.target.value }] })}
                                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-black"
                              >
                                <option>Queen Bed</option>
                                <option>King Bed</option>
                                <option>Full Bed</option>
                                <option>Twin Bed</option>
                                <option>Bunk Bed</option>
                                <option>Sofa Bed</option>
                              </select>
                            </label>
                            <label className="w-24 text-xs text-neutral-500">
                              Number
                              <input
                                type="number"
                                min="1"
                                value={bed.numBeds || 1}
                                onChange={(event) => updateBedroom(bedroomIndex, { beds: [{ ...bed, numBeds: Number(event.target.value) || 1 }] })}
                                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black"
                              />
                            </label>
                            <button type="button" onClick={() => removeBedroom(bedroomIndex)} className="pb-2 text-xs text-red-600 underline">Remove</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Maximum guests
                    <input
                      name="maxGuests"
                      type="number"
                      min="1"
                      value={editForm.maxGuests}
                      onChange={handleEditChange}
                      required
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Rate per night
                    <input
                      name="ratePerNight"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editForm.ratePerNight}
                      onChange={handleEditChange}
                      required
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Base price
                  <input
                    name="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.basePrice}
                    onChange={handleEditChange}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <fieldset className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <legend className="text-sm font-medium">Custom discounts</legend>
                    <button type="button" onClick={addDiscount} className="text-sm font-medium underline">Add discount</button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {editForm.discounts.map((discount, discountIndex) => (
                      <div key={discount.id || discountIndex} className="rounded-lg bg-neutral-50 p-3">
                        <div className="grid gap-2 sm:grid-cols-[90px_1fr_auto]">
                          <input
                            value={discount.percent || ''}
                            onChange={(event) => updateDiscount(discountIndex, 'percent', event.target.value)}
                            placeholder="10%"
                            className="rounded border border-neutral-300 px-2 py-2 text-sm"
                          />
                          <input
                            value={discount.title || ''}
                            onChange={(event) => updateDiscount(discountIndex, 'title', event.target.value)}
                            placeholder="Offer title"
                            className="rounded border border-neutral-300 px-2 py-2 text-sm"
                          />
                          <button type="button" onClick={() => removeDiscount(discountIndex)} className="text-xs text-red-600 underline">Remove</button>
                        </div>
                        <input
                          value={discount.description || ''}
                          onChange={(event) => updateDiscount(discountIndex, 'description', event.target.value)}
                          placeholder="Offer description"
                          className="mt-2 w-full rounded border border-neutral-300 px-2 py-2 text-sm"
                        />
                        <label className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
                          <input
                            type="checkbox"
                            checked={Boolean(discount.checked)}
                            onChange={(event) => updateDiscount(discountIndex, 'checked', event.target.checked)}
                          />
                          Show this offer to guests
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Available from
                    <input
                      name="availableFrom"
                      type="date"
                      value={editForm.availableFrom}
                      onChange={handleEditChange}
                      required
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Available until
                    <input
                      name="availableUntil"
                      type="date"
                      min={editForm.availableFrom || undefined}
                      value={editForm.availableUntil}
                      onChange={handleEditChange}
                      required
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                    />
                  </label>
                </div>

                <fieldset>
                  <legend className="text-sm font-medium">What the place has to offer</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {amenities.map((amenity) => (
                      <label key={amenity} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          checked={editForm.amenities.includes(amenity)}
                          onChange={() => toggleAmenity(amenity)}
                          className="h-4 w-4 accent-black"
                        />
                        {amenity}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-medium">Property images</legend>
                  {editImages.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {editImages.map((image) => (
                        <div key={image.image_id} className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                          <img
                            src={`${API_BASE_URL}/${image.image_path}`}
                            alt="Listing"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(image.image_id)}
                            className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {newImages.length > 0 && (
                    <p className="mt-2 text-xs text-neutral-500">{newImages.length} new image(s) selected</p>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    onChange={handleNewImages}
                    className="mt-3 block w-full text-sm"
                  />
                  <p className="mt-1 text-xs text-neutral-500">JPG or PNG, up to 10 MB each.</p>
                </fieldset>

                {editError && <p className="text-sm text-red-600">{editError}</p>}

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={isSavingEdit}
                    className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm hover:bg-neutral-100 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="rounded-lg bg-black px-5 py-2.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-40"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}