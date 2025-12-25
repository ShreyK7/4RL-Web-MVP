"use server";
import { createClient } from "./serverClient";
import createAuthClient from "./authAdminClient";
import { profileData, Pronouns } from "../types/userDataTypes";

const ADMIN_PHONE_NUMBER = "+12818579733";

/**
 * Normalize phone number for comparison (handles different formats)
 * Extracts just the digits and compares the last 10 digits (US phone number)
 */
function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  // Remove all non-digit characters
  return phone.replace(/\D/g, "");
}

/**
 * Check if a phone number matches the admin phone number (handles format variations)
 * Compares the last 10 digits to handle different country code formats
 */
function isAdminPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const phoneDigits = normalizePhoneNumber(phone);
  const adminDigits = normalizePhoneNumber(ADMIN_PHONE_NUMBER);
  
  // Get last 10 digits (US phone number without country code)
  const phoneLast10 = phoneDigits.slice(-10);
  const adminLast10 = adminDigits.slice(-10);
  
  // Check if last 10 digits match
  if (phoneLast10 === adminLast10) {
    return true;
  }
  
  // Also check full match in case formats are identical
  if (phoneDigits === adminDigits) {
    return true;
  }
  
  // Check if either matches the admin number exactly (with or without country code)
  const normalizedPhone = phone.replace(/\D/g, "");
  const normalizedAdmin = ADMIN_PHONE_NUMBER.replace(/\D/g, "");
  
  // Remove leading 1 if present (US country code)
  const phoneWithoutCountry = normalizedPhone.replace(/^1/, "");
  const adminWithoutCountry = normalizedAdmin.replace(/^1/, "");
  
  if (phoneWithoutCountry === adminWithoutCountry) {
    return true;
  }
  
  return false;
}

/**
 * Check if the current user is the admin
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Check if user's phone matches admin phone number (with format normalization)
  return isAdminPhoneNumber(user.phone);
}

/**
 * Admin login - verify phone number is admin
 */
export async function adminSignIn(phoneNumber: string) {
  // Normalize phone number for comparison
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  if (!isAdminPhoneNumber(normalizedPhone)) {
    return { error: { message: "Unauthorized: This phone number is not authorized for admin access" } };
  }
  
  // Use the normalized phone for the OTP request
  const phoneForOTP = normalizedPhone;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: phoneForOTP,
  });

  if (error) {
    return { error };
  }

  return { data };
}

/**
 * Admin OTP verification
 */
export async function adminVerifyOTP(OTPCode: string, phoneNumber: string) {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.verifyOtp({
    phone: phoneNumber,
    token: OTPCode,
    type: "sms",
  });

  if (error) {
    return { error };
  }

  // Double-check the user is admin after OTP verification (with format normalization)
  const userPhone = session?.user?.phone;
  if (!isAdminPhoneNumber(userPhone)) {
    // Log for debugging
    console.log("Admin verification failed:", {
      userPhone,
      adminPhone: ADMIN_PHONE_NUMBER,
      normalizedUser: normalizePhoneNumber(userPhone),
      normalizedAdmin: normalizePhoneNumber(ADMIN_PHONE_NUMBER),
    });
    await supabase.auth.signOut();
    return { error: { message: "Unauthorized: This phone number is not authorized for admin access" } };
  }

  return { session };
}

/**
 * Get all users with their profile data
 */
export async function getAllUsers() {
  const adminClient = createAuthClient();

  // Check if current user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminPhoneNumber(user.phone)) {
    throw new Error("Unauthorized: Admin access required");
  }

  // Get all users from user_info table
  const { data: usersData, error } = await adminClient
    .from("user_info")
    .select("user_id, profile_data, onboarding_complete, dropped_in, user_latitude, user_longitude, connections_active, connections_pending, connections_incoming, connections_blocked")
    .order("user_id", { ascending: true });

  if (error) {
    throw error;
  }

  // Get auth user data for each user to get email/phone
  const userIds = usersData?.map((u) => u.user_id) || [];
  const usersWithAuth = await Promise.all(
    userIds.map(async (userId) => {
      const { data: authData } = await adminClient.auth.admin.getUserById(userId);
      const userInfo = usersData?.find((u) => u.user_id === userId);
      return {
        user_id: userId,
        email: authData.user?.email || null,
        phone: authData.user?.phone || null,
        profile_data: userInfo?.profile_data as profileData | null,
        onboarding_complete: userInfo?.onboarding_complete ?? false,
        dropped_in: userInfo?.dropped_in ?? false,
        user_latitude: userInfo?.user_latitude ?? null,
        user_longitude: userInfo?.user_longitude ?? null,
        connections_active: (userInfo?.connections_active as string[]) || [],
        connections_pending: (userInfo?.connections_pending as string[]) || [],
        connections_incoming: (userInfo?.connections_incoming as string[]) || [],
        connections_blocked: (userInfo?.connections_blocked as string[]) || [],
      };
    })
  );

  return usersWithAuth;
}

