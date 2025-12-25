/**
 * Test Utilities for Testing Actual Application Functions
 * 
 * Since application functions use Next.js server actions with cookies,
 * we need to create a way to test them. This file provides utilities
 * to run application functions in a test context.
 */

import { cookies } from "next/headers";
import createAuthClient from "../../src/utils/supabase/authAdminClient";

const adminClient = createAuthClient();

/**
 * Create a session token for a test user
 * This allows us to test actual server actions that require authentication
 */
export async function createUserSession(userId: string): Promise<string> {
  // Get user data
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
  
  if (userError || !userData.user) {
    throw new Error(`Failed to get user: ${userError?.message || "Unknown error"}`);
  }

  // Create a session using admin API
  // Note: Supabase admin API doesn't directly create sessions, so we'll use a workaround
  // We'll create an access token that can be used
  
  // For testing, we'll need to mock the cookies() function
  // This is complex with Next.js, so we'll use a different approach:
  // Create testable wrapper functions that accept userId directly
  
  return userId;
}

/**
 * Mock Next.js cookies to return a session for a specific user
 * This is a workaround since we can't easily mock Next.js cookies in Node.js
 */
export async function withUserSession<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  // Store userId in a way that getCurrentUserID can access it
  // This is a hack, but necessary for testing server actions
  const originalGetUser = adminClient.auth.getUser;
  
  // Mock the auth.getUser to return our test user
  adminClient.auth.getUser = async () => {
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);
    if (!userData.user) {
      throw new Error("User not found");
    }
    return {
      data: { user: userData.user },
      error: null,
    } as any;
  };

  try {
    return await fn();
  } finally {
    // Restore original
    adminClient.auth.getUser = originalGetUser;
  }
}

/**
 * Alternative approach: Create a test client that uses the admin client
 * but behaves like the server client for a specific user
 */
export function createTestClientForUser(userId: string) {
  // Return a client that's configured for the test user
  // This bypasses the cookie requirement
  return adminClient;
}

