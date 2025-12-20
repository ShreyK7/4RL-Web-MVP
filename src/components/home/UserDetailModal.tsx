"use client";

import { useState, useEffect } from "react";
import { profileData } from "@/utils/types/userDataTypes";
import { getProfilePhotoUrl } from "@/utils/supabase/lib";

interface UserDetailModalProps {
  user: {
    user_id: string;
    profile_data: profileData;
    distance?: number;
    photoUrl?: string | null;
  };
  onClose: () => void;
}

export default function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(user.photoUrl || null);
  
  useEffect(() => {
    // If photoUrl wasn't passed, fetch it
    if (!photoUrl) {
      getProfilePhotoUrl(user.user_id).then(setPhotoUrl);
    }
  }, [user.user_id, photoUrl]);

  const firstName = user.profile_data?.first_name ? String(user.profile_data.first_name) : "";
  const lastName = user.profile_data?.last_name ? String(user.profile_data.last_name) : "";
  const fullName = `${firstName} ${lastName}`.trim() || "User";
  const age = user.profile_data?.age ? Number(user.profile_data.age) : null;
  const pronouns = user.profile_data?.pronouns || "";
  const about = user.profile_data?.about ? String(user.profile_data.about) : "";
  const hometown = user.profile_data?.hometown ? String(user.profile_data.hometown) : "";
  const baseCity = user.profile_data?.baseCity ? String(user.profile_data.baseCity) : "";
  const interests = user.profile_data?.interests || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{fullName}</h2>
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

          <div className="space-y-6">
            {/* Profile Photo */}
            <div className="flex justify-center">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="h-32 w-32 rounded-full object-cover"
                />
              ) : (
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-4xl font-semibold">
                  {firstName[0] || "U"}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              {age && (
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="text-lg font-semibold text-gray-900">{age}</p>
                </div>
              )}
              {pronouns && (
                <div>
                  <p className="text-sm text-gray-500">Pronouns</p>
                  <p className="text-lg font-semibold text-gray-900">{pronouns}</p>
                </div>
              )}
              {hometown && (
                <div>
                  <p className="text-sm text-gray-500">Hometown</p>
                  <p className="text-lg font-semibold text-gray-900">{hometown}</p>
                </div>
              )}
              {baseCity && (
                <div>
                  <p className="text-sm text-gray-500">Base City</p>
                  <p className="text-lg font-semibold text-gray-900">{baseCity}</p>
                </div>
              )}
            </div>

            {/* Distance */}
            {user.distance !== undefined && (
              <div>
                <p className="text-sm text-gray-500">Distance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.distance.toFixed(1)} miles away
                </p>
              </div>
            )}

            {/* About */}
            {about && (
              <div>
                <p className="text-sm text-gray-500 mb-2">About</p>
                <p className="text-gray-900">{about}</p>
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium"
                    >
                      {String(interest)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Request to Connect Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  // Non-functional for now
                  console.log("Request to connect with", user.user_id);
                }}
                className="w-full py-3 px-6 text-lg font-semibold rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Request to Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

