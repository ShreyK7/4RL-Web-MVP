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

export interface UserSearchResult {
  user_id: string;
  profile_data: profileData;
  user_latitude: number | null;
  user_longitude: number | null;
  distance?: number;
  photoUrl?: string | null;
}

export async function getDroppedInUsers() {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  const { data, error } = await supabase
    .from("user_info")
    .select("user_id, profile_data, user_latitude, user_longitude")
    .eq("dropped_in", true)
    .eq("onboarding_complete", true)
    .neq("user_id", currentUserID);

  if (error) {
    throw error;
  }

  return (data || []) as UserSearchResult[];
}

export async function getCurrentUserLocation() {
  const supabase = await createClient();
  const userID = await getCurrentUserID();

  const { data, error } = await supabase
    .from("user_info")
    .select("user_latitude, user_longitude")
    .eq("user_id", userID)
    .single();

  if (error) {
    return { latitude: null, longitude: null };
  }

  return {
    latitude: data?.user_latitude ?? null,
    longitude: data?.user_longitude ?? null,
  };
}

export async function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<number> {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
