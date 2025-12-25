"use server"
import { createClient } from "./serverClient";
import { getCurrentUserID } from "./common";

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

