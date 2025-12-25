"use server";
import createAuthClient from "./authAdminClient";
import { createClient } from "./serverClient";
import { profileData } from "../types/userDataTypes";
import { isAdminPhoneNumber } from "./admin";

/**
 * Optimized function to get all users with auth data
 * Uses batch operations instead of N individual API calls
 */
export async function getAllUsersOptimized() {
  const adminClient = createAuthClient();

  // Check if current user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminPhoneNumber(user.phone))) {
    throw new Error("Unauthorized: Admin access required");
  }

  // Get all users from user_info table in one query
  const { data: usersData, error } = await adminClient
    .from("user_info")
    .select("user_id, profile_data, onboarding_complete, dropped_in, user_latitude, user_longitude, connections_active, connections_pending, connections_incoming, connections_blocked")
    .order("user_id", { ascending: true });

  if (error) {
    throw error;
  }

  if (!usersData || usersData.length === 0) {
    return [];
  }

  // Batch fetch auth data for all users
  // Note: Supabase Admin API doesn't support batch getUserById, but we can parallelize
  // Limit concurrency to avoid rate limits
  const userIds = usersData.map((u) => u.user_id);
  const BATCH_SIZE = 20; // Process 20 users at a time
  const authDataMap: Record<string, { email: string | null; phone: string | null }> = {};

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (userId) => {
        try {
          const { data: authData } = await adminClient.auth.admin.getUserById(userId);
          authDataMap[userId] = {
            email: authData.user?.email || null,
            phone: authData.user?.phone || null,
          };
        } catch (error) {
          // If user doesn't exist in auth, set to null
          authDataMap[userId] = { email: null, phone: null };
        }
      })
    );
  }

  // Combine data
  return usersData.map((userInfo) => ({
    user_id: userInfo.user_id,
    email: authDataMap[userInfo.user_id]?.email || null,
    phone: authDataMap[userInfo.user_id]?.phone || null,
    profile_data: userInfo.profile_data as profileData | null,
    onboarding_complete: userInfo.onboarding_complete ?? false,
    dropped_in: userInfo.dropped_in ?? false,
    user_latitude: userInfo.user_latitude ?? null,
    user_longitude: userInfo.user_longitude ?? null,
    connections_active: (userInfo.connections_active as string[]) || [],
    connections_pending: (userInfo.connections_pending as string[]) || [],
    connections_incoming: (userInfo.connections_incoming as string[]) || [],
    connections_blocked: (userInfo.connections_blocked as string[]) || [],
  }));
}

