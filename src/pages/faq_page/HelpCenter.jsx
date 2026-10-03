import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Chatbot from '../../components/Chatbot';
import ContactModal from '../../components/ContactModal';
import { API_BASE_URL } from '../../lib/api';
import shoreLogo from '../../images/shore_logo_transparent.png';

const CATEGORY_PRESENTATION = [
  { names: ['appliances'], icon: '🔌', description: 'Washing machine, stove, range hood & more' },
  { names: ['address & location', 'location'], icon: '📍', description: 'Find us, maps & nearby places' },
  { names: ['getting here', 'directions'], icon: '🚗', description: 'Directions, parking & building entrance' },
  { names: ['check-in & access', 'check in & access', 'check-in', 'check in'], icon: '🔑', description: 'How to enter and access your unit' },
  { names: ['the unit', 'unit'], icon: '🛏️', description: 'Beds, towels & the essentials in your unit' },
  { names: ['wi-fi & tv', 'wifi & tv', 'wi-fi', 'wifi'], icon: '📶', description: 'Internet, streaming & TV instructions' },
  { names: ['aircon & hot shower', 'air conditioning'], icon: '❄️', description: 'Air conditioning and hot water help' },
  { names: ['cooking'], icon: '🍳', description: 'Kitchen equipment & cooking guidelines' },
  { names: ['amenities'], icon: '🏊', description: 'Pool and building facilities' },
  { names: ['house rules', 'rules'], icon: '📋', description: 'Important rules during your stay' },
  { names: ['cleaning & housekeeping', 'cleaning'], icon: '🧹', description: 'Trash, cleaning & laundry' },
  { names: ['payment & booking', 'payments & booking', 'booking'], icon: '💳', description: 'Payments, cancellations & changes' },
  { names: ['troubleshooting'], icon: '🛠️', description: 'Quick solutions to common problems' },
  { names: ['contact & support', 'contact'], icon: '💬', description: 'Need help? Contact the host' },
  { names: ['check-out', 'check out'], icon: '🧳', description: 'Everything you need before leaving' },
];

function getCategoryPresentation(categoryName) {
  const normalizedName = String(categoryName || '').trim().toLowerCase();
  return CATEGORY_PRESENTATION.find((presentation) =>
    presentation.names.includes(normalizedName)
  ) || { icon: '❔', description: `Browse common questions about ${categoryName}.` };
}

export default function HelpCenter({
  isMenuOpen,
  setIsMenuOpen,
  user,
  onLogout,
  onOpenSignIn,
  onOpenRegister,
  onOpenChat,
}) {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openFaqId, setOpenFaqId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleOpenChat = () => {
    if (typeof onOpenChat === 'function') {
      onOpenChat();
      return;
    }

    setIsChatOpen(true);
  };

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
          icon: category.categoryIcon,
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
    return faqs.filter((faq) =>
      !selectedCategory || faq.categoryId === selectedCategory
    );
  }, [faqs, selectedCategory]);

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
        <section className="flex flex-col items-center px-4 pt-7 pb-8 sm:px-5 sm:pt-14 sm:pb-10">
          <img
            src={shoreLogo}
            alt="Shore Residences Mall of Asia Complex"
            className="mb-6 h-auto w-44 sm:w-56"
          />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center">
            Hello, how can we help you?
          </h1>
        </section>

        <section className="flex flex-col items-center px-4 pb-8 sm:px-5 sm:pb-10">
          <div className="mb-3 grid w-full max-w-[420px] grid-cols-2 gap-2 sm:mb-4 sm:flex sm:w-auto sm:gap-4">
            <button
              type="button"
              onClick={handleOpenChat}
              className="cursor-pointer rounded-full border border-neutral-300 bg-neutral-100 px-3 py-2.5 text-sm font-medium hover:bg-neutral-200 sm:px-10 sm:py-3 sm:text-lg"
            >
              Chatbots
            </button>
            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="cursor-pointer rounded-full border border-neutral-300 bg-neutral-100 px-3 py-2.5 text-sm font-medium hover:bg-neutral-200 sm:px-10 sm:py-3 sm:text-lg"
            >
              Contact Us
            </button>
          </div>
          <p className="text-sm text-neutral-600">
            You can also{' '}
            <a href="#" className="text-black underline">
              give us feedback
            </a>
          </p>
        </section>

        <hr className="border-neutral-200 mx-5" />

        <section className="px-4 py-8 sm:px-5 md:px-10 lg:px-[52px] md:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-5 sm:mb-8">
            Help Center
          </h2>

          <div className="mx-auto mb-8 grid max-w-[1180px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const isSelected = selectedCategory === category.categoryId;
              const presentation = getCategoryPresentation(category.name);
              const faqCount = faqs.filter(
                (faq) => faq.categoryId === category.categoryId
              ).length;

              return (
                <div key={category.categoryId} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(isSelected ? null : category.categoryId);
                      setOpenFaqId(null);
                    }}
                    aria-pressed={isSelected}
                    className={`flex min-h-32 w-full items-start gap-4 rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-50 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-400'
                    }`}
                  >
                    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                      {category.icon || presentation.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-neutral-900">{category.name}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-neutral-600">{presentation.description}</span>
                      <span className="mt-3 block text-xs font-medium text-neutral-500">
                        {faqCount} {faqCount === 1 ? 'FAQ' : 'FAQs'}
                      </span>
                    </span>
                  </button>
                  {isSelected && (
                    <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                      {isLoading ? (
                        <p className="py-4 text-center text-sm text-neutral-500">Loading FAQs...</p>
                      ) : visibleFaqs.length ? (
                        visibleFaqs.map((faq) => {
                          const isOpen = openFaqId === faq.faqId;
                          return (
                            <div key={faq.faqId} className="overflow-hidden rounded-lg border border-neutral-300">
                              <button
                                type="button"
                                onClick={() => toggleFaq(faq.faqId)}
                                className="flex w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-3 text-left text-sm font-medium sm:px-5 sm:py-4 sm:text-base"
                              >
                                {faq.question}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
                                <div className="wrap-anywhere px-4 pb-3 text-sm text-neutral-600 sm:px-5 sm:pb-4">{faq.answer}</div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="py-4 text-center text-sm text-neutral-500">No FAQs in this category yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="max-w-[800px] mx-auto mb-5 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className={selectedCategory ? 'hidden' : 'block'}>
          {isLoading ? (
            <p className="text-center text-sm text-neutral-500">
              Loading FAQs...
            </p>
          ) : !selectedCategory ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              Choose a category to browse its frequently asked questions.
            </p>
          ) : (
            <div className="mx-auto max-w-[800px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {categories.find((category) => category.categoryId === selectedCategory)?.name}
                </h3>
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(null);
                      setOpenFaqId(null);
                    }}
                    className="text-sm font-medium text-neutral-600 underline underline-offset-2 hover:text-black"
                  >
                    All categories
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:gap-4">
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
                    {selectedCategory
                      ? 'No FAQs in this category yet.'
                      : 'No FAQs available yet.'}
                  </p>
                )}
              </div>
            </div>
          )}
          </div>
        </section>
      </main>

      <Footer />
      <Chatbot
        isOpen={isChatOpen}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => setIsChatOpen(false)}
      />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}
