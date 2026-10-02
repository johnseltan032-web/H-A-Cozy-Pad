import { useEffect, useState } from 'react';

export default function SearchSection({ onSearch }) {
  const today = new Date().toISOString().split('T')[0];
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [numOfGuests, setNumOfGuests] = useState(1);

  useEffect(() => {
    if (checkInDate < today || (checkInDate && checkOutDate && checkOutDate <= checkInDate)) {
      return;
    }

    const applyFilters = async () => {
      await Promise.resolve();
      onSearch?.({
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        num_of_guests: numOfGuests,
      });
    };

    void applyFilters();
  }, [checkInDate, checkOutDate, numOfGuests, onSearch, today]);

  return (
    <section className="flex justify-center px-4 md:px-10 lg:px-[52px] pt-4 pb-7 md:pt-6 md:pb-12 bg-[#fdfdfd]">
      <div
        className="w-full max-w-[971px] flex flex-col items-center gap-3 md:gap-5 bg-[#efefef] rounded-[20px] md:rounded-[25px] px-4 py-4 md:px-10 md:py-10 lg:px-[60px]"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 w-full">
          {/* Check-In Date */}
          <div className="flex items-center gap-2 md:gap-3 bg-white border border-neutral-300 rounded-[10px] px-3 md:px-5 py-3.5">
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
                className="min-w-0 text-xs md:text-sm font-medium text-neutral-700 bg-transparent outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Check-Out Date */}
          <div className="flex items-center gap-2 md:gap-3 bg-white border border-neutral-300 rounded-[10px] px-3 md:px-5 py-3.5">
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
                className="min-w-0 text-xs md:text-sm font-medium text-neutral-700 bg-transparent outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Number of Guests */}
          <div className="flex min-w-0 items-center gap-2 md:gap-3 bg-white border border-neutral-300 rounded-[10px] px-3 md:px-5 py-3.5">
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
                className="min-w-0 text-xs md:text-sm font-medium text-neutral-700 bg-transparent outline-none cursor-pointer w-full"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Guest' : 'Guests'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}