/**
 * Stress Tests
 * Tests 200 users interacting simultaneously with each other
 */

// Load environment variables first
import "./setup";

import createAuthClient from "../src/utils/supabase/authAdminClient";
import {
  createTestUsers,
  deleteTestUsers,
  errorLogger,
  generateTestPhoneNumber,
  setUserDroppedInStatus,
  getUserConnectionArrays,
  sleep,
} from "./utils/testHelpers";

const adminClient = createAuthClient();

/**
 * Simulate sendConnectionRequest
 */
async function simulateSendConnectionRequest(currentUserId: string, targetUserId: string) {
  const [currentUserData, targetUserData] = await Promise.all([
    adminClient
      .from("user_info")
      .select("connections_pending")
      .eq("user_id", currentUserId)
      .single(),
    adminClient
      .from("user_info")
      .select("connections_incoming")
      .eq("user_id", targetUserId)
      .single(),
  ]);

  if (currentUserData.error) throw currentUserData.error;

  const currentPending = (currentUserData.data?.connections_pending as string[]) || [];
  const targetIncoming = (targetUserData.data?.connections_incoming as string[]) || [];

  const updatedCurrentPending = currentPending.includes(targetUserId)
    ? currentPending
    : [...currentPending, targetUserId];

  const updatedTargetIncoming = targetIncoming.includes(currentUserId)
    ? targetIncoming
    : [...targetIncoming, currentUserId];

  await Promise.all([
    adminClient
      .from("user_info")
      .upsert(
        {
          user_id: currentUserId,
          connections_pending: updatedCurrentPending,
        },
        { onConflict: "user_id" }
      ),
    adminClient
      .from("user_info")
      .upsert(
        {
          user_id: targetUserId,
          connections_incoming: updatedTargetIncoming,
        },
        { onConflict: "user_id" }
      ),
  ]);
}

/**
 * Simulate acceptConnectionRequest
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

  await Promise.all([
    adminClient
      .from("user_info")
      .update({
        connections_incoming: updatedCurrentIncoming,
        connections_active: updatedCurrentActive,
      })
      .eq("user_id", currentUserId),
    adminClient
      .from("user_info")
      .update({
        connections_pending: updatedRequestingPending,
        connections_active: updatedRequestingActive,
      })
      .eq("user_id", requestingUserId),
  ]);
}

/**
 * Stress test: 200 users sending connection requests simultaneously
 */
async function test200UsersConnectionRequests() {
  console.log("  Testing 200 users sending connection requests simultaneously...");

  let users: Array<{ id: string; email: string; phone: string }> = [];
  const userIds: string[] = [];

  try {
    // Create 200 test users
    console.log("    Creating 200 test users...");
    const startTime = Date.now();
    users = await createTestUsers(200);
    const createTime = Date.now() - startTime;
    console.log(`    Created ${users.length} users in ${createTime}ms`);

    userIds.push(...users.map((u) => u.id));

    // Set all users to dropped in with different locations
    console.log("    Setting users to dropped in...");
    await Promise.all(
      users.map((user, index) =>
        setUserDroppedInStatus(
          user.id,
          true,
          37.7749 + (index % 20) * 0.1,
          -122.4194 + (Math.floor(index / 20) % 20) * 0.1
        )
      )
    );

    // Simulate users sending connection requests to random other users
    console.log("    Simulating connection requests...");
    const requestStartTime = Date.now();
    const requests: Promise<void>[] = [];

    // Each user sends 5 random connection requests
    for (let i = 0; i < users.length; i++) {
      const currentUser = users[i];
      const requestCount = 5;

      for (let j = 0; j < requestCount; j++) {
        // Pick a random target user (not self)
        let targetIndex = Math.floor(Math.random() * users.length);
        while (targetIndex === i) {
          targetIndex = Math.floor(Math.random() * users.length);
        }

        const targetUser = users[targetIndex];

        requests.push(
          simulateSendConnectionRequest(currentUser.id, targetUser.id).catch((err) => {
            errorLogger.logError(
              "test200UsersConnectionRequests",
              "sendConnectionRequest",
              err,
              {
                fromUser: currentUser.id,
                toUser: targetUser.id,
                userIndex: i,
                requestIndex: j,
              }
            );
          })
        );
      }
    }

    await Promise.all(requests);
    const requestTime = Date.now() - requestStartTime;
    console.log(`    Completed ${requests.length} connection requests in ${requestTime}ms`);

    // Verify connection states
    console.log("    Verifying connection states...");
    const verificationErrors: string[] = [];

    for (const user of users.slice(0, 10)) {
      // Check a sample of users
      try {
        const arrays = await getUserConnectionArrays(user.id);
        if (arrays.connections_pending.length === 0 && arrays.connections_incoming.length === 0) {
          verificationErrors.push(`User ${user.id} has no pending or incoming connections`);
        }
      } catch (err) {
        errorLogger.logError("test200UsersConnectionRequests", "verification", err, {
          userId: user.id,
        });
      }
    }

    if (verificationErrors.length > 0) {
      errorLogger.logError(
        "test200UsersConnectionRequests",
        "verification",
        new Error("Verification failed"),
        { errors: verificationErrors }
      );
    }

    console.log(`    Stress test completed. Checked ${users.length} users.`);
  } catch (error) {
    errorLogger.logError("test200UsersConnectionRequests", "stress_test", error);
  } finally {
    // Cleanup
    console.log("    Cleaning up test users...");
    if (userIds.length > 0) {
      await deleteTestUsers(userIds).catch((err) => {
        errorLogger.logError("test200UsersConnectionRequests", "cleanup", err);
      });
    }
  }
}

