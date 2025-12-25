-- Script to mark all users as dummy users except two specific user IDs
-- Run this in your Supabase SQL Editor

-- Step 1: Add the dummy_user column if it doesn't exist
ALTER TABLE user_info 
ADD COLUMN IF NOT EXISTS dummy_user BOOLEAN DEFAULT false;

-- Step 2: Set all users to dummy_user = true
UPDATE user_info 
SET dummy_user = true;

-- Step 3: Mark the two real users as NOT dummy users
UPDATE user_info 
SET dummy_user = false 
WHERE user_id IN (
  '296150ab-fa09-4ba5-bef1-4e752e411b5e',
  '4b24f26b-9618-4ada-a5ca-30c0149a0a5a'
);

-- Step 4: Verify the results
SELECT 
  user_id,
  dummy_user,
  (SELECT profile_data->>'first_name' FROM user_info WHERE user_id = ui.user_id) as first_name,
  (SELECT profile_data->>'last_name' FROM user_info WHERE user_id = ui.user_id) as last_name
FROM user_info ui
ORDER BY dummy_user, user_id;

-- Optional: Create an index on dummy_user for faster queries
CREATE INDEX IF NOT EXISTS idx_user_info_dummy_user 
ON user_info(dummy_user) 
WHERE dummy_user = false;

