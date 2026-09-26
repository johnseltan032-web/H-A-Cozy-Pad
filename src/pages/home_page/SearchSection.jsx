import React, { useState } from 'react';

export default function SearchSection({ onSearch }) {
  const [query, setQuery] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [numOfGuests, setNumOfGuests] = useState(1);

  const handleSearch = (e) => {
    if (e) e.preventDefault();

    const today = new Date().toISOString().split('T')[0];
    if (checkInDate && checkInDate < today) {
      alert('Check-in date cannot be in the past.');
      return;
    }

    // Constraint validation: check_out_date must be > check_in_date
    if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
      alert('Check-out date must be after the check-in date.');
      return;
    }

    const searchParams = {
      query: query.trim(),          // Matches building_name, location, or unit_name
      check_in_date: checkInDate,   // Matches bookings.check_in_date
      check_out_date: checkOutDate, // Matches bookings.check_out_date
      num_of_guests: numOfGuests,   // Matches bookings.num_of_guests & units.max_guests
    };

    if (onSearch) {
      onSearch(searchParams);
    } else {
      console.log('Database Query Parameters:', searchParams);
    }
  };

  return (
    <section className="flex justify-center px-5 md:px-10 lg:px-[52px] pt-6 pb-12 bg-[#fdfdfd]">
      <form 
        onSubmit={handleSearch}
        className="w-full max-w-[971px] flex flex-col items-center gap-5 bg-[#efefef] rounded-[25px] px-5 md:px-10 lg:px-[60px] py-10"
      >
        {/* Search Input: Buildings & Units */}
        <div className="flex items-center gap-4 w-full bg-white border border-neutral-300 rounded-[10px] px-6 py-[18px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-[26px] h-[26px] shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search destination, building, or unit..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-lg lg:text-xl font-light text-neutral-800 placeholder-neutral-400"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {/* Check-In Date */}
          <div className="flex items-center gap-3 bg-white border border-neutral-300 rounded-[10px] px-5 py-3.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                className="text-sm font-medium text-neutral-700 bg-transparent outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Check-Out Date */}
          <div className="flex items-center gap-3 bg-white border border-neutral-300 rounded-[10px] px-5 py-3.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                className="text-sm font-medium text-neutral-700 bg-transparent outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Number of Guests */}
          <div className="flex items-center gap-3 bg-white border border-neutral-300 rounded-[10px] px-5 py-3.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                className="text-sm font-medium text-neutral-700 bg-transparent outline-none cursor-pointer w-full"
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

        {/* Submit Button */}
        <button 
          type="submit"
          className="mt-2 px-16 py-3 text-2xl lg:text-3xl font-bold text-white bg-neutral-600 border border-neutral-700 rounded-full hover:bg-neutral-700 active:bg-neutral-800 transition-colors cursor-pointer"
        >
          SEARCH
        </button>
      </form>
    </section>
  );
}