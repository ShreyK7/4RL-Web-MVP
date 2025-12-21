"use server"
import { createClient } from "./serverClient";
import createAuthClient from "./authAdminClient";
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

// Connection Request Functions
export async function sendConnectionRequest(targetUserId: string) {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get current user's connections_pending
  const { data: currentUserData, error: currentUserError } = await supabase
    .from("user_info")
    .select("connections_pending")
    .eq("user_id", currentUserID)
    .single();

  if (currentUserError) {
    throw currentUserError;
  }

  // Get target user's connections_incoming (handle case where row might not exist)
  let targetIncoming: string[] = [];
  const { data: targetUserData, error: targetUserError } = await supabase
    .from("user_info")
    .select("connections_incoming")
    .eq("user_id", targetUserId)
    .single();

  if (targetUserError && targetUserError.code !== "PGRST116") {
    // If error is not "row not found", throw it
    throw targetUserError;
  } else if (targetUserData) {
    // If row exists, get the current array
    targetIncoming = (targetUserData.connections_incoming as string[]) || [];
  }
  // If row doesn't exist (PGRST116), targetIncoming stays as empty array

  // Prepare updates for both users
  const currentPending = (currentUserData?.connections_pending as string[]) || [];
  const updatedCurrentPending = currentPending.includes(targetUserId)
    ? currentPending
    : [...currentPending, targetUserId];

  const updatedTargetIncoming = targetIncoming.includes(currentUserID)
    ? targetIncoming
    : [...targetIncoming, currentUserID];

  // Use admin client to update target user (bypasses RLS)
  const adminClient = createAuthClient();

  // Update current user's connections_pending (can use regular client for own row)
  const currentUpsert = await supabase
    .from("user_info")
    .upsert(
      {
        user_id: currentUserID,
        connections_pending: updatedCurrentPending,
      },
      { onConflict: "user_id" }
    );

  if (currentUpsert.error) {
    throw currentUpsert.error;
  }

  // Update target user's connections_incoming using admin client (bypasses RLS)
  const targetUpsert = await adminClient
    .from("user_info")
    .upsert(
      {
        user_id: targetUserId,
        connections_incoming: updatedTargetIncoming,
      },
      { onConflict: "user_id" }
    );

  if (targetUpsert.error) {
    throw targetUpsert.error;
  }

  return { success: true };
}

export async function getIncomingConnectionRequests() {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get current user's connections_incoming
  const { data: userData, error: userError } = await supabase
    .from("user_info")
    .select("connections_incoming")
    .eq("user_id", currentUserID)
    .single();

  if (userError) {
    throw userError;
  }

  const incomingIds = (userData?.connections_incoming as string[]) || [];
  if (incomingIds.length === 0) {
    return [];
  }

  // Get profile data for all incoming connection requests
  const { data: usersData, error: usersError } = await supabase
    .from("user_info")
    .select("user_id, profile_data")
    .in("user_id", incomingIds);

  if (usersError) {
    throw usersError;
  }

  return (usersData || []).map((user) => ({
    user_id: user.user_id,
    profile_data: user.profile_data as profileData,
  }));
}

export async function getActiveConnections() {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get current user's connections_active
  const { data: userData, error: userError } = await supabase
    .from("user_info")
    .select("connections_active")
    .eq("user_id", currentUserID)
    .single();

  if (userError) {
    throw userError;
  }

  const activeIds = (userData?.connections_active as string[]) || [];
  if (activeIds.length === 0) {
    return [];
  }

  // Get profile data for all active connections
  const { data: usersData, error: usersError } = await supabase
    .from("user_info")
    .select("user_id, profile_data")
    .in("user_id", activeIds);

  if (usersError) {
    throw usersError;
  }

  return (usersData || []).map((user) => ({
    user_id: user.user_id,
    profile_data: user.profile_data as profileData,
  }));
}

export async function removeConnection(connectionUserId: string) {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get both users' connections_active
  const [currentUserData, connectionUserData] = await Promise.all([
    supabase
      .from("user_info")
      .select("connections_active")
      .eq("user_id", currentUserID)
      .single(),
    supabase
      .from("user_info")
      .select("connections_active")
      .eq("user_id", connectionUserId)
      .single(),
  ]);

  if (currentUserData.error) throw currentUserData.error;
  if (connectionUserData.error) throw connectionUserData.error;

  const currentActive = (currentUserData.data?.connections_active as string[]) || [];
  const connectionActive = (connectionUserData.data?.connections_active as string[]) || [];

  // Remove connection user from current user's connections_active
  const updatedCurrentActive = currentActive.filter((id) => id !== connectionUserId);
  
  // Remove current user from connection user's connections_active
  const updatedConnectionActive = connectionActive.filter((id) => id !== currentUserID);

  // Update current user (can use regular client for own row)
  const currentUpdate = await supabase
    .from("user_info")
    .update({ connections_active: updatedCurrentActive })
    .eq("user_id", currentUserID);

  if (currentUpdate.error) throw currentUpdate.error;

  // Update connection user using admin client (bypasses RLS)
  const adminClient = createAuthClient();
  const connectionUpdate = await adminClient
    .from("user_info")
    .update({ connections_active: updatedConnectionActive })
    .eq("user_id", connectionUserId);

  if (connectionUpdate.error) throw connectionUpdate.error;

  return { success: true };
}

