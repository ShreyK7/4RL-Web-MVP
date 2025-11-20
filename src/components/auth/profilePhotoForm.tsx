import { themeClasses } from "@/utils/theme";
import { useState } from "react";

interface ProfilePhotoFormProps {
  onComplete: () => void;
}

export default function ProfilePhotoForm({ onComplete }: ProfilePhotoFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Profile photo handling would go here (not saving to state as per requirements)
    // For now, just complete the form
    onComplete();
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <p className={`${themeClasses.text.secondary} mb-6 text-center`}>
        Add a profile photo
      </p>
      <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit} id="profilePhotoForm">
        <div className="flex flex-col items-center gap-4">
          {preview ? (
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200">
              <img
                src={preview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
              <span className="text-gray-400 text-4xl">📷</span>
            </div>
          )}
          
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className={`${themeClasses.button.primarySmall} inline-block text-center`}>
              {selectedFile ? "Change Photo" : "Choose Photo"}
            </span>
          </label>
        </div>
      </form>
      <button
        type="submit"
        form="profilePhotoForm"
        className={`mt-6 ${themeClasses.button.primarySmall}`}
      >
        Complete
      </button>
    </div>
  );
}

