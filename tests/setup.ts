/**
 * Test Setup
 * Loads environment variables from .env.local before running tests
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file (same as Next.js does)
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

// Also try loading .env if .env.local doesn't exist
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  config({ path: resolve(process.cwd(), ".env") });
}

// Verify required environment variables are set
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PRIVATE_SUPABASE_SECRET_KEY",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error("\nPlease ensure .env.local file exists with all required variables.");
  process.exit(1);
}

console.log("✓ Environment variables loaded successfully");