export async function acceptConnectionRequest(requestingUserId: string) {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get both users' data
  const [currentUserData, requestingUserData] = await Promise.all([
    supabase
      .from("user_info")
      .select("connections_incoming, connections_active")
      .eq("user_id", currentUserID)
      .single(),
    supabase
      .from("user_info")
      .select("connections_pending, connections_active")
      .eq("user_id", requestingUserId)
      .single(),
  ]);

  if (currentUserData.error) throw currentUserData.error;
  if (requestingUserData.error) throw requestingUserData.error;

  const currentIncoming = (currentUserData.data?.connections_incoming as string[]) || [];
  const currentActive = (currentUserData.data?.connections_active as string[]) || [];
  const requestingPending = (requestingUserData.data?.connections_pending as string[]) || [];
  const requestingActive = (requestingUserData.data?.connections_active as string[]) || [];

  // Remove requesting user from current user's connections_incoming
  const updatedCurrentIncoming = currentIncoming.filter((id) => id !== requestingUserId);
  
  // Remove current user from requesting user's connections_pending
  const updatedRequestingPending = requestingPending.filter((id) => id !== currentUserID);

  // Add each other to connections_active (if not already there)
  const updatedCurrentActive = currentActive.includes(requestingUserId)
    ? currentActive
    : [...currentActive, requestingUserId];
  const updatedRequestingActive = requestingActive.includes(currentUserID)
    ? requestingActive
    : [...requestingActive, currentUserID];

  // Update current user (can use regular client for own row)
  const currentUpdate = await supabase
    .from("user_info")
    .update({
      connections_incoming: updatedCurrentIncoming,
      connections_active: updatedCurrentActive,
    })
    .eq("user_id", currentUserID);

  if (currentUpdate.error) throw currentUpdate.error;

  // Update requesting user using admin client (bypasses RLS)
  const adminClient = createAuthClient();
  const requestingUpdate = await adminClient
    .from("user_info")
    .update({
      connections_pending: updatedRequestingPending,
      connections_active: updatedRequestingActive,
    })
    .eq("user_id", requestingUserId);

  if (requestingUpdate.error) throw requestingUpdate.error;

  return { success: true };
}

export async function rejectConnectionRequest(requestingUserId: string) {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get both users' data
  const [currentUserData, requestingUserData] = await Promise.all([
    supabase
      .from("user_info")
      .select("connections_incoming")
      .eq("user_id", currentUserID)
      .single(),
    supabase
      .from("user_info")
      .select("connections_pending")
      .eq("user_id", requestingUserId)
      .single(),
  ]);

  if (currentUserData.error) throw currentUserData.error;
  if (requestingUserData.error) throw requestingUserData.error;

  const currentIncoming = (currentUserData.data?.connections_incoming as string[]) || [];
  const requestingPending = (requestingUserData.data?.connections_pending as string[]) || [];

  // Remove requesting user from current user's connections_incoming
  const updatedCurrentIncoming = currentIncoming.filter((id) => id !== requestingUserId);
  
  // Remove current user from requesting user's connections_pending
  const updatedRequestingPending = requestingPending.filter((id) => id !== currentUserID);

  // Update current user (can use regular client for own row)
  const currentUpdate = await supabase
    .from("user_info")
    .update({ connections_incoming: updatedCurrentIncoming })
    .eq("user_id", currentUserID);

  if (currentUpdate.error) throw currentUpdate.error;

  // Update requesting user using admin client (bypasses RLS)
  const adminClient = createAuthClient();
  const requestingUpdate = await adminClient
    .from("user_info")
    .update({ connections_pending: updatedRequestingPending })
    .eq("user_id", requestingUserId);

  if (requestingUpdate.error) throw requestingUpdate.error;

  return { success: true };
}

export async function blockConnectionRequest(requestingUserId: string) {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get both users' data
  const [currentUserData, requestingUserData] = await Promise.all([
    supabase
      .from("user_info")
      .select("connections_incoming, connections_blocked")
      .eq("user_id", currentUserID)
      .single(),
    supabase
      .from("user_info")
      .select("connections_pending")
      .eq("user_id", requestingUserId)
      .single(),
  ]);

  if (currentUserData.error) throw currentUserData.error;
  if (requestingUserData.error) throw requestingUserData.error;

  const currentIncoming = (currentUserData.data?.connections_incoming as string[]) || [];
  const currentBlocked = (currentUserData.data?.connections_blocked as string[]) || [];
  const requestingPending = (requestingUserData.data?.connections_pending as string[]) || [];

  // Remove requesting user from current user's connections_incoming
  const updatedCurrentIncoming = currentIncoming.filter((id) => id !== requestingUserId);
  
  // Remove current user from requesting user's connections_pending
  const updatedRequestingPending = requestingPending.filter((id) => id !== currentUserID);

  // Add requesting user to current user's connections_blocked (if not already there)
  const updatedCurrentBlocked = currentBlocked.includes(requestingUserId)
    ? currentBlocked
    : [...currentBlocked, requestingUserId];

  // Update current user (can use regular client for own row)
  const currentUpdate = await supabase
    .from("user_info")
    .update({
      connections_incoming: updatedCurrentIncoming,
      connections_blocked: updatedCurrentBlocked,
    })
    .eq("user_id", currentUserID);

  if (currentUpdate.error) throw currentUpdate.error;

  // Update requesting user using admin client (bypasses RLS)
  const adminClient = createAuthClient();
  const requestingUpdate = await adminClient
    .from("user_info")
    .update({ connections_pending: updatedRequestingPending })
    .eq("user_id", requestingUserId);

  if (requestingUpdate.error) throw requestingUpdate.error;

  return { success: true };
}
