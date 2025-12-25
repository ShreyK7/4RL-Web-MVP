# Backend Function Testing Framework

This testing framework provides comprehensive tests for all backend functions in the 4RL application, including edge cases and stress tests with up to 200 concurrent users.

## Overview

The testing framework is organized into the following test suites:

1. **Profile Tests** (`profile.test.ts`) - Tests profile data functions
2. **Drop-In Tests** (`dropIn.test.ts`) - Tests drop-in status functions
3. **Location Tests** (`location.test.ts`) - Tests location and distance calculation functions
4. **Connection Tests** (`connections.test.ts`) - Tests all connection-related functions
5. **User Search Tests** (`userSearch.test.ts`) - Tests user search and filtering functions
6. **Stress Tests** (`stress.test.ts`) - Tests with 200 concurrent users

## Setup

### Prerequisites

- Node.js installed
- Supabase project with admin access
- Environment variables configured in `.env.local` file:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PRIVATE_SUPABASE_SECRET_KEY`

### Installation

```bash
npm install
```

**Note**: The test framework automatically loads environment variables from `.env.local` (the same file used by Next.js). Make sure this file exists in your project root with all required variables.

## Running Tests

### Run All Tests

```bash
npm run test
```

### Run Individual Test Suites

```bash
npm run test:profile      # Profile function tests
npm run test:dropin       # Drop-in status tests
npm run test:location     # Location function tests
npm run test:connections  # Connection function tests
npm run test:usersearch   # User search tests
npm run test:stress       # Stress tests (200 users)
```

## Testing Actual Application Functions

**Important Note**: Currently, many tests simulate application functions rather than calling them directly. This is because:

1. Application functions are Next.js server actions that use `cookies()` from `next/headers`
2. These functions call `getCurrentUserID()` which relies on authenticated sessions via cookies
3. Mocking Next.js cookies in Node.js tests is complex and requires significant setup

**Current Approach**: Tests simulate the logic of application functions using the admin client directly. This tests the same database operations but doesn't test the actual function code paths.

**Future Improvement**: To test actual functions, we would need to:
- Mock the `cookies()` function from Next.js
- Create test sessions for users
- Inject user context into server actions

The `tests/utils/testAppFunctions.ts` file contains utilities for this, but it's not fully implemented yet.

## Test User Creation

The framework creates test users using the Supabase Admin API, which bypasses OTP verification. This allows for automated testing without requiring phone number verification.

### How It Works

1. **Test User Creation**: Uses `createAuthClient()` (admin client) to create users directly via the Supabase Admin API
2. **User Info Setup**: Creates corresponding `user_info` rows with test data
3. **Cleanup**: Automatically deletes test users after tests complete

### Test User Structure

Each test user includes:
- Unique email: `testuser{timestamp}_{index}@test.com`
- Unique phone: `+1555{7-digit-number}`
- Complete profile data (name, age, pronouns, interests, etc.)
- All connection arrays initialized to empty

## Test Coverage

### Edge Cases Tested

1. **Profile Functions**
   - User with no profile data
   - User with complete profile data
   - Non-existent user
   - Concurrent profile updates
   - Invalid/missing data

2. **Drop-In Functions**
   - Dropped in with location
   - Dropped out
   - Dropped in without location
   - Invalid coordinates
   - Concurrent drop-in/drop-out

3. **Location Functions**
   - User with location set
   - User with no location
   - Distance calculation (same point, known distances, edge cases)
   - Boundary coordinates (poles, date line)

4. **Connection Functions**
   - Normal connection requests
   - Duplicate requests
   - Self-requests
   - Requests to non-existent users
   - Accept/reject/block operations
   - Connection removal
   - Concurrent connection operations

5. **User Search Functions**
   - No users dropped in
   - Multiple users dropped in
   - Users with incomplete onboarding
   - Users with different locations
   - Large number of users (50+)

6. **Stress Tests**
   - 200 users sending connection requests simultaneously
   - 200 users accepting/rejecting requests simultaneously
   - 200 users updating profiles simultaneously
   - 200 users performing mixed operations

## Error Logging

All errors encountered during testing are logged to:

1. **Console**: Real-time error output during test execution
2. **Error Report File**: `tests/error-report.txt` - Complete error report with:
   - Test name
   - Function name
   - Error message and stack trace
   - Context information
   - Timestamp

### Error Report Format

```
Test Run: 2024-01-01T00:00:00.000Z
Duration: 123.45s

=== ERROR REPORT ===
Total Errors: 5

Error 1:
  Test: testSendConnectionRequest
  Function: sendConnectionRequest
  Time: 2024-01-01T00:00:00.000Z
  Error: Connection failed
  Stack: ...
  Context: { userId: "...", targetId: "..." }
```

## Important Notes

### Server Actions Limitation

The backend functions are Next.js server actions that rely on cookies for authentication. Since we can't easily mock Next.js cookies in Node.js tests, the test framework:

1. **Uses Admin Client**: Directly manipulates the database using the admin client to simulate operations
2. **Verifies Results**: Checks database state directly to verify function behavior
3. **Simulates Operations**: Replicates the logic of server actions using admin client

### Test Isolation

- Each test creates its own test users
- Test users are automatically cleaned up after tests
- Tests are designed to be independent (though some stress tests may affect each other)

### Performance Considerations

- Stress tests create 200 users, which may take several minutes
- Connection request tests generate thousands of operations
- All operations run concurrently to test system limits

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Ensure `NEXT_PRIVATE_SUPABASE_SECRET_KEY` is set correctly
   - Verify RLS policies allow admin operations

2. **"User creation failed"**
   - Check Supabase project limits
   - Verify email/phone format requirements

3. **"Test timeout"**
   - Stress tests may take 5-10 minutes
   - Increase timeout if needed

4. **"Cleanup failed"**
   - Some test users may not be deleted if tests fail
   - Manually clean up via Supabase dashboard if needed

## Future Improvements

- [ ] Add unit tests for pure functions (e.g., `calculateDistance`)
- [ ] Add integration tests with mocked Next.js cookies
- [ ] Add performance benchmarks
- [ ] Add test coverage reporting
- [ ] Add CI/CD integration

## Contributing

When adding new backend functions:

1. Create corresponding test file or add to existing test suite
2. Test all edge cases
3. Add stress test scenarios if applicable
4. Update this README with new test coverage

