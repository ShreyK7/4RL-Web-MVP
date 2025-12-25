/**
 * Test Helper Utilities
 * Provides functions to create test users, manage test sessions, and log errors
 */

// Load environment variables first (only if not already loaded)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const { config } = require("dotenv");
    const { resolve } = require("path");
    config({ path: resolve(process.cwd(), ".env.local") });
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      config({ path: resolve(process.cwd(), ".env") });
    }
  } catch (e) {
    // dotenv might not be available, that's okay if setup.ts already loaded it
  }
}

import createAuthClient from "../../src/utils/supabase/authAdminClient";
import { profileData } from "../../src/utils/types/userDataTypes";

export interface TestUser {
  id: string;
  email: string;
  phone: string;
  profileData: profileData;
}

export interface TestError {
  testName: string;
  functionName: string;
  error: Error | unknown;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export class TestErrorLogger {
  private errors: TestError[] = [];

  logError(testName: string, functionName: string, error: Error | unknown, context?: Record<string, unknown>) {
    this.errors.push({
      testName,
      functionName,
      error,
      timestamp: new Date(),
      context,
    });
    console.error(`[ERROR] ${testName} - ${functionName}:`, error);
  }

  getErrors(): TestError[] {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }

  getErrorReport(): string {
    if (this.errors.length === 0) {
      return "No errors encountered during testing.";
    }

    let report = `\n=== ERROR REPORT ===\nTotal Errors: ${this.errors.length}\n\n`;
    
    this.errors.forEach((err, index) => {
      report += `Error ${index + 1}:\n`;
      report += `  Test: ${err.testName}\n`;
      report += `  Function: ${err.functionName}\n`;
      report += `  Time: ${err.timestamp.toISOString()}\n`;
      
      // Better error message extraction
      let errorMessage = "Unknown error";
      if (err.error instanceof Error) {
        errorMessage = err.error.message;
        if (err.error.stack) {
          report += `  Stack: ${err.error.stack}\n`;
        }
      } else if (err.error && typeof err.error === "object") {
        // Handle error objects (like Supabase errors) that have message property
        const errorObj = err.error as any;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.error) {
          errorMessage = String(errorObj.error);
        } else {
          // Try to stringify the error object
          try {
            errorMessage = JSON.stringify(err.error, null, 2);
          } catch {
            errorMessage = String(err.error);
          }
        }
      } else {
        errorMessage = String(err.error);
      }
      
      report += `  Error: ${errorMessage}\n`;
      
      if (err.context) {
        report += `  Context: ${JSON.stringify(err.context, null, 2)}\n`;
      }
      report += `\n`;
    });

    return report;
  }
}

export const errorLogger = new TestErrorLogger();

// Counter for generating unique phone numbers
let phoneNumberCounter = 0;

/**
 * Generate a valid E.164 phone number for testing
 * E.164 format: +[country code][number] (max 15 digits total)
 * US format: +1[10-digit number]
 * We'll use: +1555[7-digit unique number] = 12 digits total (valid)
 */
export function generateTestPhoneNumber(): string {
  phoneNumberCounter++;
  // Use timestamp + counter to ensure uniqueness, but keep it to 7 digits
  const uniquePart = String((Date.now() % 10000000) + phoneNumberCounter).padStart(7, "0");
  return `+1555${uniquePart}`;
}

/**
 * Create a test user using admin client (no OTP required)
 */
export async function createTestUser(
  email: string,
  phone: string,
  profileData: profileData
): Promise<TestUser> {
  const adminClient = createAuthClient();
  
  try {
    // Create user via admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
    });

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`);
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
        onboarding_complete: true,
        dropped_in: false,
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
      id: userId,
      email,
      phone,
      profileData,
    };
  } catch (error) {
    throw new Error(`createTestUser failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create multiple test users
 */
export async function createTestUsers(count: number): Promise<TestUser[]> {
  const users: TestUser[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < count; i++) {
    const email = `testuser${baseTime}_${i}@test.com`;
    const phone = `+1555${String(i).padStart(7, "0")}`;
    const profileData: profileData = {
      first_name: `Test${i}`,
      last_name: `User${i}`,
      age: 20 + (i % 50),
      pronouns: ["he/him/his", "she/her/hers", "they/them/theirs"][i % 3] as profileData["pronouns"],
      about: `Test user ${i} description`,
      hometown: `Hometown${i}`,
      baseCity: `City${i % 10}`,
      interests: [`Interest${i % 5}`, `Interest${(i + 1) % 5}`],
    };

    try {
      const user = await createTestUser(email, phone, profileData);
      users.push(user);
    } catch (error) {
      errorLogger.logError("createTestUsers", "createTestUser", error, { index: i, count });
    }
  }

  return users;
}

/**
 * Delete a test user
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const adminClient = createAuthClient();
  
  try {
    // Delete user_info row
    await adminClient.from("user_info").delete().eq("user_id", userId);
    
    // Delete auth user
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      throw error;
    }
  } catch (error) {
    errorLogger.logError("deleteTestUser", "delete", error, { userId });
    throw error;
  }
}

/**
 * Delete multiple test users
 */
export async function deleteTestUsers(userIds: string[]): Promise<void> {
  await Promise.all(userIds.map((id) => deleteTestUser(id).catch((err) => {
    errorLogger.logError("deleteTestUsers", "deleteTestUser", err, { userId: id });
  })));
}

/**
 * Generate a session token for a test user (for simulating authenticated requests)
 * Note: This is a workaround since we can't easily mock Next.js cookies in tests
 */
export async function generateTestSession(userId: string): Promise<string> {
  const adminClient = createAuthClient();
  
  // Generate a session token using admin API
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: `test_${userId}@test.com`,
  });

  if (error || !data) {
    throw new Error(`Failed to generate session: ${error?.message || "Unknown error"}`);
  }

  return data.properties?.hashed_token || "";
}

/**
 * Set user's dropped in status directly (bypassing server actions)
 */
export async function setUserDroppedInStatus(
  userId: string,
  droppedIn: boolean,
  latitude?: number,
  longitude?: number
): Promise<void> {
  const adminClient = createAuthClient();
  
  const updateData: {
    dropped_in: boolean;
    user_latitude?: number;
    user_longitude?: number;
  } = {
    dropped_in: droppedIn,
  };

  if (droppedIn && latitude !== undefined && longitude !== undefined) {
    updateData.user_latitude = latitude;
    updateData.user_longitude = longitude;
  }

  const { error } = await adminClient
    .from("user_info")
    .update(updateData)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

/**
 * Get user's connection arrays directly (for verification)
 */
export async function getUserConnectionArrays(userId: string): Promise<{
  connections_active: string[];
  connections_pending: string[];
  connections_incoming: string[];
  connections_blocked: string[];
}> {
  const adminClient = createAuthClient();
  
  const { data, error } = await adminClient
    .from("user_info")
    .select("connections_active, connections_pending, connections_incoming, connections_blocked")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return {
    connections_active: (data?.connections_active as string[]) || [],
    connections_pending: (data?.connections_pending as string[]) || [],
    connections_incoming: (data?.connections_incoming as string[]) || [],
    connections_blocked: (data?.connections_blocked as string[]) || [],
  };
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a function with retry logic
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

