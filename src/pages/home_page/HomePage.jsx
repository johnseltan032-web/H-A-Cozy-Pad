import { useEffect, useState } from 'react';
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
  const [filteredProperties, setFilteredProperties] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/available_listings.php`, { credentials: 'include' })
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
        setFilteredProperties(data);
      })
      .catch((error) => {
        console.error(error);
        setProperties([]);
        setFilteredProperties([]);
      });
  }, []);

  // Filter properties dynamically when search parameters change
  const handleSearch = (searchParams) => {
    const { query, num_of_guests } = searchParams;

    const filtered = properties.filter((property) => {
      const matchesQuery =
        !query ||
        property.building_name?.toLowerCase().includes(query.toLowerCase()) ||
        property.location?.toLowerCase().includes(query.toLowerCase()) ||
        property.unit_name?.toLowerCase().includes(query.toLowerCase());

      const matchesGuests =
        !num_of_guests || (property.max_guests ? property.max_guests >= num_of_guests : true);

      return matchesQuery && matchesGuests;
    });

    setFilteredProperties(filtered);
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
        <PropertySection properties={filteredProperties} />
      </main>
      <Footer />
    </div>
  );
}