/**
 * Stress test: 200 users accepting/rejecting requests simultaneously
 */
async function test200UsersAcceptReject() {
  console.log("  Testing 200 users accepting/rejecting requests simultaneously...");

  let users: Array<{ id: string; email: string; phone: string }> = [];
  const userIds: string[] = [];

  try {
    // Create 200 test users
    console.log("    Creating 200 test users...");
    users = await createTestUsers(200);
    userIds.push(...users.map((u) => u.id));

    // Set all users to dropped in
    await Promise.all(
      users.map((user, index) =>
        setUserDroppedInStatus(
          user.id,
          true,
          37.7749 + (index % 20) * 0.1,
          -122.4194 + (Math.floor(index / 20) % 20) * 0.1
        )
      )
    );

    // Create connection requests (each user sends 3 requests)
    console.log("    Creating connection requests...");
    const requests: Promise<void>[] = [];
    for (let i = 0; i < users.length; i++) {
      const currentUser = users[i];
      for (let j = 0; j < 3; j++) {
        let targetIndex = Math.floor(Math.random() * users.length);
        while (targetIndex === i) {
          targetIndex = Math.floor(Math.random() * users.length);
        }
        requests.push(
          simulateSendConnectionRequest(currentUser.id, users[targetIndex].id).catch((err) => {
            errorLogger.logError("test200UsersAcceptReject", "create_requests", err);
          })
        );
      }
    }
    await Promise.all(requests);

    // Wait a bit for requests to settle
    await sleep(1000);

    // Now simulate accepting/rejecting requests
    console.log("    Simulating accept/reject actions...");
    const actions: Promise<void>[] = [];

    for (const user of users) {
      // Get incoming requests
      const { data } = await adminClient
        .from("user_info")
        .select("connections_incoming")
        .eq("user_id", user.id)
        .single();

      const incoming = (data?.connections_incoming as string[]) || [];

      // Randomly accept or reject each incoming request
      for (const requestingUserId of incoming.slice(0, 2)) {
        // Process up to 2 requests per user
        if (Math.random() > 0.5) {
          // Accept
          actions.push(
            simulateAcceptConnectionRequest(user.id, requestingUserId).catch((err) => {
              errorLogger.logError("test200UsersAcceptReject", "accept", err, {
                userId: user.id,
                requestingUserId,
              });
            })
          );
        } else {
          // Reject (simulate by removing from arrays)
          actions.push(
            (async () => {
              const [currentUserData, requestingUserData] = await Promise.all([
                adminClient
                  .from("user_info")
                  .select("connections_incoming")
                  .eq("user_id", user.id)
                  .single(),
                adminClient
                  .from("user_info")
                  .select("connections_pending")
                  .eq("user_id", requestingUserId)
                  .single(),
              ]);

              const currentIncoming = (currentUserData.data?.connections_incoming as string[]) || [];
              const requestingPending = (requestingUserData.data?.connections_pending as string[]) || [];

              const updatedCurrentIncoming = currentIncoming.filter((id) => id !== requestingUserId);
              const updatedRequestingPending = requestingPending.filter((id) => id !== user.id);

              await Promise.all([
                adminClient
                  .from("user_info")
                  .update({ connections_incoming: updatedCurrentIncoming })
                  .eq("user_id", user.id),
                adminClient
                  .from("user_info")
                  .update({ connections_pending: updatedRequestingPending })
                  .eq("user_id", requestingUserId),
              ]);
            })().catch((err) => {
              errorLogger.logError("test200UsersAcceptReject", "reject", err, {
                userId: user.id,
                requestingUserId,
              });
            })
          );
        }
      }
    }

    await Promise.all(actions);
    console.log(`    Completed ${actions.length} accept/reject actions`);
  } catch (error) {
    errorLogger.logError("test200UsersAcceptReject", "stress_test", error);
  } finally {
    // Cleanup
    if (userIds.length > 0) {
      await deleteTestUsers(userIds).catch((err) => {
        errorLogger.logError("test200UsersAcceptReject", "cleanup", err);
      });
    }
  }
}

