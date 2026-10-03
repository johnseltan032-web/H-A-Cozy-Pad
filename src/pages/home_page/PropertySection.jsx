import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../lib/api';

export default function PropertySection({ title, properties = [], searchParams = {} }) {
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;

    const normalizedPath = String(imagePath)
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/^api\//i, '');

    return `${API_BASE_URL.replace(/\/$/, '')}/${normalizedPath}`;
  };

  const getMapUrl = (property) => {
    return property.google_maps_url || '#';
  };

  return (
    <section className="w-full px-4 py-5 sm:px-6 md:px-8 md:py-6 lg:px-10">
      {title && (
        <div className="flex items-center gap-3 mb-7">
          <h2 className="text-xl lg:text-2xl font-medium">
            {title}
          </h2>

          <span className="text-xl text-neutral-400 cursor-pointer">
            ›
          </span>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="min-h-60 flex flex-col items-center justify-center text-center text-neutral-500">
          <svg
            aria-hidden="true"
            className="w-12 h-12 mb-4 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path d="m3 10 9-7 9 7" />
            <path d="M5 9v11h14V9" />
            <path d="M9 20v-6h6v6" />
          </svg>

          <p className="text-2xl lg:text-3xl font-medium">
            No available housing
          </p>

          <p className="text-base text-neutral-400 mt-2">
            Try adjusting your search criteria or dates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 lg:gap-7">
          {properties.map((property) => {
            // First uploaded image = homepage thumbnail
            const thumbnail =
              Array.isArray(property.images) && property.images.length > 0
                ? getImageUrl(property.images[0])
                : null;
            const guestAmenities = (Array.isArray(property.amenities)
              ? property.amenities
              : String(property.amenities || '')
                .split(',')
                .map((amenity) => amenity.trim())
                .filter(Boolean)
            ).slice(0, 3);

            return (
              <div
                key={property.unit_id}
                className="min-w-0"
              >
                <Link
                  to={`/property/${property.unit_id}`}
                  state={{
                    checkIn: searchParams.check_in_date,
                    checkOut: searchParams.check_out_date,
                    guests: searchParams.num_of_guests,
                  }}
                  className="block no-underline text-black hover:text-black group"
                >
                  {/* Property Image */}
                  <div className="w-full aspect-[4/3] sm:aspect-square bg-neutral-300 rounded-xl sm:rounded-2xl overflow-hidden group-hover:opacity-95 transition-opacity">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={property.property_name || property.building_name || 'Property'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500 font-light text-sm">
                        No Image Available
                      </div>
                    )}
                  </div>

                  {/* Property Details */}
                  <div className="mt-2 sm:mt-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="min-w-0 break-words [overflow-wrap:anywhere] text-sm sm:text-base lg:text-lg font-normal leading-tight">
                        {property.property_name || property.building_name}
                      </h3>

                    </div>

                    {guestAmenities.length > 0 && (
                      <p className="min-w-0 break-words [overflow-wrap:anywhere] text-xs text-neutral-500 mt-1 line-clamp-1">
                        {guestAmenities.join(' · ')}
                      </p>
                    )}

                    <p className="text-sm sm:text-base lg:text-lg font-light mt-1">
                      ₱{' '}
                      {Number(property.rate_per_night).toLocaleString(
                        'en-PH',
                        {
                          minimumFractionDigits: 2,
                        }
                      )}{' '}
                      <span className="text-xs sm:text-sm text-neutral-500 font-normal">
                        / night
                      </span>
                    </p>

                    <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                      {property.available_from && property.available_until
                        ? `Available ${property.available_from} to ${property.available_until}`
                        : 'Availability available on request'}
                    </p>
                  </div>
                </Link>

                <div className="mt-2 flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <a
                    href={getMapUrl(property)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View ${property.property_name || property.building_name || 'property'} on Google Maps`}
                    className="ml-auto inline-flex items-center gap-1.5 font-medium text-neutral-700 underline underline-offset-2 hover:text-black"
                  >
                    <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#4285f4] text-[11px] font-bold text-white">G</span>
                    Google Maps
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
