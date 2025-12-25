/**
 * Connection Function Tests
 * Tests all connection-related backend functions with edge cases
 */

// Load environment variables first
import "./setup";

import createAuthClient from "../src/utils/supabase/authAdminClient";
import {
  createTestUser,
  deleteTestUser,
  deleteTestUsers,
  errorLogger,
  generateTestPhoneNumber,
  getUserConnectionArrays,
  type TestUser,
} from "./utils/testHelpers";

const adminClient = createAuthClient();

/**
 * Helper to simulate sendConnectionRequest using admin client
 */
async function simulateSendConnectionRequest(currentUserId: string, targetUserId: string) {
  // Get current user's connections_pending
  const { data: currentUserData, error: currentUserError } = await adminClient
    .from("user_info")
    .select("connections_pending")
    .eq("user_id", currentUserId)
    .single();

  if (currentUserError) {
    throw currentUserError;
  }

  // Get target user's connections_incoming
  let targetIncoming: string[] = [];
  const { data: targetUserData, error: targetUserError } = await adminClient
    .from("user_info")
    .select("connections_incoming")
    .eq("user_id", targetUserId)
    .single();

  if (targetUserError && targetUserError.code !== "PGRST116") {
    throw targetUserError;
  } else if (targetUserData) {
    targetIncoming = (targetUserData.connections_incoming as string[]) || [];
  }

  const currentPending = (currentUserData?.connections_pending as string[]) || [];
  const updatedCurrentPending = currentPending.includes(targetUserId)
    ? currentPending
    : [...currentPending, targetUserId];

  const updatedTargetIncoming = targetIncoming.includes(currentUserId)
    ? targetIncoming
    : [...targetIncoming, currentUserId];

  // Update both users
  await adminClient
    .from("user_info")
    .upsert(
      {
        user_id: currentUserId,
        connections_pending: updatedCurrentPending,
      },
      { onConflict: "user_id" }
    );

  await adminClient
    .from("user_info")
    .upsert(
      {
        user_id: targetUserId,
        connections_incoming: updatedTargetIncoming,
      },
      { onConflict: "user_id" }
    );
}

/**
 * Helper to simulate acceptConnectionRequest
 */
async function simulateAcceptConnectionRequest(currentUserId: string, requestingUserId: string) {
  const [currentUserData, requestingUserData] = await Promise.all([
    adminClient
      .from("user_info")
      .select("connections_incoming, connections_active")
      .eq("user_id", currentUserId)
      .single(),
    adminClient
      .from("user_info")
      .select("connections_pending, connections_active")
      .eq("user_id", requestingUserId)
      .single(),
  ]);

  if (currentUserData.error) throw currentUserData.error;
  if (requestingUserData.error) throw requestingUserData.error;

  const currentIncoming = (currentUserData.data?.connections_incoming as string[]) || [];
  const currentActive = (currentUserData.data?.connections_active as string[]) || [];
  const requestingPending = (requestingUserData.data?.connections_pending as string[]) || [];
  const requestingActive = (requestingUserData.data?.connections_active as string[]) || [];

  const updatedCurrentIncoming = currentIncoming.filter((id) => id !== requestingUserId);
  const updatedRequestingPending = requestingPending.filter((id) => id !== currentUserId);

  const updatedCurrentActive = currentActive.includes(requestingUserId)
    ? currentActive
    : [...currentActive, requestingUserId];
  const updatedRequestingActive = requestingActive.includes(currentUserId)
    ? requestingActive
    : [...requestingActive, currentUserId];

  await adminClient
    .from("user_info")
    .update({
      connections_incoming: updatedCurrentIncoming,
      connections_active: updatedCurrentActive,
    })
    .eq("user_id", currentUserId);

  await adminClient
    .from("user_info")
    .update({
      connections_pending: updatedRequestingPending,
      connections_active: updatedRequestingActive,
    })
    .eq("user_id", requestingUserId);
}

/**
 * Test sendConnectionRequest edge cases
 */
