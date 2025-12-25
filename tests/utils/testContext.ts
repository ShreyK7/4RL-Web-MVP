/**
 * Test Context Manager
 * Manages user sessions and provides context for testing server actions
 * 
 * Note: Since server actions rely on Next.js cookies, we need to create
 * a workaround. This file provides utilities to test functions that require
 * user context.
 */

import { cookies } from "next/headers";
import createAuthClient from "../../src/utils/supabase/authAdminClient";

/**
 * Create a mock cookie store for a specific user
 * This is a workaround since we can't easily mock Next.js cookies in Node.js tests
 */
export class TestContext {
  private userId: string;
  private adminClient: ReturnType<typeof createAuthClient>;

  constructor(userId: string) {
    this.userId = userId;
    this.adminClient = createAuthClient();
  }

  getUserId(): string {
    return this.userId;
  }

  /**
   * Get admin client for direct database operations
   */
  getAdminClient() {
    return this.adminClient;
  }

  /**
   * Create a session for the test user
   * This creates a real session that can be used with server actions
   */
  async createSession(): Promise<string> {
    // Get user email
    const { data: userData, error: userError } = await this.adminClient.auth.admin.getUserById(this.userId);
    
    if (userError || !userData.user) {
      throw new Error(`Failed to get user: ${userError?.message || "Unknown error"}`);
    }

    // Generate a magic link token that we can use
    const { data: linkData, error: linkError } = await this.adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email || `test_${this.userId}@test.com`,
    });

    if (linkError || !linkData) {
      throw new Error(`Failed to generate link: ${linkError?.message || "Unknown error"}`);
    }

    return linkData.properties?.hashed_token || "";
  }
}

/**
 * Wrapper to execute a server action with a specific user context
 * This is a workaround - in a real test environment, you'd need to mock Next.js cookies
 */
export async function withUserContext<T>(
  userId: string,
  action: (context: TestContext) => Promise<T>
): Promise<T> {
  const context = new TestContext(userId);
  return action(context);
}