/**
 * Generate a random phone number for testing
 */
export async function generateRandomPhoneNumber(): Promise<string> {
  // Generate a random 10-digit number
  const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000);
  return `+1${randomDigits}`;
}

/**
 * Generate random US coordinates (latitude and longitude)
 */
export async function generateRandomUSCoordinates(): Promise<{ latitude: number; longitude: number }> {
  // US bounding box (approximate)
  // Latitude: 24.396308 to 49.384358 (south to north)
  // Longitude: -125.0 to -66.93457 (west to east)
  const minLat = 24.396308;
  const maxLat = 49.384358;
  const minLon = -125.0;
  const maxLon = -66.93457;

  const latitude = minLat + Math.random() * (maxLat - minLat);
  const longitude = minLon + Math.random() * (maxLon - minLon);

  return { latitude, longitude };
}

/**
 * Generate random coordinates within 10 miles of a given location
 */
export async function generateCoordinatesWithin10Miles(
  centerLat: number,
  centerLon: number
): Promise<{ latitude: number; longitude: number }> {
  // 1 degree of latitude ≈ 69 miles
  // 1 degree of longitude ≈ 69 * cos(latitude) miles
  // For 10 miles radius:
  // Latitude range: ±10/69 ≈ ±0.145 degrees
  // Longitude range: ±10/(69 * cos(lat)) ≈ ±0.145/cos(lat) degrees
  
  const latRange = 10 / 69; // ~0.145 degrees
  const lonRange = 10 / (69 * Math.cos(centerLat * Math.PI / 180)); // Adjust for latitude
  
  // Generate random offset within the range
  const latOffset = (Math.random() - 0.5) * 2 * latRange; // -latRange to +latRange
  const lonOffset = (Math.random() - 0.5) * 2 * lonRange; // -lonRange to +lonRange
  
  const latitude = centerLat + latOffset;
  const longitude = centerLon + lonOffset;

  return { latitude, longitude };
}

/**
 * Generate random profile data
 */
