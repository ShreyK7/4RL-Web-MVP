"use server"
import { createClient } from "./serverClient";
import { profileData } from "../types/userDataTypes";

export async function uploadProfileData(data: profileData) {
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

  const { error } = await supabase
    .from("user_info")
    .upsert(
      {
        user_id: user.id,
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

export async function getDroppedInStatus() {
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

  const { data, error } = await supabase
    .from("user_info")
    .select("dropped_in")
    .eq("user_id", user.id)
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

export async function setDroppedInStatus(droppedIn: boolean) {
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

  const { error } = await supabase
    .from("user_info")
    .upsert(
      {
        user_id: user.id,
        dropped_in: droppedIn,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    throw error;
  }

  return droppedIn;
}