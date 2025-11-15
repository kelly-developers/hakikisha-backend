# 📧 Email & SMTP Setup Guide for Hakikisha

## 🎯 Overview

This guide covers the complete email configuration for:
- ✅ **Email Verification** for new users during registration
- ✅ **Two-Factor Authentication (2FA)** for admins and fact-checkers
- ✅ **Password Reset** emails for all users

---

## 🚨 CRITICAL: Environment Variables on Render

### Required Email Variables

Add these to your **Render Dashboard → Environment Variables**:

```bash
# Email Service Configuration
EMAIL_SERVICE=gmail

# Gmail SMTP Credentials
EMAIL_USER=crecocommunication@gmail.com
EMAIL_PASSWORD=blreyjvnynjupkrr

# Email Sender Information
EMAIL_FROM=crecocommunication@gmail.com
EMAIL_FROM_NAME=Hakikisha Fact-Checking

# Frontend URL (for password reset links)
FRONTEND_URL=https://your-frontend-url.vercel.app
```

---

## 📋 Complete Environment Variables Checklist

### ✅ Current Variables (Already Set)

These are already configured in your Render:
- `ALLOWED_ORIGINS` ✓
- `DB_SCHEMA`, `DATASOURCE_URL`, `DATASOURCE_USER`, `DATASOURCE_PASSWORD` ✓
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` ✓
- `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_FROM_NAME` ✓
- `FRONTEND_URL` ✓
- `NODE_ENV`, `PORT`, `SERVER_URL` ✓

### ⚠️ MISSING Variable (MUST ADD)

**Add this immediately:**

```bash
EMAIL_SERVICE=gmail
```

This tells the backend to use Gmail's built-in SMTP configuration instead of custom SMTP settings.

### 🗑️ Optional: Remove These Variables

Since you're using `EMAIL_SERVICE=gmail`, you can optionally remove these (they won't be used):
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`

**Note:** It's fine to keep them, but they're ignored when `EMAIL_SERVICE=gmail`.

---

## 🔧 How to Add the Missing Variable on Render

1. Go to your Render dashboard
2. Navigate to your **hakikisha-backend** service
3. Click **Environment** tab
4. Click **Add Environment Variable**
5. Set:
   - **Key:** `EMAIL_SERVICE`
   - **Value:** `gmail`
6. Click **Save Changes**
7. **Redeploy** your service (Render will automatically redeploy)

---

## 📧 Gmail App Password Setup

You're already using a Gmail App Password: `blreyjvnynjupkrr`

If you need to regenerate it:

1. **Enable 2-Step Verification** on your Google Account:
   - Go to: https://myaccount.google.com/security
   - Enable **2-Step Verification**

2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select **Mail** and **Other (Custom name)**
   - Name it: `Hakikisha Backend`
   - Copy the 16-character password
   - Update `EMAIL_PASSWORD` on Render

---

## 🔐 Authentication Flows

### 1️⃣ Regular User Registration (Email Verification)

**Flow:**
1. User registers with email, password, username, phone
2. Backend creates account with `is_verified = false`
3. Backend generates 6-digit OTP (expires in 10 minutes)
4. Backend sends verification email to user
5. User enters OTP in app
6. Backend verifies OTP and sets `is_verified = true`
7. User can now log in

**API Endpoints:**
- `POST /api/v1/auth/register` - Register user (sends verification email)
- `POST /api/v1/auth/verify-email` - Verify OTP code
- `POST /api/v1/auth/resend-verification` - Resend verification OTP

### 2️⃣ Admin/Fact-Checker Login (Two-Factor Authentication)

**Flow:**
1. Admin/Fact-checker enters email & password
2. Backend validates credentials
3. Backend generates 6-digit 2FA OTP (expires in 10 minutes)
4. Backend sends 2FA email
5. Backend returns `{ requires2FA: true, userId: "...", tempToken: "..." }`
6. User enters 2FA OTP in app
7. Backend verifies 2FA OTP and completes login
8. User receives full JWT token

**API Endpoints:**
- `POST /api/v1/auth/login` - Login (sends 2FA for admin/fact-checker)
- `POST /api/v1/auth/verify-2fa` - Verify 2FA OTP
- `POST /api/v1/auth/resend-2fa` - Resend 2FA OTP

### 3️⃣ Password Reset (All Users)

**Flow:**
1. User clicks "Forgot Password"
2. User enters email
3. Backend generates secure reset token
4. Backend sends password reset email with link
5. User clicks link (opens app with token)
6. User enters new password
7. Backend validates token and resets password

**API Endpoints:**
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token

---

## 🚀 Frontend Implementation Requirements

### 1. Email Verification Screen

**When to show:** After successful registration for regular users

**UI Requirements:**
```typescript
// VerifyEmailScreen.tsx
- Title: "Verify Your Email"
- Subtitle: "Enter the 6-digit code sent to your email"
- 6-digit OTP input (auto-focus, auto-advance)
- "Verify" button
- Countdown timer (10 minutes)
- "Resend Code" button (enabled after 60 seconds)
- Error messages
```

**API Calls:**
```typescript
// Verify email
POST /api/v1/auth/verify-email
Body: { userId: string, code: string }
Response: { success: true, message: "Email verified" }

// Resend code
POST /api/v1/auth/resend-verification
Body: { userId: string, email: string }
Response: { success: true, message: "Code sent" }
```

### 2. Two-Factor Authentication Screen

**When to show:** After password validation for admin/fact-checker

**UI Requirements:**
```typescript
// TwoFactorAuthScreen.tsx
- Title: "Two-Factor Authentication"
- Subtitle: "Enter the code sent to your email"
- 6-digit OTP input
- "Verify" button
- Countdown timer (10 minutes)
- "Resend Code" button
- Back button
```

