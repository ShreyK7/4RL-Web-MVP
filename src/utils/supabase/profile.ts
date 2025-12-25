"use server"
import { createClient } from "./serverClient";
import { profileData } from "../types/userDataTypes";
import { getCurrentUserID } from "./common";

export async function getProfileData() {
  const supabase = await createClient();
  const userID = await getCurrentUserID();

  const { data, error } = await supabase
    .from("user_info")
    .select("profile_data")
    .eq("user_id", userID)
    .single();

  if (error) {
    // If the row doesn't exist, return null
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data?.profile_data as profileData | null;
}

function validateProfileData(data: profileData) {
  if (!data.first_name || !data.last_name || !data.age || !data.pronouns || !data.hometown || !data.baseCity) {
    throw new Error("Missing required profile fields: first_name, last_name, age, pronouns, hometown, and baseCity are required");
  }
  if (typeof data.age !== "number" || data.age < 0) {
    throw new Error("Age must be a positive number");
  }
  if (!Array.isArray(data.interests)) {
    throw new Error("Interests must be an array");
  }
}

export async function uploadProfileData(data: profileData) {
  validateProfileData(data);
  const supabase = await createClient();
  const userID = await getCurrentUserID();

  const { error } = await supabase
    .from("user_info")
    .upsert(
      {
        user_id: userID,
        profile_data: data,
        onboarding_complete: true,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return { success: true };
}

export async function updateProfileData(data: profileData) {
  validateProfileData(data);
  const supabase = await createClient();
  const userID = await getCurrentUserID();

  const { error } = await supabase
    .from("user_info")
    .upsert(
      {
        user_id: userID,
        profile_data: data,
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
  return { success: true };
}

export async function getProfilePhotoUrl(userId?: string) {
  const supabase = await createClient();
  const userID = userId || await getCurrentUserID();

  const { data: files, error: listError } = await supabase.storage
    .from("user_profile_photos")
    .list(userID, { limit: 1 });

  if (listError) {
    console.error("Error listing profile photos:", listError);
    return null;
  }

  const file = files?.[0];
  if (!file) {
    return null;
  }

  const { data } = supabase.storage
    .from("user_profile_photos")
    .getPublicUrl(`${userID}/${file.name}`);

  return data?.publicUrl ?? null;
}

export async function getOnboardingStatus() {
  const supabase = await createClient();
  const userID = await getCurrentUserID();

  const { data, error } = await supabase
    .from("user_info")
    .select("onboarding_complete")
    .eq("user_id", userID)
    .single();

  if (error) {
    // If the row doesn't exist yet, treat as not complete
    if (error.code === "PGRST116") {
      return false;
    }
    throw error;
  }

  return data?.onboarding_complete ?? false;
}

