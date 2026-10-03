import { useEffect, useMemo, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

const expenseCategories = [
  'cleaning',
  'maintenance',
  'supplies',
  'rent',
  'electricity',
  'water',
  'internet',
  'repairs',
  'amenities',
  'laundry',
  'toiletries',
  'other',
];

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toTitleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

async function parseJsonResponse(response, fallbackMessage) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(cleaned || fallbackMessage);
  }
}

export default function DashboardExpenses({ embedded = false }) {
  const [units, setUnits] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    unit_id: '',
    expense_date: new Date().toISOString().slice(0, 10),
    category: expenseCategories[0],
    amount: '',
    notes: '',
  });

  const unitMap = useMemo(
    () => Object.fromEntries(units.map((unit) => [String(unit.unit_id), unit])),
    [units]
  );

  const loadUnits = async () => {
    const response = await fetch(`${API_BASE_URL}/listings.php`, {
      credentials: 'include',
      cache: 'no-store',
    });

    const data = await parseJsonResponse(response, 'Unable to load units');
    if (!response.ok) {
      throw new Error((data && data.error) || 'Unable to load units');
    }

    if (Array.isArray(data)) {
      setUnits(data.filter((unit) => unit && unit.unit_id));
    }
  };

  const loadExpenses = async () => {
    const response = await fetch(`${API_BASE_URL}/expenses.php`, {
      credentials: 'include',
      cache: 'no-store',
    });

    const data = await parseJsonResponse(response, 'Unable to load expenses');
    if (!response.ok) {
      throw new Error((data && data.error) || 'Unable to load expenses');
    }

    setExpenses(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');

      try {
        await Promise.all([loadUnits(), loadExpenses()]);
      } catch (loadError) {
        setError(loadError.message || 'Unable to load expenses');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const resetForm = () => {
    setForm({
      unit_id: units[0]?.unit_id ? String(units[0].unit_id) : '',
      expense_date: new Date().toISOString().slice(0, 10),
      category: expenseCategories[0],
      amount: '',
      notes: '',
    });
    setEditingId(null);
  };

  useEffect(() => {
    if (!units.length) return;
    if (!form.unit_id) {
      setForm((current) => ({ ...current, unit_id: String(units[0].unit_id) }));
    }
  }, [units, form.unit_id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...(editingId ? { expense_id: editingId } : {}),
        unit_id: Number(form.unit_id),
        expense_date: form.expense_date,
        category: form.category,
        amount: Number(form.amount),
        notes: form.notes,
      };

      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(`${API_BASE_URL}/expenses.php`, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonResponse(response, 'Unable to save expense');
      if (!response.ok) {
        throw new Error((data && data.error) || 'Unable to save expense');
      }

      setSuccess(editingId ? 'Expense updated successfully.' : 'Expense recorded successfully.');
      await loadExpenses();
      resetForm();
    } catch (submitError) {
      setError(submitError.message || 'Unable to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.expense_id);
    setForm({
      unit_id: String(expense.unit_id),
      expense_date: expense.expense_date,
      category: expense.category,
      amount: String(expense.amount),
      notes: expense.notes || '',
    });
    setSuccess('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Delete this expense record?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/expenses.php`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expense_id: expenseId }),
      });

      const data = await parseJsonResponse(response, 'Unable to delete expense');
      if (!response.ok) {
        throw new Error((data && data.error) || 'Unable to delete expense');
      }

      setExpenses((current) => current.filter((expense) => expense.expense_id !== expenseId));
      if (editingId === expenseId) {
        resetForm();
      }
      setSuccess('Expense deleted successfully.');
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return (
    <div className={embedded ? 'space-y-4 text-neutral-900' : 'min-h-screen bg-neutral-50 text-neutral-900'}>
      {!embedded && <HostHeader activeNav="Statistics" />}

      <main className={embedded ? 'space-y-5' : 'mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-10'}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{embedded ? 'Financials' : 'Operations'}</p>
            <h1 className={embedded ? 'mb-0 mt-2 text-2xl font-semibold' : 'mt-2 text-3xl font-semibold'}>Unit Expenses</h1>
            {embedded && <p className="mb-0 mt-2 text-sm text-neutral-600">Record and review expenses associated with each unit.</p>}
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm">
            Total recorded: <span className="font-semibold text-neutral-900">₱{formatMoney(totalExpenses)}</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        )}

        <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mt-0 text-xl font-semibold">{editingId ? 'Edit expense' : 'Add expense'}</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="unit_id" className="mb-2 block text-sm font-medium text-neutral-700">Unit</label>
                <select
                  id="unit_id"
                  name="unit_id"
                  value={form.unit_id}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                  required
                >
                  <option value="">Select a unit</option>
                  {units.map((unit) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.building_name ? `${unit.building_name} - ${unit.unit_name || 'Unit'}` : unit.unit_name || 'Unit'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense_date" className="mb-2 block text-sm font-medium text-neutral-700">Date</label>
                <input
                  id="expense_date"
                  name="expense_date"
                  type="date"
                  value={form.expense_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-2 block text-sm font-medium text-neutral-700">Category</label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                  required
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {toTitleCase(category)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="amount" className="mb-2 block text-sm font-medium text-neutral-700">Amount</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="notes" className="mb-2 block text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="4"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional description or vendor note"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Saving...' : editingId ? 'Update expense' : 'Save expense'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="m-0 text-xl font-semibold">Expense log</h2>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700">
                {expenses.length} entries
              </span>
            </div>

            {loading ? (
              <p className="px-5 py-8 text-sm text-neutral-500">Loading expenses...</p>
            ) : expenses.length === 0 ? (
              <p className="px-5 py-8 text-sm text-neutral-500">No expenses recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-neutral-700">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-[0.12em] text-neutral-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Unit</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Notes</th>
                      <th className="px-5 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => {
                      const unit = unitMap[String(expense.unit_id)];

                      return (
                        <tr key={expense.expense_id} className="border-t border-neutral-200 align-top">
                          <td className="px-5 py-3">
                            <div className="font-medium text-neutral-900">{unit?.building_name || 'Property'}</div>
                            <div className="text-xs text-neutral-500">{unit?.unit_name || 'Unit'}</div>
                          </td>
                          <td className="px-5 py-3">
                            {new Date(`${expense.expense_date}T00:00:00`).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-3">{toTitleCase(expense.category)}</td>
                          <td className="px-5 py-3 font-semibold text-neutral-900">₱{formatMoney(expense.amount)}</td>
                          <td className="px-5 py-3 max-w-[220px] break-words text-neutral-600">{expense.notes || '—'}</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(expense)}
                                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(expense.expense_id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