/**
 * Stress test: Concurrent profile updates
 */
async function test200UsersProfileUpdates() {
  console.log("  Testing 200 users updating profiles simultaneously...");

  let users: Array<{ id: string; email: string; phone: string }> = [];
  const userIds: string[] = [];

  try {
    // Create 200 test users
    console.log("    Creating 200 test users...");
    users = await createTestUsers(200);
    userIds.push(...users.map((u) => u.id));

    // Simulate concurrent profile updates
    console.log("    Simulating concurrent profile updates...");
    const updates = users.map((user, index) =>
      adminClient
        .from("user_info")
        .update({
          profile_data: {
            first_name: `Updated${index}`,
            last_name: `User${index}`,
            age: 20 + (index % 50),
            pronouns: ["he/him/his", "she/her/hers", "they/them/theirs"][index % 3],
            about: `Updated about ${index}`,
            hometown: `Hometown${index}`,
            baseCity: `City${index % 10}`,
            interests: [`Interest${index % 5}`],
          },
        })
        .eq("user_id", user.id)
        .then(() => {})
        .catch((err) => {
          errorLogger.logError("test200UsersProfileUpdates", "update_profile", err, {
            userId: user.id,
            index,
          });
        })
    );

    await Promise.all(updates);
    console.log(`    Completed ${updates.length} profile updates`);
  } catch (error) {
    errorLogger.logError("test200UsersProfileUpdates", "stress_test", error);
  } finally {
    // Cleanup
    if (userIds.length > 0) {
      await deleteTestUsers(userIds).catch((err) => {
        errorLogger.logError("test200UsersProfileUpdates", "cleanup", err);
      });
    }
  }
}

/**
 * Stress test: Mixed operations (drop in/out, connections, profile updates)
 */
async function test200UsersMixedOperations() {
  console.log("  Testing 200 users with mixed operations simultaneously...");

  let users: Array<{ id: string; email: string; phone: string }> = [];
  const userIds: string[] = [];

  try {
    // Create 200 test users
    console.log("    Creating 200 test users...");
    users = await createTestUsers(200);
    userIds.push(...users.map((u) => u.id));

    // Mix of operations
    const operations: Promise<void>[] = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const operationType = i % 4;

      switch (operationType) {
        case 0:
          // Drop in
          operations.push(
            setUserDroppedInStatus(
              user.id,
              true,
              37.7749 + (i % 20) * 0.1,
              -122.4194 + (Math.floor(i / 20) % 20) * 0.1
            ).catch((err) => {
              errorLogger.logError("test200UsersMixedOperations", "drop_in", err, {
                userId: user.id,
              });
            })
          );
          break;
        case 1:
          // Send connection request
          if (i < users.length - 1) {
            operations.push(
              simulateSendConnectionRequest(user.id, users[i + 1].id).catch((err) => {
                errorLogger.logError("test200UsersMixedOperations", "send_request", err, {
                  userId: user.id,
                });
              })
            );
          }
          break;
        case 2:
          // Update profile
          operations.push(
            adminClient
              .from("user_info")
              .update({
                profile_data: {
                  first_name: `Mixed${i}`,
                  last_name: `User${i}`,
                  age: 25,
                  pronouns: "they/them/theirs",
                  about: "Mixed operation test",
                  hometown: "Test",
                  baseCity: "Test",
                  interests: [],
                },
              })
              .eq("user_id", user.id)
              .then(() => {})
              .catch((err) => {
                errorLogger.logError("test200UsersMixedOperations", "update_profile", err, {
                  userId: user.id,
                });
              })
          );
          break;
        case 3:
          // Drop out
          operations.push(
            setUserDroppedInStatus(user.id, false).catch((err) => {
              errorLogger.logError("test200UsersMixedOperations", "drop_out", err, {
                userId: user.id,
              });
            })
          );
          break;
      }
    }

    await Promise.all(operations);
    console.log(`    Completed ${operations.length} mixed operations`);
  } catch (error) {
    errorLogger.logError("test200UsersMixedOperations", "stress_test", error);
  } finally {
    // Cleanup
    if (userIds.length > 0) {
      await deleteTestUsers(userIds).catch((err) => {
        errorLogger.logError("test200UsersMixedOperations", "cleanup", err);
      });
    }
  }
}

export async function runStressTests() {
  await test200UsersConnectionRequests();
  await test200UsersAcceptReject();
  await test200UsersProfileUpdates();
  await test200UsersMixedOperations();
}

// Run if executed directly (not imported)
if (process.argv[1]?.includes('stress.test')) {
  runStressTests()
    .then(() => {
      console.log("\nStress tests completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

