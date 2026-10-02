import { useEffect, useRef, useState } from 'react';
import logo from '../../images/logo.png';

const nearbyDestinations = [
  'MOA',
  'PICC',
  'World Trade Center',
  'NAIA',
  'Ayala Malls Manila Bay',
  'Okada',
  'City of Dreams',
  'Star City',
  'Ocean Park',
  'Other',
];

export default function SearchSection({ onSearch }) {
  const today = new Date().toISOString().split('T')[0];
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [numOfGuests, setNumOfGuests] = useState(1);
  const [isNearbyOpen, setIsNearbyOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('');
  const nearbyRef = useRef(null);

  useEffect(() => {
    if (!isNearbyOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!nearbyRef.current?.contains(event.target)) {
        setIsNearbyOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsNearbyOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNearbyOpen]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    if (checkInDate < today || (checkInDate && checkOutDate && checkOutDate <= checkInDate)) {
      return;
    }

    const guestCount = Number(numOfGuests);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 12) {
      return;
    }

    onSearch?.({
      query: selectedDestination === 'Other' ? '' : selectedDestination,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      num_of_guests: selectedDestination === 'Other' ? null : guestCount,
    });
  };

  return (
    <section className="flex justify-center px-4 md:px-10 lg:px-[52px] pt-4 pb-7 md:pt-6 md:pb-12 bg-[#fdfdfd]">
      <form
        onSubmit={handleSearchSubmit}
        className="w-full max-w-[971px] flex flex-col items-center gap-3 md:gap-5 bg-[#efefef] rounded-[20px] md:rounded-[25px] px-4 py-4 md:px-10 md:py-10 lg:px-[60px]"
      >
        <div ref={nearbyRef} className="relative self-center">
          <button
            type="button"
            aria-label={selectedDestination ? `Selected location: ${selectedDestination}` : 'Choose a nearby destination'}
            aria-expanded={isNearbyOpen}
            aria-controls="nearby-destinations"
            onClick={() => setIsNearbyOpen((open) => !open)}
            className="flex min-h-11 items-center rounded-md bg-transparent px-1 hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
          >
            <img src={logo} alt="H&A Cozy Pad" className="h-12 w-auto" />
          </button>

          {isNearbyOpen && (
            <div
              id="nearby-destinations"
              role="dialog"
              aria-label="Nearby destinations"
              className="absolute left-1/2 top-full z-50 mt-2 w-[min(320px,calc(100vw-3rem))] -translate-x-1/2 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-neutral-900">Nearby Destinations</h2>
                <button
                  type="button"
                  aria-label="Close nearby destinations"
                  onClick={() => setIsNearbyOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-xl leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  &times;
                </button>
              </div>
              <ul className="grid grid-cols-1 gap-y-1 text-sm text-neutral-700 sm:grid-cols-2">
                {nearbyDestinations.map((destination) => (
                  <li key={destination}>
                    <button
                      type="button"
                      aria-pressed={selectedDestination === destination}
                      onClick={() => {
                        setSelectedDestination(destination);
                        setIsNearbyOpen(false);
                        onSearch?.({
                          query: destination === 'Other' ? '' : destination,
                          check_in_date: checkInDate,
                          check_out_date: checkOutDate,
                          num_of_guests: destination === 'Other' ? null : numOfGuests,
                        });
                      }}
                      className="w-full rounded-md px-2 py-1.5 text-left hover:bg-neutral-100 aria-pressed:bg-pink-50 aria-pressed:font-semibold"
                    >
                      <span aria-hidden="true" className="mr-2 text-pink-600">•</span>
                      {destination}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 w-full">
          {/* Check-In Date */}
          <div className="flex items-center gap-2 md:gap-3 bg-white border border-neutral-300 focus-within:border-transparent rounded-[10px] px-3 md:px-5 py-3.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div className="flex flex-col w-full">
              <label htmlFor="check_in_date" className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Check-in</label>
              <input
                id="check_in_date"
                type="date" 
                value={checkInDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="search-field min-w-0 text-xs md:text-sm font-medium text-neutral-700 bg-transparent outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Check-Out Date */}
          <div className="flex items-center gap-2 md:gap-3 bg-white border border-neutral-300 focus-within:border-transparent rounded-[10px] px-3 md:px-5 py-3.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div className="flex flex-col w-full">
              <label htmlFor="check_out_date" className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Check-out</label>
              <input
                id="check_out_date"
                type="date" 
                value={checkOutDate}
                min={checkInDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="search-field min-w-0 text-xs md:text-sm font-medium text-neutral-700 bg-transparent outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Number of Guests */}
          <div className="flex min-w-0 items-center gap-2 md:gap-3 bg-white border border-neutral-300 focus-within:border-transparent rounded-[10px] px-3 md:px-5 py-3.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <div className="flex flex-col w-full">
              <label htmlFor="num_of_guests" className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Guests</label>
              <select
                id="num_of_guests"
                value={numOfGuests} 
                onChange={(e) => setNumOfGuests(Number(e.target.value))}
                className="search-field min-w-0 text-xs md:text-sm font-medium text-neutral-700 bg-transparent outline-none cursor-pointer w-full"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <option key={num} value={num}>
                    {num} pax
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="mt-1 rounded-full border border-[#ca635a] bg-[#df766c] px-12 py-3 text-base font-semibold text-white hover:bg-[#bd584f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bd584f]"
        >
          SEARCH
        </button>
      </form>
    </section>
  );
}