/**
 * Test Runner
 * Main entry point for running all tests
 */

// Load environment variables first
import "./setup";

import { errorLogger } from "./utils/testHelpers";
import { runProfileTests } from "./profile.test";
import { runDropInTests } from "./dropIn.test";
import { runLocationTests } from "./location.test";
import { runConnectionTests } from "./connections.test";
import { runUserSearchTests } from "./userSearch.test";
import { runStressTests } from "./stress.test";

interface TestSuite {
  name: string;
  run: () => Promise<void>;
}

const testSuites: TestSuite[] = [
  { name: "Profile Tests", run: runProfileTests },
  { name: "Drop-In Tests", run: runDropInTests },
  { name: "Location Tests", run: runLocationTests },
  { name: "Connection Tests", run: runConnectionTests },
  { name: "User Search Tests", run: runUserSearchTests },
  { name: "Stress Tests (200 users)", run: runStressTests },
];

async function runAllTests() {
  console.log("=".repeat(80));
  console.log("Starting Comprehensive Backend Function Tests");
  console.log("=".repeat(80));
  console.log();

  const startTime = Date.now();
  errorLogger.clearErrors();

  for (const suite of testSuites) {
    console.log(`\n[TEST SUITE] ${suite.name}`);
    console.log("-".repeat(80));
    
    try {
      await suite.run();
      console.log(`✓ ${suite.name} completed`);
    } catch (error) {
      errorLogger.logError(suite.name, "testSuite", error);
      console.log(`✗ ${suite.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log("\n" + "=".repeat(80));
  console.log("Test Execution Complete");
  console.log("=".repeat(80));
  console.log(`Total Duration: ${duration}s`);
  console.log();

  // Print error report
  const errorReport = errorLogger.getErrorReport();
  console.log(errorReport);

  // Save error report to file
  const fs = await import("fs/promises");
  await fs.writeFile(
    "tests/error-report.txt",
    `Test Run: ${new Date().toISOString()}\nDuration: ${duration}s\n\n${errorReport}`
  );
  console.log("\nError report saved to: tests/error-report.txt");
}

// Run tests when executed directly
runAllTests()
  .then(() => {
    console.log("\nAll tests completed. Check error-report.txt for details.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error running tests:", error);
    process.exit(1);
  });

export { runAllTests };

