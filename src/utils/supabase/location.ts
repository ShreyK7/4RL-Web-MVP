"use server"
import { createClient } from "./serverClient";
import { getCurrentUserID } from "./common";

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