export async function generateRandomProfileData(): Promise<profileData> {
  const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Sage", "River"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
  const pronouns: Pronouns[] = ["he/him/his", "she/her/hers", "they/them/theirs", "other"];
  const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"];
  const interestsList = [
    "hiking", "reading", "music", "cooking", "travel", "photography", "yoga", "gaming",
    "art", "dancing", "sports", "movies", "writing", "fitness", "gardening", "technology"
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const age = Math.floor(Math.random() * 50) + 18; // 18-67
  const pronoun = pronouns[Math.floor(Math.random() * pronouns.length)];
  const hometown = cities[Math.floor(Math.random() * cities.length)];
  const baseCity = cities[Math.floor(Math.random() * cities.length)];
  
  // Random 2-4 interests
  const numInterests = Math.floor(Math.random() * 3) + 2;
  const selectedInterests = interestsList
    .sort(() => Math.random() - 0.5)
    .slice(0, numInterests);

  return {
    first_name: firstName,
    last_name: lastName,
    age,
    pronouns: pronoun,
    hometown,
    baseCity,
    about: `I'm ${firstName}, a ${age}-year-old from ${hometown} who loves ${selectedInterests[0]} and ${selectedInterests[1]}.`,
    interests: selectedInterests,
  };
}

/**
 * Bulk create random test users within 10 miles of current location
 */
export async function bulkCreateRandomUsersNearby(count: number) {
  const adminClient = createAuthClient();

  // Check if current user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminPhoneNumber(user.phone)) {
    throw new Error("Unauthorized: Admin access required");
  }

  // Get current user's location
  const { data: userInfo, error: userInfoError } = await supabase
    .from("user_info")
    .select("user_latitude, user_longitude")
    .eq("user_id", user.id)
    .single();

  if (userInfoError || !userInfo?.user_latitude || !userInfo?.user_longitude) {
    throw new Error("Current user location not found. Please ensure you have a location set.");
  }

  const centerLat = userInfo.user_latitude;
  const centerLon = userInfo.user_longitude;

  const createdUsers: Array<{ userId: string; email: string | null; phone: string }> = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < count; i++) {
    try {
      // Generate random data with coordinates within 10 miles
      const [randomProfile, randomPhone, randomCoords] = await Promise.all([
        generateRandomProfileData(),
        generateRandomPhoneNumber(),
        generateCoordinatesWithin10Miles(centerLat, centerLon),
      ]);

      // Create user
      const createUserData: {
        phone: string;
        email?: string;
        email_confirm?: boolean;
        phone_confirm: boolean;
      } = {
        phone: randomPhone,
        phone_confirm: true,
      };

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser(createUserData);

      if (authError) {
        errors.push({ index: i, error: `Failed to create user: ${authError.message}` });
        continue;
      }

      if (!authData.user) {
        errors.push({ index: i, error: "User creation returned no user data" });
        continue;
      }

      const userId = authData.user.id;

      // Create user_info row
      const { error: infoError } = await adminClient
        .from("user_info")
        .upsert({
          user_id: userId,
          profile_data: randomProfile,
          onboarding_complete: true,
          dropped_in: true, // All bulk users are dropped in
          user_latitude: randomCoords.latitude,
          user_longitude: randomCoords.longitude,
          connections_active: [],
          connections_pending: [],
          connections_incoming: [],
          connections_blocked: [],
        });

      if (infoError) {
        // Clean up auth user if info creation fails
        await adminClient.auth.admin.deleteUser(userId);
        errors.push({ index: i, error: `Failed to create user_info: ${infoError.message}` });
        continue;
      }

      createdUsers.push({
        userId,
        email: null,
        phone: randomPhone,
      });
    } catch (error: any) {
      errors.push({ index: i, error: error?.message || "Unknown error" });
    }
  }

  return {
    success: true,
    created: createdUsers.length,
    total: count,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Bulk create random test users
 */
export async function bulkCreateRandomUsers(count: number) {
  const adminClient = createAuthClient();

  // Check if current user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminPhoneNumber(user.phone)) {
    throw new Error("Unauthorized: Admin access required");
  }

  const createdUsers: Array<{ userId: string; email: string | null; phone: string }> = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < count; i++) {
    try {
      // Generate random data
      const [randomProfile, randomPhone, randomCoords] = await Promise.all([
        generateRandomProfileData(),
        generateRandomPhoneNumber(),
        generateRandomUSCoordinates(),
      ]);

      // Create user
      const createUserData: {
        phone: string;
        email?: string;
        email_confirm?: boolean;
        phone_confirm: boolean;
      } = {
        phone: randomPhone,
        phone_confirm: true,
      };

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser(createUserData);

      if (authError) {
        errors.push({ index: i, error: `Failed to create user: ${authError.message}` });
        continue;
      }

      if (!authData.user) {
        errors.push({ index: i, error: "User creation returned no user data" });
        continue;
      }

      const userId = authData.user.id;

      // Create user_info row
      const { error: infoError } = await adminClient
        .from("user_info")
        .upsert({
          user_id: userId,
          profile_data: randomProfile,
          onboarding_complete: true,
          dropped_in: true, // All bulk users are dropped in
          user_latitude: randomCoords.latitude,
          user_longitude: randomCoords.longitude,
          connections_active: [],
          connections_pending: [],
          connections_incoming: [],
          connections_blocked: [],
        });

      if (infoError) {
        // Clean up auth user if info creation fails
        await adminClient.auth.admin.deleteUser(userId);
        errors.push({ index: i, error: `Failed to create user_info: ${infoError.message}` });
        continue;
      }

      createdUsers.push({
        userId,
        email: null,
        phone: randomPhone,
      });
    } catch (error: any) {
      errors.push({ index: i, error: error?.message || "Unknown error" });
    }
  }

  return {
    success: true,
    created: createdUsers.length,
    total: count,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Create a test/dummy user (admin only)
 */
export async function createTestUser(
  email: string | null,
  phone: string,
  profileData: profileData,
  options?: {
    onboardingComplete?: boolean;
    droppedIn?: boolean;
    latitude?: number;
    longitude?: number;
  }
) {
  const adminClient = createAuthClient();

  // Check if current user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminPhoneNumber(user.phone)) {
    throw new Error("Unauthorized: Admin access required");
  }

  // Validate profile data
  if (!profileData.first_name || !profileData.last_name || !profileData.age || !profileData.pronouns || !profileData.hometown || !profileData.baseCity) {
    throw new Error("Missing required profile fields: first_name, last_name, age, pronouns, hometown, and baseCity are required");
  }

  if (typeof profileData.age !== "number" || profileData.age < 0) {
    throw new Error("Age must be a positive number");
  }

  if (!Array.isArray(profileData.interests)) {
    throw new Error("Interests must be an array");
  }

  // Create user via admin API (email is optional)
  const createUserData: {
    phone: string;
    email?: string;
    email_confirm?: boolean;
    phone_confirm: boolean;
  } = {
    phone,
    phone_confirm: true,
  };

  if (email) {
    createUserData.email = email;
    createUserData.email_confirm = true;
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser(createUserData);

  if (authError) {
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error("User creation returned no user data");
  }

  const userId = authData.user.id;

  // Create user_info row
  const { error: infoError } = await adminClient
    .from("user_info")
    .upsert({
      user_id: userId,
      profile_data: profileData,
      onboarding_complete: options?.onboardingComplete ?? true,
      dropped_in: options?.droppedIn ?? false,
      user_latitude: options?.latitude ?? null,
      user_longitude: options?.longitude ?? null,
      connections_active: [],
      connections_pending: [],
      connections_incoming: [],
      connections_blocked: [],
    });

  if (infoError) {
    // Clean up auth user if info creation fails
    await adminClient.auth.admin.deleteUser(userId);
    throw new Error(`Failed to create user_info: ${infoError.message}`);
  }

  return {
    success: true,
    userId,
    email: email || null,
    phone,
  };
}

/**
 * Create a connection between two users (admin only)
 */
export async function createConnection(userId1: string, userId2: string) {
  const adminClient = createAuthClient();

  // Check if current user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminPhoneNumber(user.phone)) {
    throw new Error("Unauthorized: Admin access required");
  }

  // Prevent self-connection
  if (userId1 === userId2) {
    throw new Error("Cannot create connection between a user and themselves");
  }

  // Get both users' connection arrays
  const [user1Data, user2Data] = await Promise.all([
    adminClient
      .from("user_info")
      .select("connections_active")
      .eq("user_id", userId1)
      .single(),
    adminClient
      .from("user_info")
      .select("connections_active")
      .eq("user_id", userId2)
      .single(),
  ]);

  if (user1Data.error) throw new Error(`User 1 not found: ${user1Data.error.message}`);
  if (user2Data.error) throw new Error(`User 2 not found: ${user2Data.error.message}`);

  const user1Active = (user1Data.data?.connections_active as string[]) || [];
  const user2Active = (user2Data.data?.connections_active as string[]) || [];

  // Check if already connected
  if (user1Active.includes(userId2) || user2Active.includes(userId1)) {
    throw new Error("Users are already connected");
  }

  // Add each other to connections_active
  const updatedUser1Active = [...user1Active, userId2];
  const updatedUser2Active = [...user2Active, userId1];

  // Update both users
  const [update1, update2] = await Promise.all([
    adminClient
      .from("user_info")
      .update({ connections_active: updatedUser1Active })
      .eq("user_id", userId1),
    adminClient
      .from("user_info")
      .update({ connections_active: updatedUser2Active })
      .eq("user_id", userId2),
  ]);

  if (update1.error) throw new Error(`Failed to update user 1: ${update1.error.message}`);
  if (update2.error) throw new Error(`Failed to update user 2: ${update2.error.message}`);

  return { success: true };
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string) {
  const adminClient = createAuthClient();

  // Check if current user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminPhoneNumber(user.phone)) {
    throw new Error("Unauthorized: Admin access required");
  }

  // Delete profile photos
  try {
    const bucket = "user_profile_photos";
    const { data: files, error: listError } = await adminClient.storage
      .from(bucket)
      .list(userId);

    if (!listError && files && files.length > 0) {
      const pathsToRemove = files.map((file) => `${userId}/${file.name}`);
      await adminClient.storage.from(bucket).remove(pathsToRemove);
    }
  } catch (error) {
    console.error("Error removing profile photos:", error);
  }

  // Delete from user_info
  await adminClient.from("user_info").delete().eq("user_id", userId);

  // Delete from auth
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }

  return { success: true };
}

