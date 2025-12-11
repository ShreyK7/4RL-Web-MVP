"use client";

import { useState } from "react";
import { profileData } from "@/utils/types/userDataTypes";
import { updateProfileDataClient } from "@/utils/supabase/updateProfileData";
import { uploadProfilePhoto } from "@/utils/supabase/uploadProfilePhoto";

interface EditProfileModalProps {
  profileData: profileData | null;
  onClose: () => void;
  onProfileUpdated: (data: profileData | null, photoUrl?: string) => void;
}

export default function EditProfileModal({
  profileData,
  onClose,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(profileData?.first_name?.toString() ?? "");
  const [lastName, setLastName] = useState(profileData?.last_name?.toString() ?? "");
  const [hometown, setHometown] = useState(profileData?.hometown?.toString() ?? "");
  const [baseCity, setBaseCity] = useState(profileData?.baseCity?.toString() ?? "");
  const [age, setAge] = useState(profileData?.age ? Number(profileData.age).toString() : "");
  const [pronouns, setPronouns] = useState(profileData?.pronouns ?? "");
  const [aboutMe, setAboutMe] = useState(profileData?.about?.toString() ?? "");
  const [interestsInput, setInterestsInput] = useState(
    profileData?.interests ? profileData.interests.join(", ") : ""
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const interests = interestsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const updatedProfile: profileData = {
        first_name: firstName,
        last_name: lastName,
        hometown,
        baseCity,
        age: Number(age) || 0,
        pronouns,
        about: aboutMe,
        interests,
      };

      await updateProfileDataClient(updatedProfile);

      let newPhotoUrl: string | undefined;
      if (photoFile) {
        await uploadProfilePhoto(photoFile);
        // For immediate UI update, use a local preview URL
        newPhotoUrl = URL.createObjectURL(photoFile);
      }

      onProfileUpdated(updatedProfile, newPhotoUrl);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setErrorMessage(error?.message ?? "Failed to update profile");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hometown</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Base City</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={baseCity}
                onChange={(e) => setBaseCity(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              <input
                type="number"
                min="13"
                max="120"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pronouns</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value as profileData["pronouns"])}
                required
              >
                <option value="">Select pronouns</option>
                <option value="he/him/his">he/him/his</option>
                <option value="she/her/hers">she/her/hers</option>
                <option value="they/them/theirs">they/them/theirs</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">About Me</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Interests (comma separated)</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={interestsInput}
              onChange={(e) => setInterestsInput(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Change Profile Photo</label>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Selected preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400 text-center px-2">No photo</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setPhotoFile(file);
                      if (file) {
                        setPhotoPreview(URL.createObjectURL(file));
                      } else {
                        setPhotoPreview(null);
                      }
                    }}
                  />
                  Choose Photo
                </label>
                <span className="text-xs text-gray-500">
                  {photoFile ? photoFile.name : "PNG, JPG up to your plan limits"}
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

