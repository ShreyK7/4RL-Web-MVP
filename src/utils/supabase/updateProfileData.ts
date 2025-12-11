"use client";

import { createClient } from "./browserClient";
import { profileData } from "../types/userDataTypes";

export async function updateProfileDataClient(data: profileData) {
  const supabase = createClient();

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
      },
      { onConflict: "user_id" }
    );

  if (error) {
    throw error;
  }

  return { success: true };
}

