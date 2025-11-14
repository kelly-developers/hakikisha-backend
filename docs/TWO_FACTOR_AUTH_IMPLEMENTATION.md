# Two-Factor Authentication & Email Verification Implementation Guide

## Overview
This document provides comprehensive guidance on implementing 2FA for admins/fact-checkers and email verification for normal users in the Hakikisha application.

## Backend Implementation Summary

### 1. Database Schema
The system uses the `hakikisha.otp_codes` table to store OTP codes:

```sql
CREATE TABLE hakikisha.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  purpose VARCHAR(50) NOT NULL, -- 'email_verification' or '2fa_login'
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Authentication Flows

#### A. Normal User Registration & Email Verification
**Flow:**
1. User registers with email, password, and optional phone number
2. System creates user account with `is_verified = false`
3. System generates 6-digit OTP code (expires in 10 minutes)
4. OTP is stored in `otp_codes` table with `purpose = 'email_verification'`
5. Verification email is sent to user's email
6. User must verify email before first login

**Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/resend-verification` - Resend verification OTP

#### B. Admin/Fact-Checker 2FA Login
**Flow:**
1. Admin/Fact-checker enters email/username and password
2. System validates credentials
3. If valid, system generates 6-digit OTP (expires in 10 minutes)
4. OTP is stored in `otp_codes` table with `purpose = '2fa_login'`
5. 2FA email is sent to user's email
6. User enters OTP to complete login
7. System validates OTP and creates session

**Endpoints:**
- `POST /api/auth/login` - Initial login (returns `requires2FA: true` for admin/fact-checker)
- `POST /api/auth/verify-2fa` - Verify 2FA code and complete login
- `POST /api/auth/resend-2fa` - Resend 2FA code

### 3. SMTP Configuration

#### Environment Variables Required:
```env
# Email Service Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Hakikisha <noreply@hakikisha.com>"

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d
```

#### Gmail Setup Instructions:
1. Enable 2-Step Verification in your Google Account
2. Go to Google Account > Security > 2-Step Verification
3. Scroll to bottom and click "App passwords"
4. Generate app password for "Mail"
5. Use generated password in `EMAIL_PASSWORD` variable

**Alternative SMTP Services:**
- **SendGrid**: Set `EMAIL_SERVICE=SendGrid`, use API key
- **Mailgun**: Set `EMAIL_SERVICE=Mailgun`, configure credentials
- **AWS SES**: Set `EMAIL_SERVICE=AWS SES`, configure AWS credentials

## Frontend Implementation Guide

### 1. Registration Flow (Normal Users)

#### Step 1: Registration Form
```typescript
// Register endpoint
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "phone": "+254712345678" // optional
}

// Response if successful
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user",
  "is_verified": false,
  "requiresEmailVerification": true,
  "message": "Registration successful. Please check your email for verification code."
}
```

#### Step 2: Email Verification Screen
Create a verification screen that appears after registration:

```typescript
// Component structure
interface VerificationScreenProps {
  userId: string;
  email: string;
}

// Verify email endpoint
POST /api/auth/verify-email
Content-Type: application/json

{
  "userId": "user-uuid",
  "code": "123456" // 6-digit code from email
}

// Response if successful
{
  "success": true,
  "message": "Email verified successfully. You can now log in."
}

// Response if failed
{
  "error": "Invalid or expired verification code. Please request a new code."
}
```

#### Step 3: Resend Verification Code
```typescript
// Resend verification endpoint
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}

// Response
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

### 2. Login Flow

#### Step 1: Login Form (All Users)
```typescript
// Login endpoint
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com", // or username
  "password": "password123"
}

// Response for Normal Users (no 2FA)
{
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "is_verified": true
  }
}

// Response for Admin/Fact-Checker (requires 2FA)
{
  "requires2FA": true,
  "userId": "uuid",
  "email": "admin@example.com",
  "role": "admin",
  "message": "Password correct. 2FA code sent to your email. Please enter it to complete login."
}

// Error if user not verified
{
  "error": "Please verify your email before logging in. Check your inbox for the verification code."
}
```

#### Step 2: 2FA Verification Screen (Admin/Fact-Checker Only)
```typescript
// Show this screen when login returns requires2FA: true
interface TwoFactorScreenProps {
  userId: string;
  email: string;
  role: string;
}

// Verify 2FA endpoint
POST /api/auth/verify-2fa
Content-Type: application/json

{
  "userId": "user-uuid",
  "code": "123456" // 6-digit code from email
}

// Response if successful
{
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "is_verified": true
  }
}

// Response if failed
{
  "error": "Invalid or expired 2FA code. Please request a new code."
}
```

#### Step 3: Resend 2FA Code
```typescript
// Resend 2FA endpoint
POST /api/auth/resend-2fa
Content-Type: application/json

{
  "userId": "user-uuid",
  "email": "admin@example.com"
}

// Response
{
  "success": true,
  "message": "2FA code resent to your email"
}
```

### 3. Frontend Components Needed

#### A. VerifyEmailScreen Component
```typescript
/**
 * Screen shown after registration for normal users
 * Features:
 * - 6-digit OTP input field
 * - Countdown timer (10 minutes)
 * - Resend code button (disabled during countdown)
 * - Error message display
 * - Success message and redirect to login
 */
```

#### B. TwoFactorAuthScreen Component
```typescript
/**
 * Screen shown after password validation for admin/fact-checker
 * Features:
 * - 6-digit OTP input field
 * - Countdown timer (10 minutes)
 * - Resend code button (disabled during countdown)
 * - Error message display
 * - Auto-redirect on success
 */
