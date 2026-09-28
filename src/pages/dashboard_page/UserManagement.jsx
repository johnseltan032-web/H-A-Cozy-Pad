import { useEffect, useState } from 'react';
import HostHeader from '../../components/HostHeader';
import { API_BASE_URL } from '../../lib/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [modal, setModal] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    contact_num: '',
    password: '',
    role: 'customer',
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
      setIsAdmin(data.user.role === 'admin');
    } catch (fetchError) {
      console.error('Error checking current user:', fetchError);
      setError('Unable to verify user session');
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
    });

    setModal('add');
    setError('');
  };

  const openEditModal = () => {
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
    });

    setModal('edit');
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
        role: isEditingCurrentUser ? 'admin' : form.role,
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
    if (!selectedUserId) {
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

  if (!isAdmin && !loading) {
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

          <div className="flex w-auto flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              disabled={!selectedUserId || isSaving}
              onClick={() => setModal('delete')}
              className="px-3 py-2 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-100 bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed sm:px-6 sm:py-2.5 sm:text-base"
            >
              Delete
            </button>

            <button
              type="button"
              disabled={!selectedUserId || isSaving}
              onClick={openEditModal}
              className="px-3 py-2 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-100 bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed sm:px-6 sm:py-2.5 sm:text-base"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="px-3 py-2 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-100 bg-transparent cursor-pointer sm:px-6 sm:py-2.5 sm:text-base"
            >
              Add
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-neutral-500">
            <p className="text-2xl font-medium">No users yet</p>
            <p className="mt-2">Add a user to see them here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="text-left border-b border-neutral-200">
                <th className="pb-3 font-semibold text-base">Name</th>
                <th className="pb-3 font-semibold text-base">Email</th>
                <th className="pb-3 font-semibold text-base">Contact</th>
                <th className="pb-3 font-semibold text-base">Role</th>
                <th className="pb-3 font-semibold text-base">Created</th>
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
                      {(user.role || 'customer').charAt(0).toUpperCase() +
                        (user.role || 'customer').slice(1)}
                    </span>
                  </td>

                  <td className="py-4 text-base">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {error && !loading && users.length > 0 && (
          <p className="mt-4 text-red-600">{error}</p>
        )}
      </main>

      {modal === 'add' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-5 z-50">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 sm:p-7">
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
                  <option value="assistant">Assistant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

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

      {modal === 'edit' && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-5 z-50">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 sm:p-7">
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
                  <option value="assistant">Assistant</option>
                  <option value="admin">Admin</option>
                </select>

                {isEditingCurrentUser && (
                  <p className="mt-1 text-sm text-neutral-500">
                    You cannot change your own role.
                  </p>
                )}
              </div>

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

      {modal === 'delete' && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-5 z-50">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 sm:p-7">
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
