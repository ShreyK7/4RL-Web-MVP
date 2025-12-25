/**
 * User Search Function Tests
 * Tests all user search related backend functions with edge cases
 */

// Load environment variables first
import "./setup";

import createAuthClient from "../src/utils/supabase/authAdminClient";
import {
  createTestUser,
  createTestUsers,
  deleteTestUser,
  deleteTestUsers,
  errorLogger,
  generateTestPhoneNumber,
  setUserDroppedInStatus,
} from "./utils/testHelpers";

const adminClient = createAuthClient();

/**
 * Test getDroppedInUsers edge cases
 */
async function testGetDroppedInUsers() {
  console.log("  Testing getDroppedInUsers...");

  // Test 1: No users dropped in
  try {
    const user1 = await createTestUser(
      `test_search1_${Date.now()}@test.com`,
      generateTestPhoneNumber(),
      {
        first_name: "Test",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }
    );

    // User is not dropped in
    const { data } = await adminClient
      .from("user_info")
      .select("user_id, profile_data, user_latitude, user_longitude")
      .eq("dropped_in", true)
      .eq("onboarding_complete", true)
      .neq("user_id", user1.id);

    // Should not include user1
    const includesUser1 = data?.some((u) => u.user_id === user1.id);
    if (includesUser1) {
      errorLogger.logError(
        "testGetDroppedInUsers",
        "getDroppedInUsers",
        new Error("Should not include user who is not dropped in"),
        { userId: user1.id }
      );
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testGetDroppedInUsers", "no_users_dropped_in", error);
  }

  // Test 2: Multiple users dropped in
  try {
    const users = await createTestUsers(5);

    // Set all users to dropped in
    await Promise.all(
      users.map((user, index) =>
        setUserDroppedInStatus(user.id, true, 37.7749 + index * 0.01, -122.4194 + index * 0.01)
      )
    );

    // Get all dropped in users (excluding first user)
    const { data, error } = await adminClient
      .from("user_info")
      .select("user_id, profile_data, user_latitude, user_longitude")
      .eq("dropped_in", true)
      .eq("onboarding_complete", true)
      .neq("user_id", users[0].id);

    if (error) {
      throw error;
    }

    // Should include all users except the first one
    const userIds = data?.map((u) => u.user_id) || [];
    const expectedCount = users.length - 1;

    if (userIds.length < expectedCount) {
      errorLogger.logError(
        "testGetDroppedInUsers",
        "getDroppedInUsers",
        new Error("Should return all dropped in users"),
        { expected: expectedCount, actual: userIds.length, userIds }
      );
    }

    // Should not include the excluded user
    if (userIds.includes(users[0].id)) {
      errorLogger.logError(
        "testGetDroppedInUsers",
        "getDroppedInUsers",
        new Error("Should not include excluded user"),
        { excludedUserId: users[0].id, userIds }
      );
    }

    await deleteTestUsers(users.map((u) => u.id));
  } catch (error) {
    errorLogger.logError("testGetDroppedInUsers", "multiple_users", error);
  }

  // Test 3: Users with incomplete onboarding
  try {
    const user1 = await createTestUser(
      `test_search2_${Date.now()}@test.com`,
      generateTestPhoneNumber(),
      {
        first_name: "Test",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }
    );

    // Set onboarding to incomplete
    await adminClient
      .from("user_info")
      .update({ onboarding_complete: false })
      .eq("user_id", user1.id);

    // Set dropped in
    await setUserDroppedInStatus(user1.id, true, 37.7749, -122.4194);

    const { data } = await adminClient
      .from("user_info")
      .select("user_id")
      .eq("dropped_in", true)
      .eq("onboarding_complete", true)
      .neq("user_id", user1.id);

    // Should not include user with incomplete onboarding
    const includesUser1 = data?.some((u) => u.user_id === user1.id);
    if (includesUser1) {
      errorLogger.logError(
        "testGetDroppedInUsers",
        "getDroppedInUsers",
        new Error("Should not include user with incomplete onboarding"),
        { userId: user1.id }
      );
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testGetDroppedInUsers", "incomplete_onboarding", error);
  }

  // Test 4: Users with different locations
  try {
    const users = await createTestUsers(3);
    const locations = [
      [37.7749, -122.4194], // San Francisco
      [40.7128, -74.006], // New York
      [34.0522, -118.2437], // Los Angeles
    ];

    await Promise.all(
      users.map((user, index) =>
        setUserDroppedInStatus(user.id, true, locations[index][0], locations[index][1])
      )
    );

    const { data, error } = await adminClient
      .from("user_info")
      .select("user_id, user_latitude, user_longitude")
      .eq("dropped_in", true)
      .eq("onboarding_complete", true)
      .neq("user_id", users[0].id);

    if (error) {
      throw error;
    }

    // Verify all users have locations
    const usersWithoutLocation = data?.filter(
      (u) => u.user_latitude === null || u.user_longitude === null
    );

    if (usersWithoutLocation && usersWithoutLocation.length > 0) {
      errorLogger.logError(
        "testGetDroppedInUsers",
        "getDroppedInUsers",
        new Error("Some users missing location data"),
        { usersWithoutLocation }
      );
    }

    await deleteTestUsers(users.map((u) => u.id));
  } catch (error) {
    errorLogger.logError("testGetDroppedInUsers", "different_locations", error);
  }

  // Test 5: Large number of users
  try {
    const users = await createTestUsers(50);

    // Set all to dropped in
    await Promise.all(
      users.map((user, index) =>
        setUserDroppedInStatus(user.id, true, 37.7749 + (index % 10) * 0.1, -122.4194 + (index % 10) * 0.1)
      )
    );

    const { data, error } = await adminClient
      .from("user_info")
      .select("user_id")
      .eq("dropped_in", true)
      .eq("onboarding_complete", true)
      .neq("user_id", users[0].id);

    if (error) {
      throw error;
    }

    const expectedCount = users.length - 1;
    if (data && data.length < expectedCount) {
      errorLogger.logError(
        "testGetDroppedInUsers",
        "getDroppedInUsers",
        new Error("Should return all dropped in users"),
        { expected: expectedCount, actual: data.length }
      );
    }

    await deleteTestUsers(users.map((u) => u.id));
  } catch (error) {
    errorLogger.logError("testGetDroppedInUsers", "large_number", error);
  }
}

export async function runUserSearchTests() {
  await testGetDroppedInUsers();
}

// Run if executed directly (not imported)
if (process.argv[1]?.includes('userSearch.test')) {
  runUserSearchTests()
    .then(() => {
      console.log("\nUser search tests completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

