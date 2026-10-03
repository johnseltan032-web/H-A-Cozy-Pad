import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import SearchSection from './SearchSection';
import PropertySection from './PropertySection';
import Footer from '../../components/Footer';
import { API_BASE_URL } from '../../lib/api';

export default function HomePage({
  onOpenSignIn,
  onOpenRegister,
  isMenuOpen,
  setIsMenuOpen,
  user,
  onLogout,
}) {
  const [properties, setProperties] = useState([]);
  const [searchParams, setSearchParams] = useState({
    check_in_date: '',
    check_out_date: '',
    num_of_guests: 1,
  });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (searchParams.check_in_date && searchParams.check_out_date) {
      params.set('check_in_date', searchParams.check_in_date);
      params.set('check_out_date', searchParams.check_out_date);
    }
    if (searchParams.num_of_guests != null) {
      params.set('num_of_guests', searchParams.num_of_guests);
    }
    const query = params.toString();

    fetch(`${API_BASE_URL}/available_listings.php${query ? `?${query}` : ''}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        const text = await response.text();

        if (!response.ok) {
          let message = 'Unable to load available housing';
          try {
            const data = JSON.parse(text);
            message = data.error || message;
          } catch {
            message = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || message;
          }
          throw new Error(message);
        }

        if (!text) {
          return [];
        }

        try {
          const data = JSON.parse(text);
          return Array.isArray(data) ? data : [];
        } catch {
          throw new Error('Server returned an invalid listings response.');
        }
      })
      .then((data) => {
        setProperties(data);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error(error);
        setProperties([]);
      });
    return () => controller.abort();
  }, [searchParams.check_in_date, searchParams.check_out_date, searchParams.num_of_guests]);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = searchParams.query?.trim().toLowerCase();
    const guestCount = Number(searchParams.num_of_guests);
    const hasDateRange = Boolean(searchParams.check_in_date && searchParams.check_out_date);

    return properties.filter((property) => {
      const searchableLocation = [
        property.property_name,
        property.building_name,
        property.google_maps_url,
        property.unit_number,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || searchableLocation.includes(normalizedQuery);
      const matchesGuestCount =
        !Number.isSafeInteger(guestCount) ||
        guestCount <= 0 ||
        Number(property.max_guests) >= guestCount;
      const matchesCheckIn =
        !hasDateRange ||
        !property.available_from ||
        searchParams.check_in_date >= property.available_from;
      const matchesCheckOut =
        !hasDateRange ||
        !property.available_until ||
        searchParams.check_out_date <= property.available_until;

      return matchesQuery && matchesGuestCount && matchesCheckIn && matchesCheckOut;
    });
  }, [properties, searchParams]);

  const handleSearch = (params) => {
    setSearchParams(params);
  };

  return (
    <div className="bg-white text-black font-sans min-h-screen flex flex-col">
      <Header
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        user={user}
        onLogout={onLogout}
        onOpenSignIn={onOpenSignIn}
        onOpenRegister={onOpenRegister}
      />
      {user?.needsSetup && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 md:px-10 lg:px-[52px]" role="alert">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="m-0 text-base font-semibold text-amber-950">Set up your account</h2>
              <p className="mt-1 text-sm text-amber-900">
                Complete your profile. You can continue browsing for now.
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex shrink-0 rounded-full bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-amber-950"
            >
              Set up profile
            </Link>
          </div>
        </div>
      )}
      <main className="grow">
        <SearchSection onSearch={handleSearch} />
        <PropertySection properties={filteredProperties} searchParams={searchParams} />
      </main>
      <Footer />
    </div>
  );
}