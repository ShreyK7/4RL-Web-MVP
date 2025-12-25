"use server"
import { createClient } from "./serverClient";

export async function getCurrentUserID() {
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

