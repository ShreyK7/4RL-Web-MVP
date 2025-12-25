"use client";

import { useState, useEffect } from "react";
import { themeClasses } from "@/utils/theme";
import { getDroppedInUsers, type UserSearchResult } from "@/utils/supabase/userSearch";
import { getCurrentUserLocation, calculateDistance } from "@/utils/supabase/location";
import { getProfilePhotoUrl } from "@/utils/supabase/profile";
import { getConnectionStatus } from "@/utils/supabase/connections";
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
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [interestFilter, setInterestFilter] = useState<string>("");
  const [baseCityFilter, setBaseCityFilter] = useState<string>("");
  const [distanceMax, setDistanceMax] = useState<string>("");
  
  // Autocomplete states
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [showInterestSuggestions, setShowInterestSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

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

        // Extract all unique interests and cities for autocomplete
        const uniqueInterests = Array.from(
          new Set(
            availableUsers
              .flatMap((u) => u.profile_data?.interests || [])
              .map((interest) => String(interest).toLowerCase())
          )
        ).sort();

        const uniqueCities = Array.from(
          new Set(
            availableUsers
              .map((u) => u.profile_data?.baseCity)
              .filter((city): city is string => city !== undefined && city !== null)
              .map((city) => String(city))
          )
        ).sort();

        setAllInterests(uniqueInterests);
        setAllCities(uniqueCities);

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

    // Filter by age range
    if (ageMin || ageMax) {
      filtered = filtered.filter((user) => {
        const userAge = user.profile_data?.age ? Number(user.profile_data.age) : null;
        if (userAge === null) return false;
        const min = ageMin ? parseInt(ageMin) : 0;
        const max = ageMax ? parseInt(ageMax) : 1000;
        return userAge >= min && userAge <= max;
      });
    }

    // Filter by interest
    if (interestFilter) {
      filtered = filtered.filter((user) => {
        const interests = user.profile_data?.interests || [];
        return interests.some((interest) => 
          String(interest).toLowerCase().includes(interestFilter.toLowerCase())
        );
      });
    }

    // Filter by base city
    if (baseCityFilter) {
      filtered = filtered.filter((user) => {
        const baseCity = user.profile_data?.baseCity ? String(user.profile_data.baseCity) : "";
        return baseCity.toLowerCase().includes(baseCityFilter.toLowerCase());
      });
    }

    // Filter by distance
    if (distanceMax) {
      const maxDist = parseInt(distanceMax);
      if (!isNaN(maxDist)) {
        filtered = filtered.filter((user) => {
          if (user.distance === undefined) return false;
          return user.distance <= maxDist;
        });
      }
    }

    setFilteredUsers(filtered);
  }, [ageMin, ageMax, interestFilter, baseCityFilter, distanceMax, users]);

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
        <div className="space-y-6">
          {/* Age Range Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Min Age</label>
              <input
                type="number"
                min="0"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                placeholder="18"
                className={`${themeClasses.input.base} w-full`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Max Age</label>
              <input
                type="number"
                min="0"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                placeholder="100"
                className={`${themeClasses.input.base} w-full`}
              />
            </div>
          </div>

          {/* Distance Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Maximum Distance (miles)</label>
            <input
              type="number"
              min="0"
              max="10"
              value={distanceMax}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 10)) {
                  setDistanceMax(val);
                }
              }}
              placeholder="10"
              className={`${themeClasses.input.base} w-full`}
            />
            <p className="text-xs text-gray-500">Maximum: 10 miles</p>
          </div>

          {/* Interests Autocomplete */}
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-gray-700">Interests</label>
            <div className="relative">
              <input
                type="text"
                value={interestFilter}
                onChange={(e) => setInterestFilter(e.target.value)}
                onFocus={() => setShowInterestSuggestions(true)}
                onBlur={() => setTimeout(() => setShowInterestSuggestions(false), 200)}
                placeholder="Search interests..."
                className={`${themeClasses.input.base} w-full`}
              />
              {showInterestSuggestions && allInterests.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {allInterests.map((interest, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setInterestFilter(interest);
                        setShowInterestSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="text-sm text-gray-900 capitalize">{interest}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Base City Autocomplete */}
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-gray-700">Base City</label>
            <div className="relative">
              <input
                type="text"
                value={baseCityFilter}
                onChange={(e) => setBaseCityFilter(e.target.value)}
                onFocus={() => setShowCitySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                placeholder="Search cities..."
                className={`${themeClasses.input.base} w-full`}
              />
              {showCitySuggestions && allCities.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {allCities.map((city, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setBaseCityFilter(city);
                        setShowCitySuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="text-sm text-gray-900">{city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clear Filters */}
          {(ageMin || ageMax || interestFilter || baseCityFilter || distanceMax) && (
            <button
              onClick={() => {
                setAgeMin("");
                setAgeMax("");
                setInterestFilter("");
                setBaseCityFilter("");
                setDistanceMax("");
              }}
              className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {(ageMin || ageMax || interestFilter || baseCityFilter || distanceMax) && (
          <div className="flex flex-wrap gap-3">
            {(ageMin || ageMax) && (
              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                Age: {ageMin || "any"}-{ageMax || "any"}
              </span>
            )}
            {interestFilter && (
              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                Interests: {interestFilter}
              </span>
            )}
            {baseCityFilter && (
              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                City: {baseCityFilter}
              </span>
            )}
            {distanceMax && (
              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                Within {distanceMax} miles
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
