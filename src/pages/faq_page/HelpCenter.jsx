import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { API_BASE_URL } from '../../lib/api';

export default function HelpCenter({
  isMenuOpen,
  setIsMenuOpen,
  user,
  onLogout,
  onOpenSignIn,
  onOpenRegister,
}) {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [openFaqId, setOpenFaqId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFaqData = useCallback(async () => {
    try {
      const [faqResponse, categoryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/get_faqs.php`),
        fetch(`${API_BASE_URL}/get_faq_categories.php`),
      ]);

      const faqData = await faqResponse.json();
      const categoryData = await categoryResponse.json();

      if (!faqResponse.ok) {
        throw new Error(
          faqData.error || 'Unable to load FAQs'
        );
      }

      if (!categoryResponse.ok) {
        throw new Error(
          categoryData.error || 'Unable to load FAQ categories'
        );
      }

      setError('');
      setFaqs(faqData.faqs || []);

      setCategories(
        (categoryData.categories || []).map((category) => ({
          categoryId: category.categoryId,
          name: category.categoryName,
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadFaqData, 0);
    const interval = setInterval(() => {
      loadFaqData();
    }, 5000);

    return () => {
      window.clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadFaqData]);

  const visibleFaqs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory =
        !selectedCategory ||
        faq.categoryId === selectedCategory;

      const matchesSearch =
        !term ||
        `${faq.question} ${faq.answer} ${faq.categoryName}`
          .toLowerCase()
          .includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [faqs, search, selectedCategory]);

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
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

      <main className="grow">
        <section className="flex flex-col items-center px-4 pt-7 pb-6 sm:px-5 sm:pt-14 sm:pb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-5 sm:mb-8 text-center">
            Hello, how can we help you?
          </h1>

          <div className="w-full max-w-[520px] flex items-center gap-3 bg-white border border-neutral-300 rounded-full px-4 py-3 sm:px-6 sm:py-4 shadow-sm">
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOpenFaqId(null);
              }}
              placeholder="Search"
              className="w-full min-w-0 bg-transparent border-none outline-none text-base sm:text-lg font-light"
            />

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 shrink-0 text-neutral-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </section>

        <section className="flex flex-col items-center px-4 pb-6 sm:px-5 sm:pb-10">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">
            Need to get in touch?
          </h2>

          <div className="grid w-full max-w-[420px] grid-cols-2 gap-2 mb-3 sm:flex sm:w-auto sm:gap-4 sm:mb-4">
            <button
              type="button"
              className="px-3 py-2.5 text-sm sm:px-10 sm:py-3 sm:text-lg font-medium bg-neutral-100 border border-neutral-300 rounded-full hover:bg-neutral-200 cursor-pointer"
            >
              Chatbots
            </button>

            <button
              type="button"
              className="px-3 py-2.5 text-sm sm:px-10 sm:py-3 sm:text-lg font-medium bg-neutral-100 border border-neutral-300 rounded-full hover:bg-neutral-200 cursor-pointer"
            >
              Contact Us
            </button>
          </div>

          <p className="text-sm text-neutral-600">
            You can also{' '}
            <a href="#" className="underline text-black">
              give us feedback
            </a>
          </p>
        </section>

        <hr className="border-neutral-200 mx-5" />

        <section className="px-4 py-8 sm:px-5 md:px-10 lg:px-[52px] md:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-5 sm:mb-8">
            Frequently Asked Questions
          </h2>

          <div className="pb-4 sm:pb-5 flex flex-wrap justify-center gap-2 sm:gap-3">
            {categories.map((category) => {
              const isSelected =
                selectedCategory === category.categoryId;

              return (
                <button
                  type="button"
                  key={category.categoryId}
                  onClick={() => {
                    setSelectedCategory(
                      isSelected
                        ? null
                        : category.categoryId
                    );
                    setOpenFaqId(null);
                  }}
                  aria-pressed={isSelected}
                  className={`px-3 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm font-medium border rounded-full cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-neutral-300 hover:border-black hover:bg-neutral-50'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          {selectedCategory && (
            <p className="mb-5 text-center text-sm text-neutral-600">
              {
                categories.find(
                  (category) =>
                    category.categoryId === selectedCategory
                )?.name
              }
            </p>
          )}

          {error && (
            <div className="max-w-[800px] mx-auto mb-5 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <p className="text-center text-sm text-neutral-500">
              Loading FAQs...
            </p>
          ) : (
            <div className="max-w-[800px] mx-auto flex flex-col gap-2 sm:gap-4">
              {visibleFaqs.map((faq) => {
                const isOpen = openFaqId === faq.faqId;

                return (
                  <div
                    key={faq.faqId}
                    className="border border-neutral-300 rounded-lg sm:rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.faqId)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 text-left text-sm sm:text-lg font-medium bg-transparent border-0 cursor-pointer"
                    >
                      {faq.question}

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-3 sm:px-6 sm:pb-4 text-sm sm:text-base text-neutral-600 wrap-anywhere">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}

              {visibleFaqs.length === 0 && (
                <p className="py-10 text-center text-sm text-neutral-500">
                  {search
                    ? 'No FAQs match your search.'
                    : selectedCategory
                      ? 'No FAQs in this category yet.'
                      : 'No FAQs available yet.'}
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
