import { themeClasses } from "@/utils/theme";
import { useState } from "react";

interface AboutMeFormProps {
  onNext: (aboutMe: string) => void;
}

export default function AboutMeForm({ onNext }: AboutMeFormProps) {
  const [aboutMe, setAboutMe] = useState("");
  const maxLength = 150;
  const remainingChars = maxLength - aboutMe.length;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (aboutMe.trim().length === 0) {
      return;
    }
    onNext(aboutMe);
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <p className={`${themeClasses.text.secondary} mb-6 text-center`}>
        Share a bit about yourself
      </p>
      <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit} id="aboutMeForm">
        <div className="relative">
          <textarea
            name="aboutMe"
            placeholder="About me..."
            maxLength={maxLength}
            required
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            rows={5}
            className={`${themeClasses.input.base} resize-none`}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {remainingChars} characters remaining
          </div>
        </div>
      </form>
      <button
        type="submit"
        form="aboutMeForm"
        disabled={aboutMe.trim().length === 0}
        className={`mt-6 ${themeClasses.button.primarySmall} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Continue
      </button>
    </div>
  );
}

