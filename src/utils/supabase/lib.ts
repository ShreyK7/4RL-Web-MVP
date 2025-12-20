"use server"
import { createClient } from "./serverClient";
import { profileData } from "../types/userDataTypes";

async function getCurrentUserID() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }
  if (!user) {
    throw new Error("No authenticated user found in session.");
  }
  return user.id
}

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

export async function uploadProfileData(data: profileData) {
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

  if (error) {
    throw error;
  }

  return { success: true };
}

export async function updateProfileData(data: profileData) {
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

  if (error) {
    throw error;
  }

  return { success: true };
}

export async function getDroppedInStatus() {
  const supabase = await createClient();
  const userID = await getCurrentUserID();

  const { data, error } = await supabase
    .from("user_info")
    .select("dropped_in")
    .eq("user_id", userID)
    .single();

  if (error) {
    // If the row doesn't exist yet, treat as dropped out
    if (error.code === "PGRST116") {
      return false;
    }
    throw error;
  }

  return data?.dropped_in ?? false;
}

export async function setDroppedInStatus(droppedIn: boolean, latitude?: number, longitude?: number) {
  const supabase = await createClient();
  const userID = await getCurrentUserID();

  const updateData: {
    user_id: string;
    dropped_in: boolean;
    user_latitude?: number;
    user_longitude?: number;
  } = {
    user_id: userID,
    dropped_in: droppedIn,
  };

  // Only update location when dropping in
  if (droppedIn && latitude !== undefined && longitude !== undefined) {
    updateData.user_latitude = latitude;
    updateData.user_longitude = longitude;
  }

  const { error } = await supabase
    .from("user_info")
    .upsert(updateData, { onConflict: "user_id" });

  if (error) {
    throw error;
  }

  return droppedIn;
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

export async function getProfilePhotoUrl() {
  const supabase = await createClient();
  const userID = await getCurrentUserID();

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