```

#### C. LoginScreen Updates
```typescript
/**
 * Updates needed:
 * 1. Handle requires2FA response
 * 2. Navigate to TwoFactorAuthScreen when 2FA required
 * 3. Show email verification error message with link to resend
 * 4. Store userId, email, role in state for 2FA flow
 */
```

#### D. RegisterScreen Updates
```typescript
/**
 * Updates needed:
 * 1. Navigate to VerifyEmailScreen after successful registration
 * 2. Pass userId and email to verification screen
 * 3. Show success message about checking email
 */
```

### 4. State Management Recommendations

#### Store in App State/Context:
```typescript
interface AuthState {
  // Current user state
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  
  // 2FA/Verification state
  pendingVerification: {
    userId: string;
    email: string;
    type: 'email_verification' | '2fa_login';
    expiresAt: Date;
  } | null;
  
  // Loading states
  isLoading: boolean;
  isVerifying: boolean;
}
```

### 5. UI/UX Best Practices

#### OTP Input Component:
- Use 6 separate input fields (one per digit)
- Auto-focus next field on input
- Auto-submit when all 6 digits entered
- Clear all on error
- Show countdown timer prominently

#### Timer Display:
```typescript
// Example timer format
"Code expires in: 09:45"
"Didn't receive code? Resend (available in 02:15)"
```

#### Error Messages:
- "Invalid code. Please try again."
- "Code expired. Please request a new one."
- "Too many attempts. Please try again later."
- "Please verify your email before logging in."

#### Success Messages:
- "Email verified successfully! Redirecting to login..."
- "Login successful! Redirecting..."

### 6. API Routes to Add in Frontend

```typescript
// src/api/auth.ts or similar

export const authAPI = {
  // Registration
  register: async (email: string, password: string, phone?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, phone })
    });
    return response.json();
  },

  // Email Verification
  verifyEmail: async (userId: string, code: string) => {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code })
    });
    return response.json();
  },

  // Resend Verification Code
  resendVerification: async (email: string) => {
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return response.json();
  },

  // Login
  login: async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  // 2FA Verification
  verify2FA: async (userId: string, code: string) => {
    const response = await fetch('/api/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code })
    });
    return response.json();
  },

  // Resend 2FA Code
  resend2FA: async (userId: string, email: string) => {
    const response = await fetch('/api/auth/resend-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email })
    });
    return response.json();
  }
};
```

### 7. Backend Routes to Create

Add these routes to your Express router:

```typescript
// src/routes/auth.routes.ts

import { Router } from 'express';
import { AuthService } from '../services/auth.service';

const router = Router();

// Registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    const result = await AuthService.register(email, password, phone);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Email Verification
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;
    const result = await AuthService.verifyEmail(userId, code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resend Verification Code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await AuthService.resendVerificationCode(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2FA Verification
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, code } = req.body;
    const result = await AuthService.verify2FA(userId, code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resend 2FA Code
router.post('/resend-2fa', async (req, res) => {
  try {
    const { userId, email } = req.body;
    const result = await AuthService.resend2FACode(userId, email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

### 8. Security Considerations

#### Rate Limiting:
- Limit OTP requests per email (e.g., 3 per hour)
- Limit verification attempts (e.g., 5 attempts per code)
- Implement exponential backoff on failed attempts

#### Code Generation:
- Use cryptographically secure random number generation
- Ensure 6-digit codes (100000-999999)
- Never expose codes in URLs or logs

#### Expiration:
- Set 10-minute expiration for all OTP codes
- Clean up expired codes regularly
- Invalidate old codes when new ones are requested

#### Email Security:
- Use HTTPS for all email links
- Don't include sensitive info in email bodies
- Use proper email authentication (SPF, DKIM, DMARC)

### 9. Testing Checklist

#### Normal User Flow:
- [ ] Can register with email and password
- [ ] Receives verification email with 6-digit code
- [ ] Can verify email with correct code
- [ ] Cannot login before verification
- [ ] Can resend verification code
- [ ] Verification code expires after 10 minutes
- [ ] Can login after verification without 2FA

#### Admin/Fact-Checker Flow:
- [ ] Can enter credentials successfully
- [ ] Receives 2FA email after password validation
- [ ] Can complete login with correct 2FA code
- [ ] Cannot login with expired 2FA code
- [ ] Can resend 2FA code
- [ ] 2FA required on every login

#### Error Handling:
- [ ] Shows clear error for invalid codes
- [ ] Shows clear error for expired codes
- [ ] Shows helpful message for unverified users
- [ ] Handles network errors gracefully

### 10. Monitoring & Logging

#### Log Events:
- Registration attempts
- Email verification attempts
- 2FA code generations
- Login attempts (success/failure)
- Code resend requests
- Expired code usage attempts

#### Metrics to Track:
- Verification success rate
- Average time to verify
- 2FA completion rate
- Failed verification attempts
- Email delivery rates

## Summary

This implementation provides:
1. **Email verification for normal users** - One-time verification on registration
2. **2FA for admin/fact-checker** - Required on every login for enhanced security
3. **10-minute OTP expiration** - Balanced security and user experience
4. **Resend functionality** - User-friendly code delivery
5. **SMTP email delivery** - Reliable email service integration

All backend services are implemented. Frontend needs to add the screens and API integrations documented above.
