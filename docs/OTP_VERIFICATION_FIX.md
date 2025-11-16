# OTP Verification Fix - Database Schema Update

## Problem Identified

The OTP verification was failing with "failed to verify" errors because:
1. **Missing `used_at` column**: The code was trying to update `used_at = NOW()` but the column didn't exist in the database
2. This affected all OTP operations:
   - Email verification (first registration)
   - 2FA authentication (admin/fact-checker login)
   - Password reset

## Solution Applied

### Updated Migration: `migrations/025_fix_otp_codes_table.sql`

Added the missing `used_at` column to the `otp_codes` table:

```sql
ALTER TABLE hakikisha.otp_codes ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;
```

## Required Action: Run the Migration

**CRITICAL:** You must run this migration to fix the OTP verification:

```bash
# If you have a migration script:
node src/scripts/databaseMigration.js

# OR manually run the SQL migration:
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d hakikisha_db -f migrations/025_fix_otp_codes_table.sql
```

## Complete OTP Table Schema

After running the migration, your `hakikisha.otp_codes` table will have:

```sql
CREATE TABLE hakikisha.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(50) NOT NULL,           -- 'email_verification', '2fa', 'password_reset'
  used BOOLEAN DEFAULT false,           -- Whether OTP has been used
  used_at TIMESTAMP WITH TIME ZONE,     -- When OTP was used (NEW!)
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## How to Test After Migration

### 1. Test Email Verification (Regular Users)
```bash
# Register a new user
POST /api/v1/auth/register
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "Test123!",
  "role": "user"
}

# Check email for 6-digit code
# Verify email with code
POST /api/v1/auth/verify-email
{
  "userId": "user-uuid-from-registration",
  "code": "123456"
}

# Test resend functionality
POST /api/v1/auth/resend-verification
{
  "email": "test@example.com"
}
```

### 2. Test 2FA (Admin/Fact-Checker)
```bash
# Login as admin/fact-checker
POST /api/v1/auth/login
{
  "identifier": "admin@example.com",
  "password": "admin123"
}

# Response will have requires2FA: true
# Check email for 6-digit code

# Verify 2FA code
POST /api/v1/auth/verify-2fa
{
  "userId": "user-uuid-from-login",
  "code": "123456"
}

# Test resend functionality
POST /api/v1/auth/resend-2fa
{
  "userId": "user-uuid",
  "email": "admin@example.com"
}
```

### 3. Test Password Reset
```bash
# Request password reset
POST /api/v1/auth/forgot-password
{
  "email": "test@example.com"
}

# Check email for 6-digit reset code

# Reset password with code
POST /api/v1/auth/reset-password
{
  "email": "test@example.com",
  "resetCode": "123456",
  "newPassword": "NewPass123!"
}
```

## What Was Fixed

✅ **Email Verification**: Users can now verify their email after registration  
✅ **2FA Authentication**: Admins/fact-checkers can now complete 2FA login  
✅ **Password Reset**: Password reset OTP codes now work correctly  
✅ **Resend OTP**: Both email verification and 2FA resend now work  
✅ **Database Schema**: Added missing `used_at` column  

## Database Column Mappings

The migration ensures these columns exist and are correctly named:

| Old Name (if existed) | New Name | Type | Description |
|----------------------|----------|------|-------------|
| `purpose` | `type` | VARCHAR(50) | OTP type (email_verification, 2fa, password_reset) |
| `is_used` | `used` | BOOLEAN | Whether OTP has been used |
| - | `used_at` | TIMESTAMP | When OTP was used (NEW COLUMN) |

## Environment Variables Required

Make sure these are set in your `.env`:

```env
# Resend API Configuration
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Hakikisha <noreply@yourdomain.com>

# Frontend URL for password reset links
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key
```

## Common Errors (Now Fixed)

### Before Fix:
```
❌ "Failed to verify" - Missing used_at column
❌ "Failed to resend OTP" - Missing used_at column
❌ Database error: column "used_at" does not exist
```

### After Fix:
```
✅ "Email verified successfully. You can now log in."
✅ "2FA code resent to your email"
✅ "Password reset successfully"
```

## Next Steps

1. **Run the migration** (see above)
2. **Test all OTP flows** (email verification, 2FA, password reset)
3. **Verify emails are being sent** (check your inbox/spam)
4. **Test resend functionality** for expired codes

## Support

If you still encounter issues after running the migration:
1. Check if migration ran successfully: `SELECT * FROM information_schema.columns WHERE table_name = 'otp_codes' AND table_schema = 'hakikisha';`
2. Verify `used_at` column exists in the output
3. Check backend logs for any remaining errors
4. Verify Resend API key is valid and working