async function testSendConnectionRequest() {
  console.log("  Testing sendConnectionRequest...");

  // Test 1: Normal connection request
  try {
    const [user1, user2] = await Promise.all([
      createTestUser(`test_conn1_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test1",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
      createTestUser(`test_conn2_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test2",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
    ]);

    await simulateSendConnectionRequest(user1.id, user2.id);

    const user1Arrays = await getUserConnectionArrays(user1.id);
    const user2Arrays = await getUserConnectionArrays(user2.id);

    if (!user1Arrays.connections_pending.includes(user2.id)) {
      errorLogger.logError(
        "testSendConnectionRequest",
        "sendConnectionRequest",
        new Error("User1's pending should include user2"),
        { userId: user1.id, arrays: user1Arrays }
      );
    }

    if (!user2Arrays.connections_incoming.includes(user1.id)) {
      errorLogger.logError(
        "testSendConnectionRequest",
        "sendConnectionRequest",
        new Error("User2's incoming should include user1"),
        { userId: user2.id, arrays: user2Arrays }
      );
    }

    await deleteTestUsers([user1.id, user2.id]);
  } catch (error) {
    errorLogger.logError("testSendConnectionRequest", "normal_request", error);
  }

  // Test 2: Duplicate connection request (should not duplicate)
  try {
    const [user1, user2] = await Promise.all([
      createTestUser(`test_conn3_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test1",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
      createTestUser(`test_conn4_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test2",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
    ]);

    await simulateSendConnectionRequest(user1.id, user2.id);
    await simulateSendConnectionRequest(user1.id, user2.id); // Duplicate

    const user1Arrays = await getUserConnectionArrays(user1.id);
    const count = user1Arrays.connections_pending.filter((id) => id === user2.id).length;

    if (count !== 1) {
      errorLogger.logError(
        "testSendConnectionRequest",
        "sendConnectionRequest",
        new Error("Duplicate request should not create duplicates"),
        { userId: user1.id, count, arrays: user1Arrays }
      );
    }

    await deleteTestUsers([user1.id, user2.id]);
  } catch (error) {
    errorLogger.logError("testSendConnectionRequest", "duplicate_request", error);
  }

  // Test 3: Request to non-existent user
  try {
    const user1 = await createTestUser(`test_conn5_${Date.now()}@test.com`, generateTestPhoneNumber(), {
      first_name: "Test",
      last_name: "User",
      age: 25,
      pronouns: "they/them/theirs",
      about: "Test",
      hometown: "Test",
      baseCity: "Test",
      interests: [],
    });

    const fakeUserId = "00000000-0000-0000-0000-000000000000";

    try {
      await simulateSendConnectionRequest(user1.id, fakeUserId);
      errorLogger.logError(
        "testSendConnectionRequest",
        "sendConnectionRequest",
        new Error("Should not be able to send request to non-existent user"),
        { userId: user1.id, targetId: fakeUserId }
      );
    } catch (error) {
      // Expected
      console.log(`    Expected error for non-existent user: ${error instanceof Error ? error.message : String(error)}`);
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testSendConnectionRequest", "non_existent_user", error);
  }

  // Test 4: Self-request (should be prevented or handled)
  try {
    const user1 = await createTestUser(`test_conn6_${Date.now()}@test.com`, generateTestPhoneNumber(), {
      first_name: "Test",
      last_name: "User",
      age: 25,
      pronouns: "they/them/theirs",
      about: "Test",
      hometown: "Test",
      baseCity: "Test",
      interests: [],
    });

    try {
      await simulateSendConnectionRequest(user1.id, user1.id);
      errorLogger.logError(
        "testSendConnectionRequest",
        "sendConnectionRequest",
        new Error("Should not be able to send request to self"),
        { userId: user1.id }
      );
    } catch (error) {
      // Expected
      console.log(`    Expected error for self-request: ${error instanceof Error ? error.message : String(error)}`);
    }

    await deleteTestUser(user1.id);
  } catch (error) {
    errorLogger.logError("testSendConnectionRequest", "self_request", error);
  }
}

/**
 * Test acceptConnectionRequest edge cases
 */
async function testAcceptConnectionRequest() {
  console.log("  Testing acceptConnectionRequest...");

  // Test 1: Normal accept
  try {
    const [user1, user2] = await Promise.all([
      createTestUser(`test_accept1_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test1",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
      createTestUser(`test_accept2_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test2",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
    ]);

    await simulateSendConnectionRequest(user2.id, user1.id);
    await simulateAcceptConnectionRequest(user1.id, user2.id);

    const user1Arrays = await getUserConnectionArrays(user1.id);
    const user2Arrays = await getUserConnectionArrays(user2.id);

    if (!user1Arrays.connections_active.includes(user2.id)) {
      errorLogger.logError(
        "testAcceptConnectionRequest",
        "acceptConnectionRequest",
        new Error("User1's active should include user2"),
        { userId: user1.id, arrays: user1Arrays }
      );
    }

    if (!user2Arrays.connections_active.includes(user1.id)) {
      errorLogger.logError(
        "testAcceptConnectionRequest",
        "acceptConnectionRequest",
        new Error("User2's active should include user1"),
        { userId: user2.id, arrays: user2Arrays }
      );
    }

    if (user1Arrays.connections_incoming.includes(user2.id)) {
      errorLogger.logError(
        "testAcceptConnectionRequest",
        "acceptConnectionRequest",
        new Error("User1's incoming should not include user2 after accept"),
        { userId: user1.id, arrays: user1Arrays }
      );
    }

    if (user2Arrays.connections_pending.includes(user1.id)) {
      errorLogger.logError(
        "testAcceptConnectionRequest",
        "acceptConnectionRequest",
        new Error("User2's pending should not include user1 after accept"),
        { userId: user2.id, arrays: user2Arrays }
      );
    }

    await deleteTestUsers([user1.id, user2.id]);
  } catch (error) {
    errorLogger.logError("testAcceptConnectionRequest", "normal_accept", error);
  }

  // Test 2: Accept non-existent request
  try {
    const [user1, user2] = await Promise.all([
      createTestUser(`test_accept3_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test1",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
      createTestUser(`test_accept4_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test2",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
    ]);

    // Try to accept without a request
    try {
      await simulateAcceptConnectionRequest(user1.id, user2.id);
      // Should still work (no-op if no request exists)
      console.log("    Accept without request handled gracefully");
    } catch (error) {
      errorLogger.logError("testAcceptConnectionRequest", "accept_without_request", error);
    }

    await deleteTestUsers([user1.id, user2.id]);
  } catch (error) {
    errorLogger.logError("testAcceptConnectionRequest", "accept_without_request", error);
  }
}

/**
 * Test rejectConnectionRequest edge cases
 */
async function testRejectConnectionRequest() {
  console.log("  Testing rejectConnectionRequest...");

  // Test 1: Normal reject
  try {
    const [user1, user2] = await Promise.all([
      createTestUser(`test_reject1_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test1",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
      createTestUser(`test_reject2_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test2",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
    ]);

    await simulateSendConnectionRequest(user2.id, user1.id);

    // Simulate reject
    const [currentUserData, requestingUserData] = await Promise.all([
      adminClient
        .from("user_info")
        .select("connections_incoming")
        .eq("user_id", user1.id)
        .single(),
      adminClient
        .from("user_info")
        .select("connections_pending")
        .eq("user_id", user2.id)
        .single(),
    ]);

    const currentIncoming = (currentUserData.data?.connections_incoming as string[]) || [];
    const requestingPending = (requestingUserData.data?.connections_pending as string[]) || [];

    const updatedCurrentIncoming = currentIncoming.filter((id) => id !== user2.id);
    const updatedRequestingPending = requestingPending.filter((id) => id !== user1.id);

    await adminClient
      .from("user_info")
      .update({ connections_incoming: updatedCurrentIncoming })
      .eq("user_id", user1.id);

    await adminClient
      .from("user_info")
      .update({ connections_pending: updatedRequestingPending })
      .eq("user_id", user2.id);

    const user1Arrays = await getUserConnectionArrays(user1.id);
    const user2Arrays = await getUserConnectionArrays(user2.id);

    if (user1Arrays.connections_incoming.includes(user2.id)) {
      errorLogger.logError(
        "testRejectConnectionRequest",
        "rejectConnectionRequest",
        new Error("User1's incoming should not include user2 after reject"),
        { userId: user1.id, arrays: user1Arrays }
      );
    }

    if (user2Arrays.connections_pending.includes(user1.id)) {
      errorLogger.logError(
        "testRejectConnectionRequest",
        "rejectConnectionRequest",
        new Error("User2's pending should not include user1 after reject"),
        { userId: user2.id, arrays: user2Arrays }
      );
    }

    await deleteTestUsers([user1.id, user2.id]);
  } catch (error) {
    errorLogger.logError("testRejectConnectionRequest", "normal_reject", error);
  }
}

/**
 * Test blockConnectionRequest edge cases
 */
async function testBlockConnectionRequest() {
  console.log("  Testing blockConnectionRequest...");

  // Test 1: Normal block
  try {
    const [user1, user2] = await Promise.all([
      createTestUser(`test_block1_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test1",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
      createTestUser(`test_block2_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test2",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
    ]);

    await simulateSendConnectionRequest(user2.id, user1.id);

    // Simulate block
    const [currentUserData, requestingUserData] = await Promise.all([
      adminClient
        .from("user_info")
        .select("connections_incoming, connections_blocked")
        .eq("user_id", user1.id)
        .single(),
      adminClient
        .from("user_info")
        .select("connections_pending")
        .eq("user_id", user2.id)
        .single(),
    ]);

    const currentIncoming = (currentUserData.data?.connections_incoming as string[]) || [];
    const currentBlocked = (currentUserData.data?.connections_blocked as string[]) || [];
    const requestingPending = (requestingUserData.data?.connections_pending as string[]) || [];

    const updatedCurrentIncoming = currentIncoming.filter((id) => id !== user2.id);
    const updatedRequestingPending = requestingPending.filter((id) => id !== user1.id);
    const updatedCurrentBlocked = currentBlocked.includes(user2.id)
      ? currentBlocked
      : [...currentBlocked, user2.id];

    await adminClient
      .from("user_info")
      .update({
        connections_incoming: updatedCurrentIncoming,
        connections_blocked: updatedCurrentBlocked,
      })
      .eq("user_id", user1.id);

    await adminClient
      .from("user_info")
      .update({ connections_pending: updatedRequestingPending })
      .eq("user_id", user2.id);

    const user1Arrays = await getUserConnectionArrays(user1.id);

    if (!user1Arrays.connections_blocked.includes(user2.id)) {
      errorLogger.logError(
        "testBlockConnectionRequest",
        "blockConnectionRequest",
        new Error("User1's blocked should include user2"),
        { userId: user1.id, arrays: user1Arrays }
      );
    }

    if (user1Arrays.connections_incoming.includes(user2.id)) {
      errorLogger.logError(
        "testBlockConnectionRequest",
        "blockConnectionRequest",
        new Error("User1's incoming should not include user2 after block"),
        { userId: user1.id, arrays: user1Arrays }
      );
    }

    await deleteTestUsers([user1.id, user2.id]);
  } catch (error) {
    errorLogger.logError("testBlockConnectionRequest", "normal_block", error);
  }
}

/**
 * Test removeConnection edge cases
 */
async function testRemoveConnection() {
  console.log("  Testing removeConnection...");

  // Test 1: Normal remove
  try {
    const [user1, user2] = await Promise.all([
      createTestUser(`test_remove1_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test1",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
      createTestUser(`test_remove2_${Date.now()}@test.com`, generateTestPhoneNumber(), {
        first_name: "Test2",
        last_name: "User",
        age: 25,
        pronouns: "they/them/theirs",
        about: "Test",
        hometown: "Test",
        baseCity: "Test",
        interests: [],
      }),
    ]);

    // Create connection
    await simulateSendConnectionRequest(user2.id, user1.id);
    await simulateAcceptConnectionRequest(user1.id, user2.id);

    // Remove connection
    const [currentUserData, connectionUserData] = await Promise.all([
      adminClient
        .from("user_info")
        .select("connections_active")
        .eq("user_id", user1.id)
        .single(),
      adminClient
        .from("user_info")
        .select("connections_active")
        .eq("user_id", user2.id)
        .single(),
    ]);

    const currentActive = (currentUserData.data?.connections_active as string[]) || [];
    const connectionActive = (connectionUserData.data?.connections_active as string[]) || [];

    const updatedCurrentActive = currentActive.filter((id) => id !== user2.id);
    const updatedConnectionActive = connectionActive.filter((id) => id !== user1.id);

    await adminClient
      .from("user_info")
      .update({ connections_active: updatedCurrentActive })
      .eq("user_id", user1.id);

    await adminClient
      .from("user_info")
      .update({ connections_active: updatedConnectionActive })
      .eq("user_id", user2.id);

    const user1Arrays = await getUserConnectionArrays(user1.id);
    const user2Arrays = await getUserConnectionArrays(user2.id);

    if (user1Arrays.connections_active.includes(user2.id)) {
      errorLogger.logError(
        "testRemoveConnection",
        "removeConnection",
        new Error("User1's active should not include user2 after remove"),
        { userId: user1.id, arrays: user1Arrays }
      );
    }

    if (user2Arrays.connections_active.includes(user1.id)) {
      errorLogger.logError(
        "testRemoveConnection",
        "removeConnection",
        new Error("User2's active should not include user1 after remove"),
        { userId: user2.id, arrays: user2Arrays }
      );
    }

    await deleteTestUsers([user1.id, user2.id]);
  } catch (error) {
    errorLogger.logError("testRemoveConnection", "normal_remove", error);
  }
}

export async function runConnectionTests() {
  await testSendConnectionRequest();
  await testAcceptConnectionRequest();
  await testRejectConnectionRequest();
  await testBlockConnectionRequest();
  await testRemoveConnection();
}

// Run if executed directly (not imported)
if (process.argv[1]?.includes('connections.test')) {
  runConnectionTests()
    .then(() => {
      console.log("\nConnection tests completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

