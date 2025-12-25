"use server"
import { createClient } from "./serverClient";
import createAuthClient from "./authAdminClient";
import { profileData } from "../types/userDataTypes";
import { getCurrentUserID } from "./common";

export type ConnectionStatus = "connected" | "pending" | "blocked" | "none";

export async function sendConnectionRequest(targetUserId: string) {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Prevent self-requests
  if (currentUserID === targetUserId) {
    throw new Error("Cannot send connection request to yourself");
  }

  // Get current user's connections_pending
  const { data: currentUserData, error: currentUserError } = await supabase
    .from("user_info")
    .select("connections_pending")
    .eq("user_id", currentUserID)
    .single();

  if (currentUserError) {
    throw currentUserError;
  }

  // Get target user's connections_incoming - verify user exists
  const { data: targetUserData, error: targetUserError } = await supabase
    .from("user_info")
    .select("connections_incoming")
    .eq("user_id", targetUserId)
    .single();

  if (targetUserError) {
    // If user doesn't exist, throw an error
    if (targetUserError.code === "PGRST116") {
      throw new Error("Target user does not exist");
    }
    throw targetUserError;
  }

  // If row exists, get the current array
  const targetIncoming = (targetUserData?.connections_incoming as string[]) || [];

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

export async function getIncomingConnectionRequestsCount() {
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
  return incomingIds.length;
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

export async function getConnectionStatus(targetUserId: string): Promise<ConnectionStatus> {
  const supabase = await createClient();
  const currentUserID = await getCurrentUserID();

  // Get current user's connection arrays
  const { data: currentUserData, error: currentUserError } = await supabase
    .from("user_info")
    .select("connections_active, connections_pending, connections_incoming, connections_blocked")
    .eq("user_id", currentUserID)
    .single();

  if (currentUserError) {
    throw currentUserError;
  }

  const active = (currentUserData?.connections_active as string[]) || [];
  const pending = (currentUserData?.connections_pending as string[]) || [];
  const incoming = (currentUserData?.connections_incoming as string[]) || [];
  const blocked = (currentUserData?.connections_blocked as string[]) || [];

  // Check if user has blocked the current user (need to check target user's blocked list)
  const { data: targetUserData } = await supabase
    .from("user_info")
    .select("connections_blocked")
    .eq("user_id", targetUserId)
    .single();

  const targetBlocked = (targetUserData?.connections_blocked as string[]) || [];
  if (targetBlocked.includes(currentUserID)) {
    return "blocked";
  }

  // Check if already connected
  if (active.includes(targetUserId)) {
    return "connected";
  }

  // Check if pending (either direction)
  if (pending.includes(targetUserId) || incoming.includes(targetUserId)) {
    return "pending";
  }

  // Check if current user has blocked target user
  if (blocked.includes(targetUserId)) {
    return "blocked";
  }

  return "none";
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

