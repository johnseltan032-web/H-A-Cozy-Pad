import { useEffect, useMemo, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

const EMPTY_FORM = {
  question: '',
  answer: '',
};

export default function FaqManagement() {
  const [categories, setCategories] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingFaqId, setEditingFaqId] = useState(null);
  const [deleteFaqData, setDeleteFaqData] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFaqData();
  }, []);

  async function loadFaqData() {
    try {
      setIsLoading(true);
      setError('');

      const [categoryResponse, faqResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/faq_categories.php`, {
          method: 'GET',
          credentials: 'include',
        }),
        fetch(`${API_BASE_URL}/faqs.php`, {
          method: 'GET',
          credentials: 'include',
        }),
      ]);

      const categoryData = await categoryResponse.json();
      const faqData = await faqResponse.json();

      if (!categoryResponse.ok) {
        throw new Error(
          categoryData.error || 'Unable to load FAQ categories'
        );
      }

      if (!faqResponse.ok) {
        throw new Error(
          faqData.error || 'Unable to load FAQs'
        );
      }

      setCategories(categoryData.categories || []);
      setFaqs(faqData.faqs || []);

      if (categoryData.categories?.length > 0) {
        setSelectedCategoryId((currentId) => {
          const stillExists = categoryData.categories.some(
            (category) => category.categoryId === currentId
          );

          return stillExists
            ? currentId
            : categoryData.categories[0].categoryId;
        });
      } else {
        setSelectedCategoryId(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedCategory = categories.find(
    (category) => category.categoryId === selectedCategoryId
  );

  const selectedCategoryFaqs = faqs.filter(
    (faq) => faq.categoryId === selectedCategoryId
  );

  const visibleFaqs = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return selectedCategoryFaqs;
    }

    return selectedCategoryFaqs.filter((faq) =>
      `${faq.question} ${faq.answer}`
        .toLowerCase()
        .includes(term)
    );
  }, [search, selectedCategoryFaqs]);

  function openCreateForm() {
    setEditingFaqId(null);
    setForm(EMPTY_FORM);
    setError('');
    setIsFormOpen(true);
  }

  function openEditForm(faq) {
    setEditingFaqId(faq.faqId);
    setForm({
      question: faq.question,
      answer: faq.answer,
    });
    setError('');
    setIsFormOpen(true);
  }

  function openDeleteDialog(faq) {
    setDeleteFaqData(faq);
    setError('');
  }

  function closeDeleteDialog() {
    if (isDeleting) {
      return;
    }

    setDeleteFaqData(null);
  }

  async function confirmDeleteFaq() {
    if (!deleteFaqData) {
      return;
    }

    try {
      setIsDeleting(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/faqs.php`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            faqId: deleteFaqData.faqId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to delete FAQ'
        );
      }

      if (editingFaqId === deleteFaqData.faqId) {
        setIsFormOpen(false);
        setEditingFaqId(null);
        setForm(EMPTY_FORM);
      }

      setDeleteFaqData(null);

      await loadFaqData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function saveFaq(event) {
    event.preventDefault();

    if (!selectedCategoryId) {
      setError('Please select a category first.');
      return;
    }

    if (!form.question.trim() || !form.answer.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const isEditing = editingFaqId !== null;

      const response = await fetch(
        `${API_BASE_URL}/faqs.php`,
        {
          method: isEditing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            faqId: editingFaqId,
            categoryId: selectedCategoryId,
            question: form.question.trim(),
            answer: form.answer.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to save FAQ'
        );
      }

      setIsFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingFaqId(null);

      await loadFaqData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function addCategory() {
    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/faq_categories.php`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            categoryName: trimmedName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to create FAQ category'
        );
      }

      setCategoryName('');
      setIsCategoryFormOpen(false);

      await loadFaqData();

      setSelectedCategoryId(data.categoryId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function closeCategoryForm() {
    if (isSaving) {
      return;
    }

    setIsCategoryFormOpen(false);
    setCategoryName('');
  }

  return (
    <div className="bg-white text-black font-sans min-h-screen">
      <HostHeader activeNav="FAQ" />

      <main className="px-3 py-5 sm:px-5 sm:py-8 md:px-10 lg:px-[52px] md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold">FAQ Options</h1>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={!selectedCategoryId || isLoading}
            className="w-fit shrink-0 px-3 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-medium bg-black text-white rounded-md hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add FAQ
          </button>
        </div>

        <div className="mb-5 sm:mb-8 border border-sky-200 bg-sky-50 px-3 py-3 sm:px-5 sm:py-4 text-xs sm:text-sm text-sky-900">
          Manage the questions shown in the help experience. Select a category to review, edit, or remove its FAQs.
        </div>

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-neutral-500">
            Loading FAQs...
          </p>
        ) : (
          <div className="grid gap-4 sm:gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border-0 bg-transparent p-0 h-fit md:border md:border-neutral-200 md:bg-neutral-50 md:p-5">
              <button
                type="button"
                onClick={() => setIsCategoryFormOpen(true)}
                className="w-fit mb-3 md:mb-6 px-3 py-2 md:w-full md:px-4 md:py-2.5 text-xs sm:text-sm font-medium border border-black bg-black text-white rounded-md hover:bg-neutral-800 cursor-pointer"
              >
                + Add category
              </button>

              <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                Categories
              </p>

              <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible">
                {categories.map((category) => {
                  const faqCount = faqs.filter(
                    (faq) => faq.categoryId === category.categoryId
                  ).length;

                  return (
                    <button
                      type="button"
                      key={category.categoryId}
                      onClick={() => {
                        setSelectedCategoryId(category.categoryId);
                        setSearch('');
                        setIsFormOpen(false);
                      }}
                      className={`w-auto shrink-0 flex items-center justify-between gap-3 px-3 py-2 text-left text-xs sm:text-sm rounded-md cursor-pointer md:w-full md:py-2.5 ${
                        selectedCategoryId === category.categoryId
                          ? 'bg-black text-white'
                          : 'bg-transparent text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      <span>{category.categoryName}</span>

                      <span
                        className={
                          selectedCategoryId === category.categoryId
                            ? 'text-neutral-300'
                            : 'text-neutral-500'
                        }
                      >
                        {faqCount}
                      </span>
                    </button>
                  );
                })}

                {categories.length === 0 && (
                  <p className="text-sm text-neutral-500">
                    No categories yet.
                  </p>
                )}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-5">
                <div>
                  <p className="text-sm text-neutral-500">
                    Selected category
                  </p>

                  <h2 className="text-xl sm:text-2xl font-semibold">
                    {selectedCategory?.categoryName || 'No category selected'}
                  </h2>
                </div>

                <label className="relative w-full sm:w-72">
                  <span className="sr-only">
                    Search FAQs
                  </span>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search FAQs"
                    className="w-full border border-neutral-300 rounded-md px-4 py-2.5 text-sm outline-none focus:border-black"
                  />
                </label>
              </div>

              {isFormOpen && (
                <form
                  onSubmit={saveFaq}
                  className="mb-6 border border-neutral-300 p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {editingFaqId
                        ? 'Edit FAQ'
                        : 'Add FAQ'}
                    </h3>

                    <button
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        setForm(EMPTY_FORM);
                        setEditingFaqId(null);
                      }}
                      disabled={isSaving}
                      className="text-sm underline cursor-pointer bg-transparent border-0 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <label className="text-sm font-medium">
                      Question

                      <input
                        value={form.question}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            question: event.target.value,
                          })
                        }
                        className="mt-2 w-full border border-neutral-300 rounded-md px-3 py-2.5 font-normal outline-none focus:border-black"
                        required
                      />
                    </label>

                    <label className="text-sm font-medium">
                      Answer

                      <textarea
                        value={form.answer}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            answer: event.target.value,
                          })
                        }
                        className="mt-2 w-full min-h-28 border border-neutral-300 rounded-md px-3 py-2.5 font-normal outline-none resize-y focus:border-black"
                        required
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="mt-4 px-5 py-2.5 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving
                      ? 'Saving...'
                      : editingFaqId
                        ? 'Save changes'
                        : 'Create FAQ'}
                  </button>
                </form>
              )}

              <div className="overflow-x-auto border border-neutral-200">
                <table className="w-full min-w-[520px] border-collapse md:min-w-[620px]">
                  <thead className="bg-neutral-50">
                    <tr className="text-left border-b border-neutral-200">
                      <th className="px-4 py-3 font-semibold text-sm">
                        FAQ subject
                      </th>

                      <th className="px-4 py-3 font-semibold text-sm w-44">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleFaqs.map((faq) => (
                      <tr
                        key={faq.faqId}
                        className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                      >
                        <td className="px-4 py-3 text-sm">
                          {faq.question}
                        </td>

                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditForm(faq)}
                              className="px-2.5 py-1.5 text-xs font-medium border border-neutral-300 rounded-md hover:bg-neutral-100 cursor-pointer"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteDialog(faq)}
                              className="px-2.5 py-1.5 text-xs font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {visibleFaqs.length === 0 && (
                      <tr>
                        <td
                          colSpan="2"
                          className="px-4 py-12 text-center text-sm text-neutral-500"
                        >
                          {search
                            ? 'No FAQs match your search.'
                            : 'No FAQs in this category yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {isCategoryFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          role="presentation"
        >
          <div
            className="w-full max-w-md bg-white border border-neutral-200 p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-dialog-title"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-neutral-500 mb-1">
                  FAQ management
                </p>

                <h2
                  id="category-dialog-title"
                  className="text-2xl font-semibold"
                >
                  Add category
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCategoryForm}
                disabled={isSaving}
                className="text-2xl leading-none text-neutral-500 hover:text-black cursor-pointer bg-transparent border-0 disabled:opacity-50"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                addCategory();
              }}
            >
              <label className="text-sm font-medium">
                Category name

                <input
                  autoFocus
                  value={categoryName}
                  onChange={(event) =>
                    setCategoryName(event.target.value)
                  }
                  placeholder="e.g. Payment Questions"
                  className="mt-2 w-full border border-neutral-300 rounded-md px-3 py-2.5 font-normal outline-none focus:border-black"
                  required
                />
              </label>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeCategoryForm}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Adding...' : 'Add category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteFaqData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          role="presentation"
        >
          <div
            className="w-full max-w-md bg-white border border-neutral-200 p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="mb-6">
              <p className="text-sm text-red-600 mb-1">
                FAQ management
              </p>

              <h2
                id="delete-dialog-title"
                className="text-2xl font-semibold"
              >
                Delete FAQ?
              </h2>

              <p className="mt-3 text-sm text-neutral-600">
                Are you sure you want to delete this FAQ? This action cannot be undone.
              </p>

              <div className="mt-4 border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-sm font-medium text-neutral-800">
                  {deleteFaqData.question}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                className="px-4 py-2.5 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteFaq}
                disabled={isDeleting}
                className="px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
