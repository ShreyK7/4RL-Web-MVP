/**
 * Test Session Utilities
 * Provides utilities to create test sessions and mock Next.js cookies
 * so we can test actual application functions
 */

import createAuthClient from "../../src/utils/supabase/authAdminClient";

const adminClient = createAuthClient();

/**
 * Create a session for a test user and return session tokens
 * This allows us to test actual server actions
 */
export async function createTestSession(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // Generate a session using admin API
  const { data: sessionData, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: `test_${userId}@test.com`,
  });

  if (error || !sessionData) {
    throw new Error(`Failed to generate session: ${error?.message || "Unknown error"}`);
  }

  // Get the user's current session
  const { data: userData } = await adminClient.auth.admin.getUserById(userId);
  
  if (!userData.user) {
    throw new Error("User not found");
  }

  // Create a session token manually using admin API
  // Note: This is a workaround since we can't easily create sessions via admin API
  // We'll need to use a different approach - setting cookies directly
  
  // For now, return placeholder tokens - we'll handle this differently
  return {
    accessToken: `test_access_${userId}`,
    refreshToken: `test_refresh_${userId}`,
  };
}

/**
 * Mock Next.js cookies() function to return test user session
 * This allows server actions to work in tests
 */
export function mockCookiesForUser(userId: string, accessToken: string): void {
  // Store the mock in a global that can be accessed by serverClient
  (global as any).__TEST_USER_ID__ = userId;
  (global as any).__TEST_ACCESS_TOKEN__ = accessToken;
}

/**
 * Clear test user mock
 */
export function clearMockCookies(): void {
  delete (global as any).__TEST_USER_ID__;
  delete (global as any).__TEST_ACCESS_TOKEN__;
}

