"use client";

import { useState, useEffect } from "react";
import { themeClasses } from "@/utils/theme";
import { getActiveConnections, removeConnection } from "@/utils/supabase/connections";
import { getProfilePhotoUrl } from "@/utils/supabase/profile";
import { profileData } from "@/utils/types/userDataTypes";
import UserDetailModal from "./UserDetailModal";

interface ActiveConnection {
  user_id: string;
  profile_data: profileData;
  photoUrl?: string | null;
}

export default function ConnectionsPanel() {
  const [connections, setConnections] = useState<ActiveConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ActiveConnection | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const users = await getActiveConnections();
        
        // Fetch photos for all connections
        const usersWithPhotos = await Promise.all(
          users.map(async (user) => {
            const photoUrl = await getProfilePhotoUrl(user.user_id);
            return { ...user, photoUrl };
          })
        );

        setConnections(usersWithPhotos);
      } catch (error) {
        console.error("Error fetching active connections:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchConnections();
  }, []);

  async function handleRemoveConnection(userId: string) {
    if (!confirm("Are you sure you want to remove this connection?")) {
      return;
    }

    setRemoving(userId);
    try {
      await removeConnection(userId);
      setConnections((prev) => prev.filter((conn) => conn.user_id !== userId));
    } catch (error) {
      console.error("Error removing connection:", error);
      alert("Failed to remove connection");
    } finally {
      setRemoving(null);
    }
  }

  const firstName = (user: ActiveConnection) => {
    return user.profile_data?.first_name ? String(user.profile_data.first_name) : "User";
  };

  const lastName = (user: ActiveConnection) => {
    return user.profile_data?.last_name ? String(user.profile_data.last_name) : "";
  };

  const fullName = (user: ActiveConnection) => {
    const first = firstName(user);
    const last = lastName(user);
    return `${first} ${last}`.trim();
  };

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-8 shadow-sm space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className={`${themeClasses.text.headingSmall} ${themeClasses.text.primary}`}>
            Your connections
          </h2>
          <p className={`${themeClasses.text.secondary}`}>
            Drop back in to see who else is out and about. For now, keep tabs on your connections.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading connections...</p>
        ) : connections.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No active connections yet</p>
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => (
              <div
                key={connection.user_id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition"
              >
                <div 
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => setSelectedUser(connection)}
                >
                  {connection.photoUrl ? (
                    <img
                      src={connection.photoUrl}
                      alt={fullName(connection)}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-semibold">
                      {firstName(connection)[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{fullName(connection)}</p>
                    {connection.profile_data?.baseCity && (
                      <p className="text-sm text-gray-500">
                        {String(connection.profile_data.baseCity)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveConnection(connection.user_id);
                  }}
                  disabled={removing === connection.user_id}
                  className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removing === connection.user_id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
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
