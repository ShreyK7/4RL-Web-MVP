"use client";
import { createClient } from "./browserClient";

export async function uploadProfilePhoto(photo: File) {
  const supabase = createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error getting user:", userError);
    throw userError;
  }

  if (!user) {
    console.error("No authenticated user found in session");
    throw new Error("No authenticated user found in session.");
  }

  console.log("Uploading profile photo for user:", user.id);
  console.log("File details:", {
    name: photo.name,
    type: photo.type,
    size: photo.size,
  });

  // Get file extension from the original filename
  const fileExtension = photo.name.split('.').pop() || 'jpg';
  const filePath = `${user.id}/profilePhoto.${fileExtension}`;

  console.log("Upload path:", filePath);
  console.log("Bucket: user_profile_photos");

  // Upload the file to the user's folder
  const { data, error } = await supabase.storage
    .from('user_profile_photos')
    .upload(filePath, photo, {
      cacheControl: '3600',
      upsert: true, // Replace existing file if it exists
      contentType: photo.type,
    });

  if (error) {
    console.error("Storage upload error:", {
      message: error.message,
      name: error.name,
      statusCode: (error as any).statusCode,
      filePath: filePath,
      userId: user.id,
      bucket: 'user_profile_photos',
      fullError: error,
    });
    throw error;
  }

  console.log("Upload successful:", data.path);
  return { success: true, path: data.path };
}

