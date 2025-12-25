"use server"
import { createClient } from "./serverClient";
import { profileData } from "../types/userDataTypes";
import { getCurrentUserID } from "./common";
import { getConnectionStatus, type ConnectionStatus } from "./connections";

export interface UserSearchResult {
  user_id: string;
  profile_data: profileData;
  user_latitude: number | null;
  user_longitude: number | null;
  distance?: number;
  photoUrl?: string | null;
  connectionStatus?: ConnectionStatus;
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

