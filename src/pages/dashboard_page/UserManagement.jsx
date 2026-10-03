import { useEffect, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

const getRoleLabel = (role) => {
  const normalizedRole = String(role || 'customer').toLowerCase();

  if (normalizedRole === 'super_admin') {
    return 'Super Admin';
  }

  if (normalizedRole === 'admin') {
    return 'Admin';
  }

  return 'Customer';
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    contact_num: '',
    password: '',
    role: 'customer',
    statistics_access: false,
  });

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/check_auth.php`, {
        credentials: 'include',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!data.authenticated || !data.user) {
        setError('Authentication required');
        return;
      }

      setCurrentUserId(Number(data.user.user_id));
      const role = String(data.user.role || '').toLowerCase();
      setIsAdmin(['admin', 'super_admin'].includes(role));
      setIsSuperAdmin(role === 'super_admin');
    } catch (fetchError) {
      console.error('Error checking current user:', fetchError);
      setError('Unable to verify user session');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users.php`, {
        credentials: 'include',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Unable to load users (${response.status})`);
      }

      if (!Array.isArray(data)) {
        throw new Error(data.error || 'Unable to load users');
      }

      setUsers(data);
    } catch (fetchError) {
      console.error('Error fetching users:', fetchError);
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setForm({
      full_name: '',
      email: '',
      contact_num: '',
      password: '',
      role: 'customer',
      statistics_access: false,
    });

    setModal('add');
    setError('');
  };

  const openEditModal = () => {
    if (!isSuperAdmin) return;

    const user = users.find((item) => item.user_id === selectedUserId);

    if (!user) {
      return;
    }

    setForm({
      full_name: user.full_name,
      email: user.email,
      contact_num: user.contact_num,
      password: '',
      role: user.role,
      statistics_access: Boolean(user.can_view_statistics),
    });

    setModal('edit');
    setIsUserDetailsOpen(false);
    setError('');
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setModal(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const saveUser = async (event) => {
    event.preventDefault();

    setIsSaving(true);
    setError('');

    try {
      const isEditing = modal === 'edit';

      const selectedUser = users.find(
        (user) => user.user_id === selectedUserId
      );

      if (isEditing && !selectedUser) {
        throw new Error('Selected user not found');
      }

      const isEditingCurrentUser =
        isEditing &&
        Number(selectedUser.user_id) === Number(currentUserId);

      const body = {
        full_name: form.full_name,
        email: form.email,
        contact_num: form.contact_num,
        role: isEditingCurrentUser ? 'super_admin' : (isSuperAdmin ? form.role : 'customer'),
        statistics_access: isSuperAdmin && form.role !== 'customer' && form.statistics_access,
      };

      if (isEditing) {
        body.user_id = selectedUser.user_id;
      } else {
        body.password = form.password;
      }

      const response = await fetch(`${API_BASE_URL}/users.php`, {
        method: isEditing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to save user');
      }

      setModal(null);
      setSelectedUserId(null);
      await fetchUsers();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!isSuperAdmin || !selectedUserId) {
      return;
    }

    const selectedUser = users.find(
      (user) => user.user_id === selectedUserId
    );

    if (!selectedUser) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/users.php`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete user');
      }

      setUsers((currentUsers) =>
        currentUsers.filter((user) => user.user_id !== selectedUserId)
      );

      setSelectedUserId(null);
      setIsUserDetailsOpen(false);
      setModal(null);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedUser = users.find(
    (user) => user.user_id === selectedUserId
  );

  const isEditingCurrentUser =
    modal === 'edit' &&
    selectedUser &&
    Number(selectedUser.user_id) === Number(currentUserId);

  if (!isAdmin && !authLoading) {
    return (
      <div className="bg-white text-black font-sans min-h-screen">
        <HostHeader activeNav="Users" />

        <main className="px-5 md:px-10 lg:px-[52px] py-10">
          <p className="text-red-600">Admin access required.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-white text-black font-sans min-h-screen">
      <HostHeader activeNav="Users" />

      <main className="px-3 py-5 sm:px-5 sm:py-8 md:px-10 lg:px-[52px] md:py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-10">
          <h1 className="text-2xl font-bold sm:text-4xl">User Management</h1>

          <button
            type="button"
            onClick={openAddModal}
            aria-label="Add user"
            title="Add user"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ca635a] bg-[#df766c] text-xl font-medium leading-none text-white transition hover:bg-[#bd584f] sm:h-11 sm:w-11 sm:text-2xl"
          >
            <span aria-hidden="true" className="flex h-full w-full items-center justify-center leading-none">+</span>
          </button>
        </div>

        {loading || authLoading ? (
          <p>Loading users...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-neutral-500">
            <p className="text-2xl font-medium">No users yet</p>
            <p className="mt-2">Add a user to see them here.</p>
          </div>
        ) : (
          <>
          <div className="space-y-3 sm:hidden">
            {users.map((user) => {
              return (
                <article
                  key={user.user_id}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-neutral-900">
                      {user.full_name}
                    </span>
                    <span className="mt-0.5 block break-all text-xs text-neutral-600">
                      {user.email}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId(user.user_id);
                      setIsUserDetailsOpen(true);
                    }}
                    className="shrink-0 rounded-full border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-900 transition hover:bg-neutral-50"
                  >
                    Details
                  </button>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="text-left border-b border-neutral-200">
                <th className="pb-3 font-semibold text-base">Name</th>
                <th className="pb-3 font-semibold text-base">Email</th>
                <th className="pb-3 font-semibold text-base">Contact</th>
                <th className="pb-3 font-semibold text-base">Role</th>
                <th className="pb-3 font-semibold text-base">Created</th>
                <th className="pb-3 text-right font-semibold text-base">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.user_id}
                  onClick={() => setSelectedUserId(user.user_id)}
                  className={`border-b border-neutral-100 cursor-pointer transition-colors ${
                    selectedUserId === user.user_id ? 'bg-neutral-100' : ''
                  }`}
                >
                  <td className="py-4 text-base">
                    {user.full_name}
                  </td>

                  <td className="py-4 text-base">
                    {user.email}
                  </td>

                  <td className="py-4 text-base">
                    {user.contact_num}
                  </td>

                  <td className="py-4 text-base">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>

                  <td className="py-4 text-base">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>

                  <td className="py-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.user_id);
                        setIsUserDetailsOpen(true);
                      }}
                      className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </>
        )}

        {error && !loading && users.length > 0 && (
          <p className="mt-4 text-red-600">{error}</p>
        )}
      </main>

      {isUserDetailsOpen && selectedUser && (
        <div
          className="fixed inset-0 z-[3200] flex items-end justify-center bg-black/40 sm:items-center sm:px-5 sm:py-8"
          onClick={() => {
            setIsUserDetailsOpen(false);
            setSelectedUserId(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
            className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overflow-y-auto p-5 sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-neutral-500">User details</p>
                  <h2 id="user-details-title" className="mt-1 break-words text-xl font-semibold">
                    {selectedUser.full_name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserDetailsOpen(false);
                    setSelectedUserId(null);
                  }}
                  aria-label="Close user details"
                  className="text-2xl leading-none text-neutral-500"
                >
                  &times;
                </button>
              </div>

              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-neutral-500">Email</dt>
                  <dd className="mt-1 break-all font-medium">{selectedUser.email || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Contact</dt>
                  <dd className="mt-1 font-medium">{selectedUser.contact_num || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Role</dt>
                  <dd className="mt-1 font-medium">{getRoleLabel(selectedUser.role)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Created</dt>
                  <dd className="mt-1 font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</dd>
                </div>
                {selectedUser.role !== 'customer' && (
                  <div className="sm:col-span-2">
                    <dt className="text-neutral-500">Statistics access</dt>
                    <dd className="mt-1 font-medium">{selectedUser.can_view_statistics ? 'Allowed' : 'Not allowed'}</dd>
                  </div>
                )}
              </dl>
            </div>

            {isSuperAdmin && (
              <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-7">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserDetailsOpen(false);
                    setModal('delete');
                  }}
                  className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
                >
                  Edit
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {modal === 'add' && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 px-5" onClick={closeModal}>
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 sm:p-7" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Add User</h2>

            <form onSubmit={saveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  name="contact_num"
                  value={form.contact_num}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black"
                />
              </div>

              {isSuperAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Role
                    </label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black bg-white"
                    >
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  {form.role !== 'customer' && (
                <label className="flex items-center gap-3 rounded-md border border-neutral-300 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={form.statistics_access}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      statistics_access: event.target.checked,
                    }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">Allow access to Statistics/KPIs</span>
                </label>
                  )}
                </>
              )}

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-5 py-2.5 border border-neutral-300 rounded-md hover:bg-neutral-100 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 border border-neutral-300 rounded-md hover:bg-neutral-100 disabled:opacity-40"
                >
                  {isSaving ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSuperAdmin && modal === 'edit' && selectedUser && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 px-5" onClick={closeModal}>
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 sm:p-7" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Edit User</h2>

            <form onSubmit={saveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  name="contact_num"
                  value={form.contact_num}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={isEditingCurrentUser}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2.5 outline-none focus:border-black bg-white disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed"
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>

                {isEditingCurrentUser && (
                  <p className="mt-1 text-sm text-neutral-500">
                    You cannot change your own role.
                  </p>
                )}
              </div>

              {form.role !== 'customer' && (
                <label className="flex items-center gap-3 rounded-md border border-neutral-300 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={form.statistics_access}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      statistics_access: event.target.checked,
                    }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">Allow access to Statistics/KPIs</span>
                </label>
              )}

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-5 py-2.5 border border-neutral-300 rounded-md hover:bg-neutral-100 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 border border-neutral-300 rounded-md hover:bg-neutral-100 disabled:opacity-40"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSuperAdmin && modal === 'delete' && selectedUser && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 px-5" onClick={closeModal}>
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 sm:p-7" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-3">Delete User</h2>

            <p className="text-neutral-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-black">
                {selectedUser.full_name}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-3 pt-7">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="px-5 py-2.5 border border-neutral-300 rounded-md hover:bg-neutral-100 disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={deleteUser}
                disabled={isSaving}
                className="px-5 py-2.5 border border-neutral-300 rounded-md hover:bg-neutral-100 disabled:opacity-40"
              >
                {isSaving ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
