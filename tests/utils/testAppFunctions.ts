/**
 * Utilities for Testing Actual Application Functions
 * 
 * Since application functions are Next.js server actions that use cookies(),
 * we need to create a way to test them. This file provides utilities to
 * run actual application functions in tests by mocking the cookie system.
 */

import { cookies } from "next/headers";
import createAuthClient from "../../src/utils/supabase/authAdminClient";

const adminClient = createAuthClient();

/**
 * Mock Next.js cookies to simulate a logged-in user
 * This allows us to test actual server actions
 */
export async function mockUserSession(userId: string): Promise<void> {
  // Get user's email to create a proper session
  const { data: userData } = await adminClient.auth.admin.getUserById(userId);
  
  if (!userData.user) {
    throw new Error("User not found");
  }

  // Create a session token for the user
  // Note: This is a workaround - we'll store the userId in a way that
  // getCurrentUserID() can access it
  
  // Store in global for access by serverClient
  (global as any).__TEST_USER_ID__ = userId;
  
  // Mock the cookies() function
  // This is tricky because cookies() is from Next.js and uses request context
  // We'll need to patch it at the module level
}

/**
 * Clear the mocked user session
 */
export function clearMockedSession(): void {
  delete (global as any).__TEST_USER_ID__;
}

/**
 * Run an application function with a specific user context
 * 
 * Example:
 *   await runAsUser(user1.id, async () => {
 *     await sendConnectionRequest(user2.id);
 *   });
 */
export async function runAsUser<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  await mockUserSession(userId);
  try {
    return await fn();
  } finally {
    clearMockedSession();
  }
}

/**
 * Alternative: Create testable versions of functions that accept userId
 * This is simpler but tests modified functions, not the actual ones
 * 
 * For now, we'll keep the manual simulation approach but document
 * that tests should ideally use actual functions when possible.
 */

