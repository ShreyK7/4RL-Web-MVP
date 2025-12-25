"use client";

import { useState, useRef, useEffect } from "react";
import DeleteAccountModal from "./DeleteAccountModal";
import EditProfileModal from "./EditProfileModal";
import IncomingConnectionsModal from "./IncomingConnectionsModal";
import { logout } from "@/utils/supabase/auth";
import { profileData } from "@/utils/types/userDataTypes";
import { getIncomingConnectionRequestsCount } from "@/utils/supabase/connections";

interface UserMenuProps {
  userName: string;
  photoUrl?: string | null;
  profileData: profileData | null;
}

export default function UserMenu({ userName, photoUrl, profileData }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [displayName, setDisplayName] = useState(userName);
  const [displayPhoto, setDisplayPhoto] = useState<string | null | undefined>(photoUrl);
  const [requestCount, setRequestCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    async function fetchRequestCount() {
      try {
        const count = await getIncomingConnectionRequestsCount();
        setRequestCount(count);
      } catch (error) {
        console.error("Error fetching connection request count:", error);
      }
    }

    fetchRequestCount();
    // Refresh count periodically
    const interval = setInterval(fetchRequestCount, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 overflow-hidden"
          aria-label="User menu"
        >
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold">
              {displayName ? displayName.charAt(0).toUpperCase() : "U"}
            </span>
          )}
          {requestCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white shadow-sm">
              {requestCount > 99 ? "99+" : requestCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
            <div className="py-1">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowEditModal(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Settings
              </button>
              <button
                onClick={async () => {
                  setIsOpen(false);
                  // Refresh count when opening modal
                  try {
                    const count = await getIncomingConnectionRequestsCount();
                    setRequestCount(count);
                  } catch (error) {
                    console.error("Error fetching connection request count:", error);
                  }
                  setShowConnectionsModal(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <span>Connection Requests</span>
                {requestCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {requestCount > 99 ? "99+" : requestCount}
                  </span>
                )}
              </button>
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await logout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Log Out
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowDeleteModal(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => setShowDeleteModal(false)}
        />
      )}

      {showEditModal && (
        <EditProfileModal
          profileData={profileData}
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={(updatedProfile, newPhotoUrl) => {
            const nextName = updatedProfile
              ? `${updatedProfile.first_name ?? ""} ${updatedProfile.last_name ?? ""}`.trim() || displayName
              : displayName;
            setDisplayName(nextName);
            if (newPhotoUrl) {
              setDisplayPhoto(newPhotoUrl);
            }
            setShowEditModal(false);
          }}
        />
      )}

      {showConnectionsModal && (
        <IncomingConnectionsModal 
          onClose={() => {
            setShowConnectionsModal(false);
            // Refresh count when modal closes
            getIncomingConnectionRequestsCount().then(setRequestCount).catch(console.error);
          }}
          onRequestHandled={() => {
            // Refresh count when a request is handled
            getIncomingConnectionRequestsCount().then(setRequestCount).catch(console.error);
          }}
        />
      )}
    </>
  );
}

