"use client";

import { useState, useEffect } from "react";
import { themeClasses } from "@/utils/theme";
import { getDroppedInUsers, getCurrentUserLocation, calculateDistance, getProfilePhotoUrl, getConnectionStatus, type UserSearchResult } from "@/utils/supabase/lib";
import { profileData } from "@/utils/types/userDataTypes";
import UserDetailModal from "./UserDetailModal";

interface DroppedInSearchSectionProps {
  currentUserInterests: string[];
}

export default function DroppedInSearchSection({ currentUserInterests }: DroppedInSearchSectionProps) {
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  
  // Filters
  const [ageFilter, setAgeFilter] = useState<string>("");
  const [interestFilter, setInterestFilter] = useState<string>("");
  const [baseCityFilter, setBaseCityFilter] = useState<string>("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const [usersData, currentLocation] = await Promise.all([
          getDroppedInUsers(),
          getCurrentUserLocation(),
        ]);

        // Calculate distances, fetch photos, and check connection status for each user
        const usersWithDistance = await Promise.all(
          usersData.map(async (user) => {
            const [distance, photoUrl, connectionStatus] = await Promise.all([
              currentLocation.latitude &&
              currentLocation.longitude &&
              user.user_latitude &&
              user.user_longitude
                ? calculateDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    user.user_latitude,
                    user.user_longitude
                  )
                : Promise.resolve(undefined),
              getProfilePhotoUrl(user.user_id),
              getConnectionStatus(user.user_id),
            ]);

            return { ...user, distance, photoUrl, connectionStatus };
          })
        );

        // Filter out connected, pending, and blocked users, and remove connectionStatus from objects
        const availableUsers = usersWithDistance
          .filter((user) => user.connectionStatus === "none")
          .map(({ connectionStatus, ...user }) => user);

        // Sort by distance (closest first)
        availableUsers.sort((a, b) => {
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });

        setUsers(availableUsers);
        setFilteredUsers(availableUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = [...users];

    // Filter by age
    if (ageFilter) {
      const age = parseInt(ageFilter);
      filtered = filtered.filter((user) => {
        const userAge = user.profile_data?.age ? Number(user.profile_data.age) : null;
        return userAge === age;
      });
    }

    // Filter by interest
    if (interestFilter) {
      filtered = filtered.filter((user) => {
        const interests = user.profile_data?.interests || [];
        return interests.some((interest) => String(interest).toLowerCase() === interestFilter.toLowerCase());
      });
    }

    // Filter by base city
    if (baseCityFilter) {
      filtered = filtered.filter((user) => {
        const baseCity = user.profile_data?.baseCity ? String(user.profile_data.baseCity) : "";
        return baseCity.toLowerCase().includes(baseCityFilter.toLowerCase());
      });
    }

    setFilteredUsers(filtered);
  }, [ageFilter, interestFilter, baseCityFilter, users]);

  const firstName = (user: UserSearchResult) => {
    return user.profile_data?.first_name ? String(user.profile_data.first_name) : "User";
  };

  const lastName = (user: UserSearchResult) => {
    return user.profile_data?.last_name ? String(user.profile_data.last_name) : "";
  };

  const fullName = (user: UserSearchResult) => {
    const first = firstName(user);
    const last = lastName(user);
    return `${first} ${last}`.trim();
  };

  // Get unique ages and base cities from users
  const availableAges = Array.from(
    new Set(
      users
        .map((u) => u.profile_data?.age)
        .filter((age): age is number => age !== undefined && age !== null)
        .map((age) => Number(age))
    )
  ).sort((a, b) => a - b);

  const availableCities = Array.from(
    new Set(
      users
        .map((u) => u.profile_data?.baseCity)
        .filter((city): city is string => city !== undefined && city !== null)
        .map((city) => String(city))
    )
  ).sort();

  if (loading) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-8 shadow-sm">
        <p className="text-center text-gray-500">Loading users...</p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-8 shadow-sm space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className={`${themeClasses.text.headingSmall} ${themeClasses.text.primary}`}>
            Explore who's active
          </h2>
          <p className={`${themeClasses.text.secondary}`}>
            Search and filter people who are currently dropped in.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Age Filter */}
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className={`${themeClasses.input.base} w-full`}
            >
              <option value="">All Ages</option>
              {availableAges.map((age) => (
                <option key={age} value={age.toString()}>
                  {age}
                </option>
              ))}
            </select>

            {/* Interest Filter */}
            <select
              value={interestFilter}
              onChange={(e) => setInterestFilter(e.target.value)}
              className={`${themeClasses.input.base} w-full`}
            >
              <option value="">All Interests</option>
              {currentUserInterests.map((interest) => (
                <option key={interest} value={interest}>
                  {interest}
                </option>
              ))}
            </select>

            {/* Base City Filter */}
            <select
              value={baseCityFilter}
              onChange={(e) => setBaseCityFilter(e.target.value)}
              className={`${themeClasses.input.base} w-full`}
            >
              <option value="">All Cities</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(ageFilter || interestFilter || baseCityFilter) && (
            <button
              onClick={() => {
                setAgeFilter("");
                setInterestFilter("");
                setBaseCityFilter("");
              }}
              className="px-5 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {(ageFilter || interestFilter || baseCityFilter) && (
          <div className="flex flex-wrap gap-3">
            {ageFilter && (
              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                Age: {ageFilter}
              </span>
            )}
            {interestFilter && (
              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                Interest: {interestFilter}
              </span>
            )}
            {baseCityFilter && (
              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                City: {baseCityFilter}
              </span>
            )}
          </div>
        )}

        {/* Users List */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredUsers.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No users found matching your filters.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.user_id}
                onClick={() => setSelectedUser(user)}
                className="rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:border-blue-200 transition cursor-pointer"
              >
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={fullName(user)}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-semibold text-lg">
                    {firstName(user)[0]}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{fullName(user)}</p>
                  {user.distance !== undefined && (
                    <p className="text-sm text-gray-500">
                      {user.distance.toFixed(1)} miles away
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
}
