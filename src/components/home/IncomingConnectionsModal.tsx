"use client";

import { useState, useEffect } from "react";
import { profileData } from "@/utils/types/userDataTypes";
import {
  getIncomingConnectionRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  blockConnectionRequest,
} from "@/utils/supabase/connections";
import { getProfilePhotoUrl } from "@/utils/supabase/profile";
import UserDetailModal from "./UserDetailModal";

interface IncomingConnectionsModalProps {
  onClose: () => void;
  onRequestHandled?: () => void;
}

interface ConnectionRequestUser {
  user_id: string;
  profile_data: profileData;
  photoUrl?: string | null;
}

export default function IncomingConnectionsModal({ onClose, onRequestHandled }: IncomingConnectionsModalProps) {
  const [requests, setRequests] = useState<ConnectionRequestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ConnectionRequestUser | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const users = await getIncomingConnectionRequests();
        
        // Fetch photos for all users
        const usersWithPhotos = await Promise.all(
          users.map(async (user) => {
            const photoUrl = await getProfilePhotoUrl(user.user_id);
            return { ...user, photoUrl };
          })
        );

        setRequests(usersWithPhotos);
      } catch (error) {
        console.error("Error fetching connection requests:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, []);

  async function handleAccept(userId: string) {
    setProcessing(userId);
    try {
      await acceptConnectionRequest(userId);
      setRequests((prev) => prev.filter((req) => req.user_id !== userId));
      onRequestHandled?.();
    } catch (error) {
      console.error("Error accepting connection request:", error);
      alert("Failed to accept connection request");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(userId: string) {
    setProcessing(userId);
    try {
      await rejectConnectionRequest(userId);
      setRequests((prev) => prev.filter((req) => req.user_id !== userId));
      onRequestHandled?.();
    } catch (error) {
      console.error("Error rejecting connection request:", error);
      alert("Failed to reject connection request");
    } finally {
      setProcessing(null);
    }
  }

  async function handleBlock(userId: string) {
    if (!confirm("Are you sure you want to block this user? This action cannot be undone.")) {
      return;
    }
    setProcessing(userId);
    try {
      await blockConnectionRequest(userId);
      setRequests((prev) => prev.filter((req) => req.user_id !== userId));
      onRequestHandled?.();
    } catch (error) {
      console.error("Error blocking connection request:", error);
      alert("Failed to block user");
    } finally {
      setProcessing(null);
    }
  }

  const firstName = (user: ConnectionRequestUser) => {
    return user.profile_data?.first_name ? String(user.profile_data.first_name) : "User";
  };

  const lastName = (user: ConnectionRequestUser) => {
    return user.profile_data?.last_name ? String(user.profile_data.last_name) : "";
  };

  const fullName = (user: ConnectionRequestUser) => {
    const first = firstName(user);
    const last = lastName(user);
    return `${first} ${last}`.trim();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Connection Requests</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading requests...</p>
            ) : requests.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No incoming connection requests</p>
            ) : (
              <div className="space-y-4">
                {requests.map((user) => (
                  <div
                    key={user.user_id}
                    className="rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={fullName(user)}
                          className="h-16 w-16 rounded-full object-cover cursor-pointer"
                          onClick={() => setSelectedUser(user)}
                        />
                      ) : (
                        <div
                          className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-semibold text-xl cursor-pointer"
                          onClick={() => setSelectedUser(user)}
                        >
                          {firstName(user)[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <p
                          className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => setSelectedUser(user)}
                        >
                          {fullName(user)}
                        </p>
                        {user.profile_data?.baseCity && (
                          <p className="text-sm text-gray-500">
                            {String(user.profile_data.baseCity)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(user.user_id)}
                        disabled={processing === user.user_id}
                        className="flex-1 py-2 px-4 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === user.user_id ? "Processing..." : "Accept"}
                      </button>
                      <button
                        onClick={() => handleReject(user.user_id)}
                        disabled={processing === user.user_id}
                        className="flex-1 py-2 px-4 text-sm font-semibold rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleBlock(user.user_id)}
                        disabled={processing === user.user_id}
                        className="flex-1 py-2 px-4 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Block
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
}

