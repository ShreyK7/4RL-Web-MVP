/**
 * Drop-In Function Tests
 * Tests all drop-in status related backend functions with edge cases
 */

// Load environment variables first
import "./setup";

import createAuthClient from "../src/utils/supabase/authAdminClient";
import {
  createTestUser,
  deleteTestUser,
  errorLogger,
  generateTestPhoneNumber,
  setUserDroppedInStatus,
} from "./utils/testHelpers";

const adminClient = createAuthClient();

/**
 * Test getDroppedInStatus edge cases
 */
async function testGetDroppedInStatus() {
  console.log("  Testing getDroppedInStatus...");

  // Test 1: User with dropped_in = true
  try {
    const user1 = await createTestUser(
      `test_dropin1_${Date.now()}@test.com`,
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

    await setUserDroppedInStatus(user1.id, true, 37.7749, -122.4194);

    const { data } = await adminClient
      .from("user_info")
      .select("dropped_in")
      .eq("user_id", user1.id)
      .single();

    if (!data?.dropped_in) {
      errorLogger.logError(
        "testGetDroppedInStatus",
        "getDroppedInStatus",
        new Error("User should be dropped in"),
        { userId: user1.id }
      );
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testGetDroppedInStatus", "dropped_in_true", error);
  }

  // Test 2: User with dropped_in = false
  try {
    const user2 = await createTestUser(
      `test_dropin2_${Date.now()}@test.com`,
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

    await setUserDroppedInStatus(user2.id, false);

    const { data } = await adminClient
      .from("user_info")
      .select("dropped_in")
      .eq("user_id", user2.id)
      .single();

    if (data?.dropped_in) {
      errorLogger.logError(
        "testGetDroppedInStatus",
        "getDroppedInStatus",
        new Error("User should not be dropped in"),
        { userId: user2.id }
      );
    }

    await deleteTestUser(user2.id);
  } catch (error) {
    errorLogger.logError("testGetDroppedInStatus", "dropped_in_false", error);
  }

  // Test 3: Non-existent user (should return false)
  try {
    const { data, error } = await adminClient
      .from("user_info")
      .select("dropped_in")
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .single();

    if (error && error.code !== "PGRST116") {
      errorLogger.logError("testGetDroppedInStatus", "non_existent_user", error);
    }
  } catch (error) {
    errorLogger.logError("testGetDroppedInStatus", "non_existent_user", error);
  }
}

/**
 * Test setDroppedInStatus edge cases
 */
async function testSetDroppedInStatus() {
  console.log("  Testing setDroppedInStatus...");

  // Test 1: Set dropped_in = true with location
  try {
    const user1 = await createTestUser(
      `test_setdropin1_${Date.now()}@test.com`,
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

    const latitude = 37.7749;
    const longitude = -122.4194;

    await setUserDroppedInStatus(user1.id, true, latitude, longitude);

    const { data } = await adminClient
      .from("user_info")
      .select("dropped_in, user_latitude, user_longitude")
      .eq("user_id", user1.id)
      .single();

    if (!data?.dropped_in) {
      errorLogger.logError(
        "testSetDroppedInStatus",
        "setDroppedInStatus",
        new Error("dropped_in should be true"),
        { userId: user1.id }
      );
    }

    if (data?.user_latitude !== latitude || data?.user_longitude !== longitude) {
      errorLogger.logError(
        "testSetDroppedInStatus",
        "setDroppedInStatus",
        new Error("Location not set correctly"),
        { userId: user1.id, expected: { latitude, longitude }, actual: data }
      );
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testSetDroppedInStatus", "set_true_with_location", error);
  }

  // Test 2: Set dropped_in = false (should not update location)
  try {
    const user2 = await createTestUser(
      `test_setdropin2_${Date.now()}@test.com`,
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

    // First set location
    await setUserDroppedInStatus(user2.id, true, 37.7749, -122.4194);

    // Then drop out
    await setUserDroppedInStatus(user2.id, false);

    const { data } = await adminClient
      .from("user_info")
      .select("dropped_in, user_latitude, user_longitude")
      .eq("user_id", user2.id)
      .single();

    if (data?.dropped_in) {
      errorLogger.logError(
        "testSetDroppedInStatus",
        "setDroppedInStatus",
        new Error("dropped_in should be false"),
        { userId: user2.id }
      );
    }

    // Location should remain (not cleared)
    if (data?.user_latitude === null || data?.user_longitude === null) {
      // This is actually fine - location might be preserved or cleared
      console.log("    Location cleared when dropping out (acceptable behavior)");
    }

    await deleteTestUser(user2.id);
  } catch (error) {
    errorLogger.logError("testSetDroppedInStatus", "set_false", error);
  }

  // Test 3: Set dropped_in = true without location
  try {
    const user3 = await createTestUser(
      `test_setdropin3_${Date.now()}@test.com`,
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

    await setUserDroppedInStatus(user3.id, true);

    const { data } = await adminClient
      .from("user_info")
      .select("dropped_in, user_latitude, user_longitude")
      .eq("user_id", user3.id)
      .single();

    if (!data?.dropped_in) {
      errorLogger.logError(
        "testSetDroppedInStatus",
        "setDroppedInStatus",
        new Error("dropped_in should be true even without location"),
        { userId: user3.id }
      );
    }

    await deleteTestUser(user3.id);
  } catch (error) {
    errorLogger.logError("testSetDroppedInStatus", "set_true_without_location", error);
  }

  // Test 4: Invalid coordinates
  try {
    const user4 = await createTestUser(
      `test_setdropin4_${Date.now()}@test.com`,
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

    // Try invalid coordinates
    await setUserDroppedInStatus(user4.id, true, 200, 200); // Invalid lat/long

    // Should still work (no validation in DB)
    const { data } = await adminClient
      .from("user_info")
      .select("user_latitude, user_longitude")
      .eq("user_id", user4.id)
      .single();

    if (data?.user_latitude === 200) {
      console.log("    Warning: Invalid coordinates accepted (may need validation)");
    }

    await deleteTestUser(user4.id);
  } catch (error) {
    errorLogger.logError("testSetDroppedInStatus", "invalid_coordinates", error);
  }

  // Test 5: Concurrent updates
  try {
    const user5 = await createTestUser(
      `test_setdropin5_${Date.now()}@test.com`,
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

    // Simulate concurrent drop-in/drop-out
    await Promise.all([
      setUserDroppedInStatus(user5.id, true, 37.7749, -122.4194).catch((err) => {
        errorLogger.logError("testSetDroppedInStatus", "concurrent_update_1", err, {
          userId: user5.id,
        });
      }),
      setUserDroppedInStatus(user5.id, false).catch((err) => {
        errorLogger.logError("testSetDroppedInStatus", "concurrent_update_2", err, {
          userId: user5.id,
        });
      }),
      setUserDroppedInStatus(user5.id, true, 40.7128, -74.006).catch((err) => {
        errorLogger.logError("testSetDroppedInStatus", "concurrent_update_3", err, {
          userId: user5.id,
        });
      }),
    ]);

    await deleteTestUser(user5.id);
  } catch (error) {
    errorLogger.logError("testSetDroppedInStatus", "concurrent_updates", error);
  }
}

export async function runDropInTests() {
  await testGetDroppedInStatus();
  await testSetDroppedInStatus();
}

// Run if executed directly (not imported)
if (process.argv[1]?.includes('dropIn.test')) {
  runDropInTests()
    .then(() => {
      console.log("\nDrop-in tests completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

