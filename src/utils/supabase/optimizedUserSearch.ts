"use server";
import { createClient } from "./serverClient";
import createAuthClient from "./authAdminClient";
import { profileData } from "../types/userDataTypes";
import { getCurrentUserID } from "./common";

export interface OptimizedUserSearchResult {
  user_id: string;
  profile_data: profileData;
  user_latitude: number | null;
  user_longitude: number | null;
  distance?: number;
  photoUrl?: string | null;
  connectionStatus: "connected" | "pending" | "blocked" | "none";
}

/**
 * Optimized function to get dropped-in users with all data in batch
 * This reduces N+1 queries by fetching everything in parallel batches
 */
export async function getDroppedInUsersOptimized(): Promise<OptimizedUserSearchResult[]> {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get current user's connection arrays once
  const { data: currentUserData } = await supabase
    .from("user_info")
    .select("connections_active, connections_pending, connections_incoming, connections_blocked")
    .eq("user_id", currentUserID)
    .single();

  const currentActive = (currentUserData?.connections_active as string[]) || [];
  const currentPending = (currentUserData?.connections_pending as string[]) || [];
  const currentIncoming = (currentUserData?.connections_incoming as string[]) || [];
  const currentBlocked = (currentUserData?.connections_blocked as string[]) || [];

  // Get current user's location once
  const { data: currentLocationData } = await supabase
    .from("user_info")
    .select("user_latitude, user_longitude")
    .eq("user_id", currentUserID)
    .single();

  const currentLat = currentLocationData?.user_latitude;
  const currentLon = currentLocationData?.user_longitude;

  // Get all dropped-in users in one query
  const { data: usersData, error } = await supabase
    .from("user_info")
    .select("user_id, profile_data, user_latitude, user_longitude, connections_blocked")
    .eq("dropped_in", true)
    .eq("onboarding_complete", true)
    .neq("user_id", currentUserID);

  if (error) {
    throw error;
  }

  if (!usersData || usersData.length === 0) {
    return [];
  }

  // Batch fetch all profile photos at once
  const userIds = usersData.map((u) => u.user_id);
  const photoUrls = await batchGetProfilePhotoUrls(userIds);

  // Calculate connection status for all users in memory (no additional queries)
  const usersWithStatus = usersData.map((user) => {
    const userId = user.user_id;
    const userBlocked = (user.connections_blocked as string[]) || [];

    // Check if current user blocked this user
    if (currentBlocked.includes(userId)) {
      return { ...user, connectionStatus: "blocked" as const };
    }

    // Check if this user blocked current user
    if (userBlocked.includes(currentUserID)) {
      return { ...user, connectionStatus: "blocked" as const };
    }

    // Check if connected
    if (currentActive.includes(userId)) {
      return { ...user, connectionStatus: "connected" as const };
    }

    // Check if pending
    if (currentPending.includes(userId) || currentIncoming.includes(userId)) {
      return { ...user, connectionStatus: "pending" as const };
    }

    return { ...user, connectionStatus: "none" as const };
  });

  // Filter out non-"none" connections and calculate distances
  const availableUsers = usersWithStatus
    .filter((user) => user.connectionStatus === "none")
    .map((user) => {
      const { connections_blocked, ...userWithoutBlocked } = user;
      
      // Calculate distance if both locations exist
      let distance: number | undefined;
      if (currentLat && currentLon && user.user_latitude && user.user_longitude) {
        distance = calculateDistanceHaversine(
          currentLat,
          currentLon,
          user.user_latitude,
          user.user_longitude
        );
      }

      return {
        user_id: user.user_id,
        profile_data: user.profile_data as profileData,
        user_latitude: user.user_latitude,
        user_longitude: user.user_longitude,
        distance,
        photoUrl: photoUrls[user.user_id] || null,
        connectionStatus: user.connectionStatus,
      };
    })
    // Filter out users more than 10 miles away
    .filter((user) => {
      // If distance is undefined (no location data), exclude the user
      if (user.distance === undefined) return false;
      // Only include users within 10 miles
      return user.distance <= 10;
    });

  // Sort by distance (closest first)
  availableUsers.sort((a, b) => {
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  });

  return availableUsers;
}

/**
 * Batch fetch profile photo URLs for multiple users
 * This is much faster than individual storage.list() calls
 */
async function batchGetProfilePhotoUrls(userIds: string[]): Promise<Record<string, string | null>> {
  const supabase = await createClient();
  const bucket = "user_profile_photos";
  const photoUrls: Record<string, string | null> = {};

  // Initialize all to null
  userIds.forEach((id) => {
    photoUrls[id] = null;
  });

  // Batch list all folders (user IDs) at once
  // Note: Supabase storage doesn't support batch listing, so we'll use parallel requests
  // But limit concurrency to avoid overwhelming the API
  const BATCH_SIZE = 10;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (userId) => {
        try {
          const { data: files } = await supabase.storage
            .from(bucket)
            .list(userId, { limit: 1 });

          if (files && files.length > 0) {
            const { data } = supabase.storage
              .from(bucket)
              .getPublicUrl(`${userId}/${files[0].name}`);
            photoUrls[userId] = data?.publicUrl || null;
          }
        } catch (error) {
          // Silently fail for individual photos
          console.error(`Error fetching photo for user ${userId}:`, error);
        }
      })
    );
  }

  return photoUrls;
}

/**
 * Calculate distance using Haversine formula (synchronous, no server action overhead)
 */
function calculateDistanceHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