**API Calls:**
```typescript
// Verify 2FA
POST /api/v1/auth/verify-2fa
Body: { userId: string, code: string, tempToken: string }
Response: { success: true, token: string, user: {...} }

// Resend 2FA
POST /api/v1/auth/resend-2fa
Body: { userId: string, email: string }
Response: { success: true, message: "Code sent" }
```

### 3. Forgot/Reset Password Screens

**ForgotPasswordScreen.tsx:**
```typescript
- Title: "Forgot Password?"
- Email input
- "Send Reset Link" button
- Back to login link
```

**API Call:**
```typescript
POST /api/v1/auth/forgot-password
Body: { email: string }
Response: { success: true, message: "Email sent" }
```

**ResetPasswordScreen.tsx:**
```typescript
- Title: "Reset Password"
- New password input
- Confirm password input
- "Reset Password" button
- Password strength indicator
```

**API Call:**
```typescript
POST /api/v1/auth/reset-password
Body: { token: string, email: string, newPassword: string }
Response: { success: true, message: "Password reset" }
```

### 4. Login Screen Updates

**Handle 2FA flow:**
```typescript
const handleLogin = async (email, password) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.requires2FA) {
    // Navigate to TwoFactorAuthScreen
    navigation.navigate('TwoFactorAuth', {
      userId: data.userId,
      tempToken: data.tempToken,
      email: email
    });
  } else if (data.requiresEmailVerification) {
    // Navigate to VerifyEmailScreen
    navigation.navigate('VerifyEmail', {
      userId: data.userId,
      email: email
    });
  } else if (data.success) {
    // Save token and navigate to app
    await saveAuthToken(data.token);
    navigation.navigate('Home');
  }
};
```

---

## 🔍 Troubleshooting

### Issue: "Connection timeout" error

**Symptoms:**
- Registration takes 2+ minutes
- Error: "ETIMEDOUT"

**Solution:**
1. Add `EMAIL_SERVICE=gmail` to Render environment variables
2. Redeploy the service
3. Test registration again

### Issue: "Invalid login" error

**Cause:** Gmail is blocking the login

**Solution:**
1. Check if 2-Step Verification is enabled
2. Regenerate App Password
3. Update `EMAIL_PASSWORD` on Render

### Issue: Emails not being received

**Checklist:**
- [ ] Check spam folder
- [ ] Verify `EMAIL_USER` and `EMAIL_PASSWORD` are correct
- [ ] Ensure `EMAIL_FROM` matches `EMAIL_USER`
- [ ] Check Gmail account isn't locked
- [ ] Try sending a test email manually

### Issue: OTP expired

**Cause:** OTP codes expire after 10 minutes

**Solution:**
- User should click "Resend Code"
- New OTP will be generated and sent

---

## ✅ Testing Checklist

### Email Verification (Regular Users)
- [ ] Register new user
- [ ] Receive verification email within 30 seconds
- [ ] Enter correct OTP - should verify successfully
- [ ] Enter wrong OTP - should show error
- [ ] Wait 10+ minutes - OTP should expire
- [ ] Click "Resend Code" - should receive new email
- [ ] Login with verified account - should work
- [ ] Try login with unverified account - should be blocked

### Two-Factor Authentication (Admin/Fact-Checker)
- [ ] Login with admin credentials
- [ ] Receive 2FA email within 30 seconds
- [ ] Enter correct 2FA code - should complete login
- [ ] Enter wrong code - should show error
- [ ] Wait 10+ minutes - should expire
- [ ] Click "Resend Code" - should receive new email
- [ ] Complete login - should access admin dashboard

### Password Reset (All Users)
- [ ] Click "Forgot Password"
- [ ] Enter email
- [ ] Receive reset email within 30 seconds
- [ ] Click reset link in email
- [ ] Enter new password
- [ ] Reset should succeed
- [ ] Login with new password - should work
- [ ] Try using old reset link - should be invalid

---

## 📊 Performance Optimization

### Current Issue: Slow Registration (2+ minutes)

**Root Cause:** Email timeout due to missing `EMAIL_SERVICE` configuration

**Fix Applied:**
1. Added `EMAIL_SERVICE=gmail` configuration
2. Added connection timeouts (10s connection, 15s socket)
3. Using Gmail's built-in SMTP settings

**Expected Result:** Registration completes in 5-10 seconds

### Monitoring

Check Render logs for:
```bash
# Success
✅ Email verification code sent to: user@email.com

# Failure
❌ Error sending email verification code: [error details]
```

---

## 🔒 Security Notes

1. **OTP Security:**
   - Codes expire after 10 minutes
   - One-time use only
   - Stored in `hakikisha.otp_codes` table
   - Automatically cleaned up after expiration

2. **Password Reset Security:**
   - Tokens expire after 1 hour
   - One-time use only
   - Stored in `hakikisha.otp_codes` table with type 'password_reset'

3. **Rate Limiting:**
   - Consider adding rate limits for:
     - OTP generation (max 3 per 10 minutes)
     - Login attempts (max 5 per 15 minutes)
     - Password reset requests (max 3 per hour)

---

## 📞 Support

If you encounter issues:
1. Check Render logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test email configuration with `testConnection()` method
4. Check Gmail account isn't locked or flagged

---

## 🎉 Next Steps

After adding `EMAIL_SERVICE=gmail`:

1. ✅ Redeploy on Render
2. ✅ Test user registration (should receive email within 30 seconds)
3. ✅ Test admin login (should receive 2FA email)
4. ✅ Test password reset (should receive reset email)
5. ✅ Build frontend screens for email verification and 2FA
6. ✅ Add proper error handling and user feedback
7. ✅ Monitor email delivery and performance

**Estimated Registration Time After Fix:** 5-10 seconds (down from 2+ minutes)
