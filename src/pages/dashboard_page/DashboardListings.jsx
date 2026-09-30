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

const shoreBuildings = Array.from({ length: 10 }, (_, index) => `Shore ${index + 1}`);

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
  const [toastMessage, setToastMessage] = useState('');
  const [editForm, setEditForm] = useState({
    buildingName: '',
    propertyName: '',
    tower: '',
    unitNumber: '',
    location: '',
    description: '',
    bathrooms: 0,
    bedroomDetails: [],
    maxGuests: '',
    ratePerNight: '',
    availableFrom: '',
    availableUntil: '',
    amenities: [],
  });
  const [editImages, setEditImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [removeImageIds, setRemoveImageIds] = useState([]);

  const loadListings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/available_listings.php`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Unable to load listings (${response.status})`);
      }

      if (!Array.isArray(data)) {
        throw new Error(data.error || 'Unable to load listings');
      }

      setListings(data);
      setError('');
      return data;
    } catch (loadError) {
      console.error('Error fetching listings:', loadError);
      setError(loadError.message);
      throw loadError;
    } finally {
      setLoading(false);
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

      await loadListings();
      setSelectedBuildingId(null);
      setSelectedListing(null);
      setIsDeleteConfirmOpen(false);
      setToastMessage('Listing deleted successfully');
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    loadListings().catch(() => undefined);
  }, []);

  const handleAddListing = () => {
    // Remove the previous listing's selections
    // so the new listing starts completely fresh.
    clearListingDraft();

    setSelectedBuildingId(null);

    navigate('/host/listing/UnitSelection');
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
        propertyName: data.property_name || data.building_name || '',
        tower: data.tower || '',
        unitNumber: data.unit_number || '',
        location: data.location || '',
        description: data.description || '',
        bathrooms: data.bathrooms || 0,
        bedroomDetails: data.bedroom_details || [],
        maxGuests: data.max_guests || '',
        ratePerNight: data.rate_per_night || '',
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

    const normalizedPath = String(imagePath)
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/^api\//i, '');

    return `${API_BASE_URL.replace(/\/$/, '')}/${normalizedPath}`;
  };

  const openListingDetails = (listing) => {
    setSelectedListing(listing);
    setSelectedBuildingId(listing.building_id);
  };

  const openDeleteConfirm = (listing) => {
    setSelectedListing(listing);
    setSelectedBuildingId(listing.building_id);
    setIsDeleteConfirmOpen(true);
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
        } else if (field === 'bedroomDetails') {
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

      await loadListings();
      setSelectedListing((currentListing) =>
        currentListing && currentListing.building_id === selectedBuildingId
          ? {
              ...currentListing,
              building_name: editForm.buildingName,
              property_name: editForm.propertyName,
              tower: editForm.tower,
              unit_number: editForm.unitNumber,
              location: editForm.location,
              max_guests: editForm.maxGuests,
              rate_per_night: editForm.ratePerNight,
              available_from: editForm.availableFrom,
              available_until: editForm.availableUntil,
            }
          : currentListing
      );
      setToastMessage('Listing edited successfully');
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
        {toastMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {toastMessage}
          </div>
        )}

        <div className="relative mb-5 sm:mb-10">
          <h1 className="text-xl font-bold sm:text-2xl md:text-4xl">
            Your Listing
          </h1>

          <button
            type="button"
            onClick={() => navigate('/host/overview')}
            className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 sm:px-5 sm:text-base"
          >
            <span aria-hidden="true">←</span>
            Back to overview
          </button>
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
          <div className="space-y-3">
            {listings.map((listing) => {
              const imagePath = Array.isArray(listing.images) ? listing.images[0] : null;
              const imageUrl = getListingImageUrl(imagePath);

              return (
                <div
                  key={listing.unit_id}
                  className="flex items-center gap-5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
                >
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-base font-semibold text-neutral-900">
                      {listing.property_name || listing.building_name || listing.unit_name}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openListingDetails(listing)}
                    className="shrink-0 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
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
        <div className="fixed inset-0 z-[3200] flex items-end justify-center bg-black/40 sm:items-center sm:px-5 sm:py-8" onClick={() => setSelectedListing(null)}>
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
                    {selectedListing.property_name || selectedListing.building_name || selectedListing.unit_name}
                  </h2>
                </div>
                <button type="button" onClick={() => setSelectedListing(null)} aria-label="Close property details" className="text-2xl leading-none text-neutral-500">&times;</button>
              </div>

              {Array.isArray(selectedListing.images) && selectedListing.images[0] && (
                <img src={getListingImageUrl(selectedListing.images[0])} alt="" className="mb-5 aspect-video w-full rounded-xl object-cover" />
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div><dt className="text-neutral-500">Property name</dt><dd className="mt-1 font-medium">{selectedListing.property_name || 'Not specified'}</dd></div>
                <div><dt className="text-neutral-500">Building</dt><dd className="mt-1 font-medium">{selectedListing.building_name || 'Not specified'}</dd></div>
                <div><dt className="text-neutral-500">Tower</dt><dd className="mt-1 font-medium">{selectedListing.tower || 'Not specified'}</dd></div>
                <div><dt className="text-neutral-500">Unit number</dt><dd className="mt-1 font-medium">{selectedListing.unit_number || 'Not specified'}</dd></div>
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
        <div className="fixed inset-0 z-[3300] flex items-center justify-center bg-black/45 px-4" onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl sm:p-6" onClick={(event) => event.stopPropagation()}>
            <h2 id="confirm-delete-title" className="text-lg font-semibold">Delete this listing?</h2>
            <p className="mt-2 text-sm leading-5 text-neutral-600">This will permanently remove {selectedListing?.property_name || selectedListing?.building_name || selectedListing?.unit_name || 'this property'} and its listing details.</p>
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
                  Property name
                  <input
                    name="propertyName"
                    value={editForm.propertyName}
                    onChange={handleEditChange}
                    required
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Building
                  <select
                    name="buildingName"
                    value={editForm.buildingName}
                    onChange={handleEditChange}
                    required
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  >
                    {editForm.buildingName && !shoreBuildings.includes(editForm.buildingName) && (
                      <option value={editForm.buildingName}>{editForm.buildingName}</option>
                    )}
                    {shoreBuildings.map((building) => (
                      <option key={building} value={building}>{building}</option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Tower
                    <input
                      name="tower"
                      value={editForm.tower}
                      onChange={handleEditChange}
                      placeholder="Tower code or name"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Unit number
                    <input
                      name="unitNumber"
                      value={editForm.unitNumber}
                      onChange={handleEditChange}
                      placeholder="Unit number"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                    />
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

                <label className="block text-sm font-medium">
                  Bathrooms / toilets
                  <input
                    name="bathrooms"
                    type="number"
                    min="0"
                    value={editForm.bathrooms}
                    onChange={handleEditChange}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

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