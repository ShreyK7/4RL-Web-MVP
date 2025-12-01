"use client";

import { useState, useRef, useEffect } from "react";
import DeleteAccountModal from "./DeleteAccountModal";
import { logout } from "@/utils/supabase/auth";

interface UserMenuProps {
  userName: string;
}

export default function UserMenu({ userName }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
          aria-label="User menu"
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
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
            <div className="py-1">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Settings functionality to be implemented later
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Settings
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
    </>
  );
}

