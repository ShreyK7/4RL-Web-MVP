"use client";

interface DropToggleButtonProps {
  droppedIn: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

export default function DropToggleButton({ droppedIn, disabled = false, isLoading = false, onClick }: DropToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 px-6 text-lg font-semibold rounded-2xl bg-gradient-to-r ${
        droppedIn ? "from-rose-500 to-amber-500" : "from-blue-600 to-indigo-600"
      } text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {isLoading ? "Updating..." : droppedIn ? "Drop Out" : "Drop In"}
    </button>
  );
}

