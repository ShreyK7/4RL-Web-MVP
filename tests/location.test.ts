/**
 * Location Function Tests
 * Tests all location-related backend functions with edge cases
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
import { calculateDistance } from "../src/utils/supabase/location";

const adminClient = createAuthClient();

/**
 * Test getCurrentUserLocation edge cases
 */
async function testGetCurrentUserLocation() {
  console.log("  Testing getCurrentUserLocation...");

  // Test 1: User with location set
  try {
    const user1 = await createTestUser(
      `test_location1_${Date.now()}@test.com`,
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
      .select("user_latitude, user_longitude")
      .eq("user_id", user1.id)
      .single();

    if (data?.user_latitude !== latitude || data?.user_longitude !== longitude) {
      errorLogger.logError(
        "testGetCurrentUserLocation",
        "getCurrentUserLocation",
        new Error("Location not retrieved correctly"),
        { userId: user1.id, expected: { latitude, longitude }, actual: data }
      );
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testGetCurrentUserLocation", "with_location", error);
  }

  // Test 2: User with no location
  try {
    const user2 = await createTestUser(
      `test_location2_${Date.now()}@test.com`,
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

    const { data } = await adminClient
      .from("user_info")
      .select("user_latitude, user_longitude")
      .eq("user_id", user2.id)
      .single();

    if (data?.user_latitude !== null || data?.user_longitude !== null) {
      errorLogger.logError(
        "testGetCurrentUserLocation",
        "getCurrentUserLocation",
        new Error("Location should be null"),
        { userId: user2.id, actual: data }
      );
    }

    await deleteTestUser(user2.id);
  } catch (error) {
    errorLogger.logError("testGetCurrentUserLocation", "no_location", error);
  }

  // Test 3: Non-existent user
  try {
    const { data, error } = await adminClient
      .from("user_info")
      .select("user_latitude, user_longitude")
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .single();

    if (error && error.code !== "PGRST116") {
      errorLogger.logError("testGetCurrentUserLocation", "non_existent_user", error);
    }
  } catch (error) {
    errorLogger.logError("testGetCurrentUserLocation", "non_existent_user", error);
  }
}

/**
 * Test calculateDistance edge cases
 */
async function testCalculateDistance() {
  console.log("  Testing calculateDistance...");

  // Test 1: Same location (should be 0)
  try {
    const distance = await calculateDistance(37.7749, -122.4194, 37.7749, -122.4194);
    if (distance !== 0) {
      errorLogger.logError(
        "testCalculateDistance",
        "calculateDistance",
        new Error("Distance between same points should be 0"),
        { distance, expected: 0 }
      );
    }
  } catch (error) {
    errorLogger.logError("testCalculateDistance", "same_location", error);
  }

  // Test 2: Known distance (San Francisco to New York ~2560 miles)
  try {
    const distance = await calculateDistance(37.7749, -122.4194, 40.7128, -74.006);
    const expected = 2560;
    const tolerance = 50; // Allow 50 miles tolerance

    if (Math.abs(distance - expected) > tolerance) {
      errorLogger.logError(
        "testCalculateDistance",
        "calculateDistance",
        new Error("Distance calculation incorrect"),
        { distance, expected, tolerance }
      );
    }
  } catch (error) {
    errorLogger.logError("testCalculateDistance", "known_distance", error);
  }

  // Test 3: Very close locations
  try {
    const distance = await calculateDistance(37.7749, -122.4194, 37.775, -122.4195);
    if (distance < 0) {
      errorLogger.logError(
        "testCalculateDistance",
        "calculateDistance",
        new Error("Distance should not be negative"),
        { distance }
      );
    }
  } catch (error) {
    errorLogger.logError("testCalculateDistance", "close_locations", error);
  }

  // Test 4: Opposite sides of the globe
  try {
    const distance = await calculateDistance(0, 0, 0, 180);
    // Should be approximately half the Earth's circumference
    const expected = 12430; // Approximate
    const tolerance = 100;

    if (Math.abs(distance - expected) > tolerance) {
      errorLogger.logError(
        "testCalculateDistance",
        "calculateDistance",
        new Error("Distance calculation for opposite sides incorrect"),
        { distance, expected, tolerance }
      );
    }
  } catch (error) {
    errorLogger.logError("testCalculateDistance", "opposite_sides", error);
  }

  // Test 5: Edge cases with boundary coordinates
  try {
    // North pole
    const distance1 = await calculateDistance(90, 0, 0, 0);
    if (distance1 < 0) {
      errorLogger.logError(
        "testCalculateDistance",
        "calculateDistance",
        new Error("Distance should not be negative"),
        { testCase: "north_pole", distance: distance1 }
      );
    }

    // South pole
    const distance2 = await calculateDistance(-90, 0, 0, 0);
    if (distance2 < 0) {
      errorLogger.logError(
        "testCalculateDistance",
        "calculateDistance",
        new Error("Distance should not be negative"),
        { testCase: "south_pole", distance: distance2 }
      );
    }

    // Date line crossing
    const distance3 = await calculateDistance(0, 179, 0, -179);
    if (distance3 < 0) {
      errorLogger.logError(
        "testCalculateDistance",
        "calculateDistance",
        new Error("Distance should not be negative"),
        { testCase: "date_line", distance: distance3 }
      );
    }
  } catch (error) {
    errorLogger.logError("testCalculateDistance", "boundary_coordinates", error);
  }

  // Test 6: Invalid coordinates (should still calculate, but may give unexpected results)
  try {
    // These are technically invalid but function may still run
    const distance = await calculateDistance(200, 200, 37.7749, -122.4194);
    console.log(`    Warning: Invalid coordinates accepted, distance: ${distance}`);
  } catch (error) {
    // Expected if validation is added
    console.log(`    Invalid coordinates rejected (expected): ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function runLocationTests() {
  await testGetCurrentUserLocation();
  await testCalculateDistance();
}

// Run if executed directly (not imported)
if (process.argv[1]?.includes('location.test')) {
  runLocationTests()
    .then(() => {
      console.log("\nLocation tests completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

