"use client";

import { deleteCurrentUser } from "@/utils/supabase/auth";
import { useState } from "react";

interface DeleteAccountModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountModal({
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteCurrentUser();
      onConfirm();
    } catch (error) {
      console.error("Error deleting account:", error);
      setIsDeleting(false);
      // You might want to show an error message to the user here
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Delete Account
        </h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete your account? This action cannot be
          undone and all your data will be permanently deleted.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

