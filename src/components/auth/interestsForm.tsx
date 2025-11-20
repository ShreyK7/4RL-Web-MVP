import { themeClasses } from "@/utils/theme";
import { useState } from "react";

interface InterestsFormProps {
  onNext: (interests: string[]) => void;
}

export default function InterestsForm({ onNext }: InterestsFormProps) {
  const [interests, setInterests] = useState<string[]>([]);
  const [currentInterest, setCurrentInterest] = useState("");

  const minInterests = 4;
  const maxInterests = 16;
  const canAddMore = interests.length < maxInterests;
  const canSubmit = interests.length >= minInterests && interests.length <= maxInterests;

  function handleAddInterest(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = currentInterest.trim();
    if (trimmed && !interests.includes(trimmed) && canAddMore) {
      setInterests([...interests, trimmed]);
      setCurrentInterest("");
    }
  }

  function handleRemoveInterest(interestToRemove: string) {
    setInterests(interests.filter((interest) => interest !== interestToRemove));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (canSubmit) {
      onNext(interests);
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <p className={`${themeClasses.text.secondary} mb-2 text-center`}>
        Add your interests ({minInterests}-{maxInterests})
      </p>
      <p className={`${themeClasses.text.secondary} mb-6 text-sm text-center`}>
        {interests.length} of {maxInterests} added
      </p>
      
      <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit} id="interestsForm">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add an interest"
            value={currentInterest}
            onChange={(e) => setCurrentInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddInterest(e);
              }
            }}
            disabled={!canAddMore}
            className={`${themeClasses.input.base} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <button
            type="button"
            onClick={handleAddInterest}
            disabled={!currentInterest.trim() || !canAddMore}
            className={`px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Add
          </button>
        </div>

        {interests.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {interests.map((interest, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(interest)}
                  className="hover:text-blue-900 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {!canSubmit && interests.length > 0 && (
          <p className={`text-sm ${interests.length < minInterests ? themeClasses.text.secondary : "text-orange-600"}`}>
            {interests.length < minInterests
              ? `Add at least ${minInterests - interests.length} more interest${minInterests - interests.length > 1 ? "s" : ""}`
              : `You've reached the maximum of ${maxInterests} interests`}
          </p>
        )}
      </form>

      <button
        type="submit"
        form="interestsForm"
        disabled={!canSubmit}
        className={`mt-6 ${themeClasses.button.primarySmall} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Continue
      </button>
    </div>
  );
}

