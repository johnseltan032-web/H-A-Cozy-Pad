import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../lib/api';

export default function PropertySection({ title, properties = [] }) {
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;

    const normalizedPath = String(imagePath)
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/^api\//i, '');

    return `${API_BASE_URL.replace(/\/$/, '')}/${normalizedPath}`;
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

            return (
              <Link
                key={property.unit_id}
                to={`/property/${property.unit_id}`}
                className="block no-underline text-black hover:text-black group"
              >
                <div className="min-w-0">
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

                      {property.max_guests && (
                        <span className="hidden sm:inline text-xs bg-neutral-200 text-neutral-700 px-2 py-1 rounded-full whitespace-nowrap">
                          Up to {property.max_guests} guests
                        </span>
                      )}
                    </div>

                    <p className="min-w-0 break-words [overflow-wrap:anywhere] text-xs sm:text-sm text-neutral-500 mt-1 line-clamp-1">
                      {property.building_name} · {property.location}
                    </p>

                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="min-w-0">
                        <span className="block text-neutral-400">Unit number</span>
                        <span className="block break-words [overflow-wrap:anywhere] text-neutral-600">
                          {property.unit_number || '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-neutral-400">Tower</span>
                        <span className="block break-words [overflow-wrap:anywhere] text-neutral-600">
                          {property.tower || '—'}
                        </span>
                      </div>
                    </div>

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
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
