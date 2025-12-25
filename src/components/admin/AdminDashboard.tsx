"use client";

import { useState, useEffect } from "react";
import { createTestUser, deleteUser, generateRandomPhoneNumber, generateRandomProfileData, generateRandomUSCoordinates, createConnection, bulkCreateRandomUsers, bulkCreateRandomUsersNearby } from "@/utils/supabase/admin";
import { getAllUsersOptimized } from "@/utils/supabase/optimizedAdmin";
import { profileData, Pronouns } from "@/utils/types/userDataTypes";
import { themeClasses } from "@/utils/theme";
import { createClient } from "@/utils/supabase/browserClient";
import { useRouter } from "next/navigation";

interface User {
  user_id: string;
  email: string | null;
  phone: string | null;
  profile_data: profileData | null;
  onboarding_complete: boolean;
  dropped_in: boolean;
  user_latitude: number | null;
  user_longitude: number | null;
  connections_active: string[];
  connections_pending: string[];
  connections_incoming: string[];
  connections_blocked: string[];
  dummy_user: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [connectingUser, setConnectingUser] = useState<string | null>(null);
  const [selectedTargetUser, setSelectedTargetUser] = useState<string>("");
  const [bulkCount, setBulkCount] = useState<string>("10");
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkCreateNearby, setBulkCreateNearby] = useState(false);
  const [showDummyUsers, setShowDummyUsers] = useState(true);

  // Create user form state
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    age: "",
    pronouns: "" as Pronouns,
    hometown: "",
    baseCity: "",
    about: "",
    interests: "",
    onboardingComplete: true,
    droppedIn: false,
    latitude: "",
    longitude: "",
  });


  async function loadUsers() {
    try {
      setLoading(true);
      const allUsers = await getAllUsersOptimized();
      // Filter dummy users based on toggle
      const filteredUsers = showDummyUsers 
        ? allUsers 
        : allUsers.filter((user) => !user.dummy_user);
      setUsers(filteredUsers);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [showDummyUsers]);

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const interests = formData.interests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const profileData: profileData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        age: parseInt(formData.age) || 0,
        pronouns: formData.pronouns,
        hometown: formData.hometown,
        baseCity: formData.baseCity,
        about: formData.about,
        interests,
      };

      await createTestUser(
        formData.email || null,
        formData.phone,
        profileData,
        {
          onboardingComplete: formData.onboardingComplete,
          droppedIn: formData.droppedIn,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        }
      );

      // Reset form
      setFormData({
        email: "",
        phone: "",
        firstName: "",
        lastName: "",
        age: "",
        pronouns: "",
        hometown: "",
        baseCity: "",
        about: "",
        interests: "",
        onboardingComplete: true,
        droppedIn: false,
        latitude: "",
        longitude: "",
      });
      setShowCreateForm(false);
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to create user");
      console.error("Error creating user:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to delete user");
      console.error("Error deleting user:", err);
    }
  }

  async function handleLogout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function handleGenerateRandomPhone() {
    const randomPhone = await generateRandomPhoneNumber();
    setFormData({ ...formData, phone: randomPhone });
  }

  async function handleGenerateAllRandom() {
    const [randomProfile, randomPhone, randomCoords] = await Promise.all([
      generateRandomProfileData(),
      generateRandomPhoneNumber(),
      generateRandomUSCoordinates(),
    ]);
    setFormData({
      email: "",
      phone: randomPhone,
      firstName: String(randomProfile.first_name),
      lastName: String(randomProfile.last_name),
      age: String(randomProfile.age),
      pronouns: randomProfile.pronouns,
      hometown: String(randomProfile.hometown),
      baseCity: String(randomProfile.baseCity),
      about: String(randomProfile.about),
      interests: randomProfile.interests.join(", "),
      onboardingComplete: true,
      droppedIn: false,
      latitude: String(randomCoords.latitude),
      longitude: String(randomCoords.longitude),
    });
  }

  async function handleBulkCreate() {
    const count = parseInt(bulkCount);
    if (isNaN(count) || count < 1 || count > 1000) {
      setError("Please enter a number between 1 and 1000");
      return;
    }

    setBulkCreating(true);
    setError(null);

    try {
      const result = bulkCreateNearby
        ? await bulkCreateRandomUsersNearby(count)
        : await bulkCreateRandomUsers(count);
      await loadUsers();
      if (result.errors && result.errors.length > 0) {
        setError(`Created ${result.created} users. ${result.errors.length} errors occurred.`);
        console.error("Bulk create errors:", result.errors);
      } else {
        setError(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create users");
      console.error("Error bulk creating users:", err);
    } finally {
      setBulkCreating(false);
    }
  }

  async function handleCreateConnection(userId1: string, userId2: string) {
    try {
      setError(null);
      await createConnection(userId1, userId2);
      await loadUsers();
      setConnectingUser(null);
      setSelectedTargetUser("");
    } catch (err: any) {
      setError(err?.message || "Failed to create connection");
      console.error("Error creating connection:", err);
    }
  }

  function handleConnectClick(userId: string) {
    setConnectingUser(userId);
    setSelectedTargetUser("");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`${themeClasses.text.headingLarge} ${themeClasses.text.primary}`}>
              Admin Dashboard
            </h1>
            <p className={`mt-2 ${themeClasses.text.bodyMedium} ${themeClasses.text.secondary}`}>
              Manage users and create test accounts
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="1000"
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                placeholder="10"
                disabled={bulkCreating}
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={bulkCreateNearby}
                  onChange={(e) => setBulkCreateNearby(e.target.checked)}
                  disabled={bulkCreating}
                  className="rounded border-gray-300"
                />
                <span>Within 10 miles</span>
              </label>
              <button
                onClick={handleBulkCreate}
                disabled={bulkCreating}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkCreating ? "Creating..." : "Bulk Create"}
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showDummyUsers}
                onChange={(e) => setShowDummyUsers(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Show Dummy Users</span>
            </label>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`${themeClasses.button.primarySmall}`}
            >
              {showCreateForm ? "Cancel" : "Create Test User"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className={`${themeClasses.text.headingSmall} ${themeClasses.text.primary} mb-4`}>
              Create Test User
            </h2>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={handleGenerateRandomPhone}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Generate Random Phone
              </button>
              <button
                type="button"
                onClick={handleGenerateAllRandom}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Generate All Random
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={themeClasses.input.base}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+11234567890"
                      className={themeClasses.input.base}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateRandomPhone}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Random
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={themeClasses.input.base}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={themeClasses.input.base}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className={themeClasses.input.base}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pronouns *</label>
                  <select
                    required
                    value={formData.pronouns}
                    onChange={(e) => setFormData({ ...formData, pronouns: e.target.value as Pronouns })}
                    className={themeClasses.input.base}
                  >
                    <option value="">Select pronouns</option>
                    <option value="he/him/his">he/him/his</option>
                    <option value="she/her/hers">she/her/hers</option>
                    <option value="they/them/theirs">they/them/theirs</option>
                    <option value="other">other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hometown *</label>
                  <input
                    type="text"
                    required
                    value={formData.hometown}
                    onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                    className={themeClasses.input.base}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base City *</label>
                  <input
                    type="text"
                    required
                    value={formData.baseCity}
                    onChange={(e) => setFormData({ ...formData, baseCity: e.target.value })}
                    className={themeClasses.input.base}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
                  <textarea
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    rows={3}
                    className={themeClasses.input.base}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interests (comma separated)</label>
                  <input
                    type="text"
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    placeholder="hiking, reading, music"
                    className={themeClasses.input.base}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className={themeClasses.input.base}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className={themeClasses.input.base}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.onboardingComplete}
                      onChange={(e) => setFormData({ ...formData, onboardingComplete: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Onboarding Complete</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.droppedIn}
                      onChange={(e) => setFormData({ ...formData, droppedIn: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Dropped In</span>
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={creating}
                className={`${themeClasses.button.primarySmall} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className={`${themeClasses.text.headingSmall} ${themeClasses.text.primary}`}>
              All Users ({users.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email / Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connections
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {user.user_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{user.email || "—"}</div>
                      <div className="text-xs text-gray-500">{user.phone || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>
                          {user.profile_data
                            ? `${user.profile_data.first_name} ${user.profile_data.last_name}`
                            : "—"}
                        </span>
                        {user.dummy_user && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                            Test
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.profile_data?.age ? String(user.profile_data.age) : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.profile_data?.baseCity || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.onboarding_complete
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {user.onboarding_complete ? "Onboarded" : "Pending"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.dropped_in ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.dropped_in ? "Dropped In" : "Dropped Out"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col gap-1 text-xs">
                        <span>Active: {user.connections_active.length}</span>
                        <span>Pending: {user.connections_pending.length}</span>
                        <span>Incoming: {user.connections_incoming.length}</span>
                        <span>Blocked: {user.connections_blocked.length}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col gap-2">
                        {connectingUser === user.user_id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <select
                              value={selectedTargetUser}
                              onChange={(e) => setSelectedTargetUser(e.target.value)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              <option value="">Select user to connect...</option>
                              {users
                                .filter((u) => u.user_id !== user.user_id && !user.connections_active.includes(u.user_id))
                                .map((targetUser) => (
                                  <option key={targetUser.user_id} value={targetUser.user_id}>
                                    {targetUser.profile_data
                                      ? `${targetUser.profile_data.first_name} ${targetUser.profile_data.last_name}`
                                      : targetUser.user_id.substring(0, 8)}
                                  </option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (selectedTargetUser) {
                                    handleCreateConnection(user.user_id, selectedTargetUser);
                                  }
                                }}
                                disabled={!selectedTargetUser}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Connect
                              </button>
                              <button
                                onClick={() => {
                                  setConnectingUser(null);
                                  setSelectedTargetUser("");
                                }}
                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleConnectClick(user.user_id)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                            >
                              Connect
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.user_id)}
                              className="text-red-600 hover:text-red-800 font-medium text-xs"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

