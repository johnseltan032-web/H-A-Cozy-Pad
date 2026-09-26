import { useEffect, useMemo, useState } from 'react';
import HostHeader from '../components/HostHeader';

const EMPTY_FORM = {
    question: '',
    answer: ''
};

export default function FaqManagement() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(1);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingFaqId, setEditingFaqId] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
    const [categoryName, setCategoryName] = useState('');

    const selectedCategory = categories.find(
        (category) => category.categoryId === selectedCategoryId
    );

    const visibleFaqs = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!selectedCategory) return [];

        if (!term) {
            return selectedCategory.faqs;
        }

        return selectedCategory.faqs.filter((faq) =>
            `${faq.question} ${faq.answer}`
                .toLowerCase()
                .includes(term)
        );
    }, [search, selectedCategory]);

    // ========================================
    // LOAD FAQs FROM DATABASE
    // ========================================

    const loadFaqs = async (selectCategoryId = null) => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(
                'http://localhost:5000/api/faqs'
            );

            if (!response.ok) {
                throw new Error('Failed to load FAQs.');
            }

            const data = await response.json();

            setCategories(data);

            if (data.length === 0) {
                setSelectedCategoryId(null);
            } else if (selectCategoryId !== null) {
                const categoryExists = data.some(
                    (category) =>
                        category.categoryId === selectCategoryId
                );

                if (categoryExists) {
                    setSelectedCategoryId(selectCategoryId);
                } else {
                    setSelectedCategoryId(data[0].categoryId);
                }
            } else if (
                !data.some(
                    (category) =>
                        category.categoryId === selectedCategoryId
                )
            ) {
                setSelectedCategoryId(data[0].categoryId);
            }
        } catch (error) {
            console.error('FAQ loading error:', error);
            setError('Unable to load FAQs from the database.');
        } finally {
            setLoading(false);
        }
    };

    // Load FAQs when page opens
    useEffect(() => {
        loadFaqs();
    }, []);

    // ========================================
    // OPEN CREATE FAQ FORM
    // ========================================

    const openCreateForm = () => {
        setEditingFaqId(null);
        setForm(EMPTY_FORM);
        setIsFormOpen(true);
    };

    // ========================================
    // OPEN EDIT FAQ FORM
    // ========================================

    const openEditForm = (faq) => {
        setEditingFaqId(faq.id);

        setForm({
            question: faq.question,
            answer: faq.answer
        });

        setIsFormOpen(true);
    };

    // ========================================
    // SAVE FAQ
    // ========================================

    const saveFaq = async (event) => {
        event.preventDefault();

        if (!form.question.trim() || !form.answer.trim()) {
            return;
        }

        try {
            setError('');

            let response;

            if (editingFaqId) {
                // UPDATE existing FAQ
                response = await fetch(
                    `http://localhost:5000/api/faqs/${editingFaqId}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            question: form.question.trim(),
                            answer: form.answer.trim()
                        })
                    }
                );
            } else {
                // CREATE new FAQ
                response = await fetch(
                    'http://localhost:5000/api/faqs',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            category_id: selectedCategoryId,
                            question: form.question.trim(),
                            answer: form.answer.trim()
                        })
                    }
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Unable to save FAQ.'
                );
            }

            // Reload data from MySQL
            await loadFaqs(selectedCategoryId);

            setIsFormOpen(false);
            setForm(EMPTY_FORM);
            setEditingFaqId(null);

        } catch (error) {
            console.error('Save FAQ error:', error);

            setError(
                error.message || 'Unable to save FAQ.'
            );
        }
    };

    // ========================================
    // DELETE FAQ
    // ========================================

    const deleteFaq = async (faqId) => {
        if (!window.confirm('Delete this FAQ?')) {
            return;
        }

        try {
            setError('');

            const response = await fetch(
                `http://localhost:5000/api/faqs/${faqId}`,
                {
                    method: 'DELETE'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Unable to delete FAQ.'
                );
            }

            // Reload data from MySQL
            await loadFaqs(selectedCategoryId);

            if (editingFaqId === faqId) {
                setIsFormOpen(false);
                setEditingFaqId(null);
                setForm(EMPTY_FORM);
            }

        } catch (error) {
            console.error('Delete FAQ error:', error);

            setError(
                error.message || 'Unable to delete FAQ.'
            );
        }
    };

    // ========================================
    // ADD CATEGORY
    // ========================================

    const addCategory = async () => {
        if (!categoryName.trim()) {
            return;
        }

        try {
            setError('');

            const response = await fetch(
                'http://localhost:5000/api/faq-categories',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        category_name: categoryName.trim()
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Unable to create category.'
                );
            }

            const newCategoryId = data.category_id;

            // Reload categories from MySQL
            await loadFaqs(newCategoryId);

            setSearch('');
            setCategoryName('');
            setIsCategoryFormOpen(false);

        } catch (error) {
            console.error('Create category error:', error);

            setError(
                error.message || 'Unable to create category.'
            );
        }
    };

    // ========================================
    // CLOSE CATEGORY FORM
    // ========================================

    const closeCategoryForm = () => {
        setIsCategoryFormOpen(false);
        setCategoryName('');
    };

    return (
        <div className="bg-white text-black font-sans min-h-screen">

            <HostHeader />

            <main className="px-5 md:px-10 lg:px-[52px] py-10">

                {/* PAGE HEADER */}
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-8">

                    <div>
                        <h1 className="text-4xl font-bold">
                            FAQ Options
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateForm}
                        disabled={!selectedCategory}
                        className="w-fit px-5 py-2.5 text-base font-medium bg-black text-white rounded-md hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        + Add FAQ
                    </button>

                </div>

                {/* INFORMATION MESSAGE */}
                <div className="mb-8 border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
                    Manage the questions shown in the help experience.
                    Select a category to review, edit, or remove its FAQs.
                </div>

                {/* ERROR MESSAGE */}
                {error && (
                    <div className="mb-6 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">

                    {/* ========================================
                        CATEGORIES
                    ======================================== */}

                    <aside className="border border-neutral-200 bg-neutral-50 p-5 h-fit">

                        <button
                            type="button"
                            onClick={() => setIsCategoryFormOpen(true)}
                            className="w-full mb-6 px-4 py-2.5 text-sm font-medium border border-black bg-black text-white rounded-md hover:bg-neutral-800 cursor-pointer"
                        >
                            + Add category
                        </button>

                        <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                            Categories
                        </p>

                        <div className="flex flex-col gap-1">

                            {categories.map((category) => (
                                <button
                                    type="button"
                                    key={category.categoryId}
                                    onClick={() => {
                                        setSelectedCategoryId(
                                            category.categoryId
                                        );

                                        setSearch('');
                                        setIsFormOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm rounded-md cursor-pointer ${selectedCategoryId === category.categoryId
                                            ? 'bg-black text-white'
                                            : 'bg-transparent text-neutral-700 hover:bg-neutral-200'
                                        }`}
                                >
                                    <span>
                                        {category.categoryName}
                                    </span>

                                    <span
                                        className={
                                            selectedCategoryId === category.categoryId
                                                ? 'text-neutral-300'
                                                : 'text-neutral-500'
                                        }
                                    >
                                        {category.faqs.length}
                                    </span>

                                </button>
                            ))}

                        </div>

                    </aside>


                    {/* ========================================
                        FAQ CONTENT
                    ======================================== */}

                    <section className="min-w-0">

                        {/* CATEGORY HEADER */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">

                            <div>
                                <p className="text-sm text-neutral-500">
                                    Selected category
                                </p>

                                <h2 className="text-2xl font-semibold">
                                    {selectedCategory?.categoryName ||
                                        'No category selected'}
                                </h2>
                            </div>

                            <label className="relative w-full sm:w-72">

                                <span className="sr-only">
                                    Search FAQs
                                </span>

                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search FAQs"
                                    className="w-full border border-neutral-300 rounded-md px-4 py-2.5 text-sm outline-none focus:border-black"
                                />

                            </label>

                        </div>


                        {/* ========================================
                            FAQ FORM
                        ======================================== */}

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
                                        className="text-sm underline cursor-pointer bg-transparent border-0"
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
                                                    question: event.target.value
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
                                                    answer: event.target.value
                                                })
                                            }
                                            className="mt-2 w-full min-h-28 border border-neutral-300 rounded-md px-3 py-2.5 font-normal outline-none resize-y focus:border-black"
                                            required
                                        />

                                    </label>

                                </div>


                                <button
                                    type="submit"
                                    className="mt-4 px-5 py-2.5 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 cursor-pointer"
                                >
                                    {editingFaqId
                                        ? 'Save changes'
                                        : 'Create FAQ'}
                                </button>

                            </form>
                        )}


                        {/* ========================================
                            FAQ TABLE
                        ======================================== */}

                        <div className="overflow-x-auto border border-neutral-200">

                            {loading ? (

                                <p className="px-4 py-12 text-center text-sm text-neutral-500">
                                    Loading FAQs...
                                </p>

                            ) : (

                                <table className="w-full min-w-[620px] border-collapse">

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
                                                key={faq.id}
                                                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                                            >

                                                <td className="px-4 py-3 text-sm">
                                                    {faq.question}
                                                </td>

                                                <td className="px-4 py-3">

                                                    <div className="flex gap-2">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditForm(faq)
                                                            }
                                                            className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-md hover:bg-neutral-100 cursor-pointer"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteFaq(faq.id)
                                                            }
                                                            className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
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

                            )}

                        </div>

                    </section>

                </div>

            </main>


            {/* ========================================
                ADD CATEGORY MODAL
            ======================================== */}

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
                                className="text-2xl leading-none text-neutral-500 hover:text-black cursor-pointer bg-transparent border-0"
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
                                        setCategoryName(
                                            event.target.value
                                        )
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
                                    className="px-4 py-2.5 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-100 cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2.5 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 cursor-pointer"
                                >
                                    Add category
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}