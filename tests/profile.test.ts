/**
 * Profile Function Tests
 * Tests all profile-related backend functions with edge cases
 */

// Load environment variables first
import "./setup";

import createAuthClient from "../src/utils/supabase/authAdminClient";
import { profileData } from "../src/utils/types/userDataTypes";
import {
  createTestUser,
  deleteTestUser,
  errorLogger,
  generateTestPhoneNumber,
  type TestUser,
} from "./utils/testHelpers";

const adminClient = createAuthClient();

/**
 * Test getProfileData edge cases
 */
async function testGetProfileData() {
  console.log("  Testing getProfileData...");

  // Test 1: User with no profile data
  try {
    const user1 = await createTestUser(
      `test_getprofile_${Date.now()}@test.com`,
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

    // Directly test via admin client (since we can't easily mock cookies)
    const { data, error } = await adminClient
      .from("user_info")
      .select("profile_data")
      .eq("user_id", user1.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!data?.profile_data) {
      errorLogger.logError("testGetProfileData", "getProfileData", new Error("Profile data is null"), {
        userId: user1.id,
        testCase: "user_with_no_profile_data",
      });
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testGetProfileData", "setup", error, { testCase: "user_with_no_profile_data" });
  }

  // Test 2: User with complete profile data
  try {
    const profileData: profileData = {
      first_name: "John",
      last_name: "Doe",
      age: 30,
      pronouns: "he/him/his",
      about: "Test about me",
      hometown: "New York",
      baseCity: "San Francisco",
      interests: ["coding", "hiking", "music"],
    };

    const user2 = await createTestUser(
      `test_getprofile2_${Date.now()}@test.com`,
      generateTestPhoneNumber(),
      profileData
    );

    const { data, error } = await adminClient
      .from("user_info")
      .select("profile_data")
      .eq("user_id", user2.id)
      .single();

    if (error) {
      throw error;
    }

    const retrieved = data?.profile_data as profileData;
    if (retrieved.first_name !== profileData.first_name) {
      errorLogger.logError(
        "testGetProfileData",
        "getProfileData",
        new Error("Profile data mismatch"),
        { userId: user2.id, testCase: "complete_profile_data" }
      );
    }

    await deleteTestUser(user2.id);
  } catch (error) {
    errorLogger.logError("testGetProfileData", "setup", error, { testCase: "complete_profile_data" });
  }

  // Test 3: Non-existent user
  try {
    const { data, error } = await adminClient
      .from("user_info")
      .select("profile_data")
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .single();

    if (error && error.code !== "PGRST116") {
      errorLogger.logError(
        "testGetProfileData",
        "getProfileData",
        error,
        { testCase: "non_existent_user" }
      );
    }
  } catch (error) {
    errorLogger.logError("testGetProfileData", "non_existent_user", error);
  }
}

/**
 * Test uploadProfileData edge cases
 */
async function testUploadProfileData() {
  console.log("  Testing uploadProfileData...");

  // Test 1: Upload complete profile data
  try {
    const user1 = await createTestUser(
      `test_upload_${Date.now()}@test.com`,
      generateTestPhoneNumber(),
      {
        first_name: "Initial",
        last_name: "Name",
        age: 20,
        pronouns: "they/them/theirs",
        about: "Initial",
        hometown: "Initial",
        baseCity: "Initial",
        interests: [],
      }
    );

    const newProfileData: profileData = {
      first_name: "Updated",
      last_name: "Name",
      age: 25,
      pronouns: "he/him/his",
      about: "Updated about",
      hometown: "Updated",
      baseCity: "Updated",
      interests: ["new", "interests"],
    };

    const { error } = await adminClient
      .from("user_info")
      .upsert(
        {
          user_id: user1.id,
          profile_data: newProfileData,
          onboarding_complete: true,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw error;
    }

    // Verify update
    const { data } = await adminClient
      .from("user_info")
      .select("profile_data")
      .eq("user_id", user1.id)
      .single();

    const retrieved = data?.profile_data as profileData;
    if (retrieved.first_name !== newProfileData.first_name) {
      errorLogger.logError(
        "testUploadProfileData",
        "uploadProfileData",
        new Error("Profile data not updated correctly"),
        { userId: user1.id }
      );
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testUploadProfileData", "uploadProfileData", error);
  }

  // Test 2: Upload with missing required fields
  try {
    const user2 = await createTestUser(
      `test_upload2_${Date.now()}@test.com`,
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

    // Try to upload incomplete data (this should fail validation if there are constraints)
    const incompleteData = {
      first_name: "Only",
      // Missing other fields
    };

    const { error } = await adminClient
      .from("user_info")
      .update({ profile_data: incompleteData })
      .eq("user_id", user2.id);

    // Log if there's an error (expected) or if it succeeds (unexpected)
    if (error) {
      // Expected - log as info, not error
      console.log(`    Expected validation error: ${error.message}`);
    } else {
      errorLogger.logError(
        "testUploadProfileData",
        "uploadProfileData",
        new Error("Incomplete data was accepted"),
        { userId: user2.id, testCase: "incomplete_data" }
      );
    }

    await deleteTestUser(user2.id);
  } catch (error) {
    errorLogger.logError("testUploadProfileData", "incomplete_data", error);
  }

  // Test 3: Concurrent updates
  try {
    const user3 = await createTestUser(
      `test_upload3_${Date.now()}@test.com`,
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

    // Simulate concurrent updates
    const updates = [
      { first_name: "Update1" },
      { first_name: "Update2" },
      { first_name: "Update3" },
    ];

    await Promise.all(
      updates.map(async (update) => {
        try {
          await adminClient
            .from("user_info")
            .update({ profile_data: { ...update } })
            .eq("user_id", user3.id);
        } catch (err) {
          errorLogger.logError("testUploadProfileData", "concurrent_update", err, {
            userId: user3.id,
            update,
          });
        }
      })
    );

    await deleteTestUser(user3.id);
  } catch (error) {
    errorLogger.logError("testUploadProfileData", "concurrent_updates", error);
  }
}

/**
 * Test updateProfileData edge cases
 */
async function testUpdateProfileData() {
  console.log("  Testing updateProfileData...");

  // Similar to uploadProfileData but without onboarding_complete
  try {
    const user = await createTestUser(
      `test_update_${Date.now()}@test.com`,
      generateTestPhoneNumber(),
      {
        first_name: "Original",
        last_name: "Name",
        age: 20,
        pronouns: "they/them/theirs",
        about: "Original",
        hometown: "Original",
        baseCity: "Original",
        interests: [],
      }
    );

    const updatedData: profileData = {
      first_name: "Updated",
      last_name: "Name",
      age: 30,
      pronouns: "she/her/hers",
      about: "Updated about me",
      hometown: "Updated",
      baseCity: "Updated",
      interests: ["updated", "interests"],
    };

    const { error } = await adminClient
      .from("user_info")
      .upsert(
        {
          user_id: user.id,
          profile_data: updatedData,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw error;
    }

    await deleteTestUser(user.id);
  } catch (error) {
    errorLogger.logError("testUpdateProfileData", "updateProfileData", error);
  }
}

/**
 * Test getProfilePhotoUrl edge cases
 */
async function testGetProfilePhotoUrl() {
  console.log("  Testing getProfilePhotoUrl...");

  // Test 1: User with no photo
  try {
    const user1 = await createTestUser(
      `test_photo1_${Date.now()}@test.com`,
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

    const { data: files } = await adminClient.storage
      .from("user_profile_photos")
      .list(user1.id, { limit: 1 });

    if (files && files.length > 0) {
      errorLogger.logError(
        "testGetProfilePhotoUrl",
        "getProfilePhotoUrl",
        new Error("User should have no photos"),
        { userId: user1.id }
      );
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testGetProfilePhotoUrl", "no_photo", error);
  }

  // Test 2: Non-existent user
  try {
    const { data: files, error } = await adminClient.storage
      .from("user_profile_photos")
      .list("00000000-0000-0000-0000-000000000000", { limit: 1 });

    if (error) {
      // Expected - log as info
      console.log(`    Expected error for non-existent user: ${error.message}`);
    }
  } catch (error) {
    errorLogger.logError("testGetProfilePhotoUrl", "non_existent_user", error);
  }
}

/**
 * Test getOnboardingStatus edge cases
 */
async function testGetOnboardingStatus() {
  console.log("  Testing getOnboardingStatus...");

  // Test 1: User with onboarding_complete = true
  try {
    const user1 = await createTestUser(
      `test_onboard1_${Date.now()}@test.com`,
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
      .select("onboarding_complete")
      .eq("user_id", user1.id)
      .single();

    if (!data?.onboarding_complete) {
      errorLogger.logError(
        "testGetOnboardingStatus",
        "getOnboardingStatus",
        new Error("Onboarding should be complete"),
        { userId: user1.id }
      );
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testGetOnboardingStatus", "onboarding_complete", error);
  }

  // Test 2: User with onboarding_complete = false
  try {
    const user2 = await createTestUser(
      `test_onboard2_${Date.now()}@test.com`,
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

    await adminClient
      .from("user_info")
      .update({ onboarding_complete: false })
      .eq("user_id", user2.id);

    const { data } = await adminClient
      .from("user_info")
      .select("onboarding_complete")
      .eq("user_id", user2.id)
      .single();

    if (data?.onboarding_complete) {
      errorLogger.logError(
        "testGetOnboardingStatus",
        "getOnboardingStatus",
        new Error("Onboarding should not be complete"),
        { userId: user2.id }
      );
    }

    await deleteTestUser(user2.id);
  } catch (error) {
    errorLogger.logError("testGetOnboardingStatus", "onboarding_incomplete", error);
  }

  // Test 3: Non-existent user
  try {
    const { data, error } = await adminClient
      .from("user_info")
      .select("onboarding_complete")
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .single();

    if (error && error.code !== "PGRST116") {
      errorLogger.logError("testGetOnboardingStatus", "non_existent_user", error);
    }
  } catch (error) {
    errorLogger.logError("testGetOnboardingStatus", "non_existent_user", error);
  }
}

export async function runProfileTests() {
  await testGetProfileData();
  await testUploadProfileData();
  await testUpdateProfileData();
  await testGetProfilePhotoUrl();
  await testGetOnboardingStatus();
}

// Run if executed directly (not imported)
if (process.argv[1]?.includes('profile.test')) {
  runProfileTests()
    .then(() => {
      console.log("\nProfile tests completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

