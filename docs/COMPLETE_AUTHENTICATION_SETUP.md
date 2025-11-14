# Complete Authentication Setup Guide

This document provides a comprehensive guide to set up the complete authentication system including two-factor authentication (2FA), email verification, and password reset functionality.

---

## Table of Contents

1. [Overview](#overview)
2. [Backend Setup](#backend-setup)
3. [Environment Variables (.env)](#environment-variables-env)
4. [Database Requirements](#database-requirements)
5. [Frontend Implementation](#frontend-implementation)
6. [API Endpoints](#api-endpoints)
7. [Email Templates](#email-templates)
8. [Testing the System](#testing-the-system)

---

## Overview

### Authentication Features

1. **Regular Users (role: 'user')**
   - Email/username + password login
   - **Email verification required on first registration** (OTP sent to email)
   - Must verify email before being able to log in
   - No 2FA on subsequent logins

2. **Admin & Fact-Checkers (role: 'admin' or 'fact_checker')**
   - Email/username + password login
   - **2FA required on every login** (OTP sent to email after correct password)
   - OTP expires in 10 minutes

3. **All Users**
   - Password reset functionality via email link
   - Reset token expires in 10 minutes

---

## Backend Setup

### Step 1: Install Dependencies

The backend already has the required dependencies installed:
- `nodemailer` - for sending emails
- `bcryptjs` - for password hashing
- `jsonwebtoken` - for JWT tokens
- `uuid` - for generating unique IDs

### Step 2: Configure SMTP Email Service

The email service is configured in `src/services/emailService.js` using nodemailer with SMTP.

---

## Environment Variables (.env)

**CRITICAL:** Add these variables to your `.env` file in the project root.

```env
# =====================================================
# HAKIKISHA BACKEND - Environment Configuration
# =====================================================

# Server Configuration
NODE_ENV=development
PORT=5000
SERVER_URL=http://localhost:5000

# CORS Configuration
ALLOWED_ORIGINS=capacitor://localhost,http://localhost,ionic://localhost,http://localhost:3000,http://localhost:8080,https://your-production-url.com

# =====================================================
# Database Configuration (PostgreSQL)
# =====================================================
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=hakikisha_db
DB_USER=your-database-user
DB_PASSWORD=your-database-password

# Alternative: Use DATABASE_URL
# DATABASE_URL=postgres://username:password@host:port/database

# =====================================================
# JWT Configuration (REQUIRED)
# =====================================================
# Generate secure random strings:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

JWT_SECRET=your_super_secure_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this_in_production
JWT_REFRESH_EXPIRES_IN=7d

# =====================================================
# SMTP Email Configuration (REQUIRED for OTP & 2FA)
# =====================================================
# Option 1: Gmail SMTP (Recommended for development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Option 2: SendGrid SMTP
# EMAIL_HOST=smtp.sendgrid.net
# EMAIL_PORT=587
# EMAIL_SECURE=false
# EMAIL_USER=apikey
# EMAIL_PASSWORD=your-sendgrid-api-key

# Option 3: AWS SES SMTP
# EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
# EMAIL_USER=your-ses-smtp-username
# EMAIL_PASSWORD=your-ses-smtp-password

# Option 4: Custom SMTP Server
# EMAIL_HOST=smtp.yourdomain.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
# EMAIL_USER=noreply@yourdomain.com
# EMAIL_PASSWORD=your-smtp-password

# Email Sender Configuration
EMAIL_FROM=noreply@hakikisha.com
EMAIL_FROM_NAME=Hakikisha

# =====================================================
# Redis Configuration (Optional)
# =====================================================
REDIS_URL=redis://localhost:6379
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=

# =====================================================
# Application Settings
# =====================================================
REGISTRATION_APPROVAL_REQUIRED=true
AUTO_ASSIGN_CLAIMS=true
TRENDING_THRESHOLD=50
MAX_FILE_SIZE=10485760

# Performance Settings
DB_POOL_MAX=100
DB_POOL_MIN=10
CACHE_TTL=300

# =====================================================
# Rate Limiting
# =====================================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Setting Up SMTP Email Service

### Option 1: Gmail (Easiest for Development)

1. **Enable 2-Step Verification** on your Google Account:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Create App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password

3. **Update .env file**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   EMAIL_FROM=your-email@gmail.com
   EMAIL_FROM_NAME=Hakikisha
   ```

### Option 2: SendGrid (Recommended for Production)

1. Sign up at https://sendgrid.com/
2. Create an API key
3. Update .env:
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=apikey
   EMAIL_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=Hakikisha
   ```

### Option 3: AWS SES (For Scalability)

1. Set up AWS SES in your AWS account
2. Get SMTP credentials
3. Update .env:
   ```env
   EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-ses-smtp-username
   EMAIL_PASSWORD=your-ses-smtp-password
   EMAIL_FROM=verified-email@yourdomain.com
   EMAIL_FROM_NAME=Hakikisha
   ```

---

## Database Requirements

### Required Table: `hakikisha.otp_codes`

This table should already exist from migration `018_add_otp_codes_table.js`. It stores all OTP codes for:
- Email verification (`email_verification`)
- 2FA login (`2fa_login`)
- Password reset (`password_reset`)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS hakikisha.otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_user_id ON hakikisha.otp_codes(user_id);
CREATE INDEX idx_otp_code ON hakikisha.otp_codes(code);
CREATE INDEX idx_otp_purpose ON hakikisha.otp_codes(purpose);
```

---

## Frontend Implementation

### Required Screens/Components

#### 1. **Email Verification Screen** (for regular users)
   - Show 6-digit OTP input field
   - Display countdown timer (10 minutes)
   - "Resend Code" button
   - Error handling for invalid/expired codes

**Example UI Flow:**
```
After Registration → Email Verification Screen
├── Enter 6-digit OTP
├── Submit button
├── Timer: "Code expires in 09:45"
└── "Didn't receive code? Resend"
```

#### 2. **Two-Factor Authentication Screen** (for admin/fact-checkers)
   - Show after correct password entry
   - 6-digit OTP input field
   - Display countdown timer (10 minutes)
   - "Resend Code" button
   - Back button to return to login

**Example UI Flow:**
```
Login Screen → 2FA Screen (if admin/fact-checker)
├── "Enter the code sent to your email"
├── 6-digit OTP input
├── Submit button
├── Timer: "Code expires in 09:30"
└── "Resend Code" button
```

#### 3. **Forgot Password Screen**
   - Email input field
   - Submit button
   - Success message

#### 4. **Reset Password Screen**
   - Show when user clicks email link
   - Parse token and email from URL
   - New password input (with strength indicator)
   - Confirm password input
   - Submit button

---

## API Endpoints

### Authentication Endpoints

#### 1. **Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phone": "+1234567890",
  "role": "user"
}

Response (200):
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user",
  "requiresEmailVerification": true,
  "message": "Registration successful. Please check your email for verification code."
}
```

#### 2. **Verify Email** (Regular Users)
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "userId": "user-uuid",
  "code": "123456"
}

Response (200):
{
  "success": true,
  "message": "Email verified successfully. You can now log in."
}
```

#### 3. **Resend Email Verification Code**
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}

Response (200):
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

#### 4. **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response for Regular User (200):
{
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}

Response for Admin/Fact-Checker (200):
{
  "requires2FA": true,
  "userId": "uuid",
  "email": "admin@example.com",
  "role": "admin",
  "message": "Password correct. 2FA code sent to your email."
}
```

#### 5. **Verify 2FA Code** (Admin/Fact-Checker)
```http
POST /api/auth/verify-2fa
Content-Type: application/json

{
  "userId": "user-uuid",
  "code": "123456"
}

Response (200):
{
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

#### 6. **Resend 2FA Code**
```http
POST /api/auth/resend-2fa
Content-Type: application/json

{
  "userId": "user-uuid",
  "email": "admin@example.com"
}

Response (200):
{
  "success": true,
  "message": "2FA code resent to your email"
}
```

#### 7. **Request Password Reset**
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response (200):
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

#### 8. **Verify Reset Token**
```http
POST /api/auth/verify-reset-token
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456"
}

Response (200):
{
  "valid": true,
  "userId": "uuid"
}
```

#### 9. **Reset Password**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456",
  "newPassword": "NewSecurePass123!"
}

Response (200):
{
  "success": true,
  "message": "Password reset successfully. Please log in with your new password."
}
```

---

## Frontend Routes to Add

Add these routes to your frontend router configuration:

```typescript
// Authentication Routes
{
  path: '/verify-email',
  component: VerifyEmailScreen
},
{
  path: '/two-factor',
  component: TwoFactorAuthScreen
},
{
  path: '/forgot-password',
  component: ForgotPasswordScreen
},
{
  path: '/reset-password',
  component: ResetPasswordScreen
}
```

---

## Email Templates

All email templates are configured in `src/services/emailService.js`:

1. **Email Verification OTP** - Sent during user registration
2. **2FA Login Code** - Sent to admin/fact-checker on login
3. **Password Reset** - Sent when user requests password reset

Each email includes:
- Clear subject line
- 6-digit OTP code in large, bold font
- Expiration time (10 minutes)
- Security warning if not requested
- Professional styling with your branding

---

## Testing the System

### Test Email Verification (Regular Users)

1. Register a new user with role 'user'
2. Check email for 6-digit verification code
3. Navigate to `/verify-email` screen
4. Enter the code
5. Try to login - should succeed after verification

### Test 2FA (Admin/Fact-Checker)

1. Register/login as admin or fact-checker
2. Enter correct password
3. Check email for 6-digit 2FA code
4. Navigate to `/two-factor` screen
5. Enter the code
6. Should receive JWT token and be logged in

### Test Password Reset

1. Navigate to `/forgot-password`
2. Enter your email
3. Check email for reset link and code
4. Click link or navigate to `/reset-password?token=123456&email=user@example.com`
5. Enter new password
6. Try logging in with new password

### Test OTP Expiration

1. Request an OTP (verification or 2FA)
2. Wait 10+ minutes
3. Try to use the OTP - should fail with "expired" error
4. Request a new code using resend functionality

---

## Security Best Practices

1. **OTP Expiration**: All OTPs expire in 10 minutes
2. **One-time Use**: OTPs are marked as used after verification
3. **Token Invalidation**: Old tokens are invalidated when new ones are requested
4. **Password Hashing**: All passwords are hashed using bcrypt
5. **Session Management**: Invalid sessions on password reset
6. **Rate Limiting**: Implement rate limiting on OTP endpoints
7. **HTTPS**: Always use HTTPS in production
8. **Environment Variables**: Never commit .env files to version control

---

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials** in .env file
2. **Verify email service is configured** correctly
3. **Check spam/junk folder** for test emails
4. **Enable less secure apps** (Gmail) or use app passwords
5. **Check server logs** for error messages

### OTP Not Working

1. **Check database** - verify otp_codes table exists
2. **Check OTP hasn't expired** - 10 minute limit
3. **Verify OTP hasn't been used** - is_used = false
4. **Check user_id matches** in database query

### 2FA Not Triggering

1. **Verify user role** is 'admin' or 'fact_checker'
2. **Check login response** - should have requires2FA: true
3. **Verify email is sent** - check logs
4. **Ensure frontend handles 2FA flow** correctly

---

## Important Notes for package.json

**CRITICAL:** Your project is missing a `build:dev` script in `package.json`.

You need to manually add this script to your `package.json` file:

```json
{
  "scripts": {
    "build:dev": "vite build --mode development"
  }
}
```

This script is required for Lovable to build the project properly. Since the package.json file is read-only for the AI, you must add this manually.

---

## Next Steps

1. ✅ Add environment variables to `.env` file
2. ✅ Configure SMTP email service (Gmail, SendGrid, or AWS SES)
3. ✅ Add `build:dev` script to package.json
4. ✅ Create frontend screens:
   - VerifyEmailScreen
   - TwoFactorAuthScreen
   - ForgotPasswordScreen
   - ResetPasswordScreen
5. ✅ Add API endpoint calls in frontend services
6. ✅ Test all authentication flows
7. ✅ Deploy and test in production

---

## Summary

This authentication system provides:
- ✅ Secure email verification for regular users
- ✅ 2FA protection for admin and fact-checkers
- ✅ Password reset functionality
- ✅ OTP expiration (10 minutes)
- ✅ One-time use tokens
- ✅ Professional email templates
- ✅ Complete API documentation

For questions or issues, refer to the backend logs or contact the development team.
