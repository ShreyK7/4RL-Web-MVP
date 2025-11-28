"use client";

import { useFormStatus } from "react-dom";

interface DropToggleButtonProps {
  droppedIn: boolean;
}

export default function DropToggleButton({ droppedIn }: DropToggleButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full py-4 px-6 text-lg font-semibold rounded-2xl bg-gradient-to-r ${
        droppedIn ? "from-rose-500 to-amber-500" : "from-blue-600 to-indigo-600"
      } text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {pending ? "Updating..." : droppedIn ? "Drop Out" : "Drop In"}
    </button>
  );
}

