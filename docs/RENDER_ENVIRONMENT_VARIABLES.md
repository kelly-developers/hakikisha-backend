# 🔧 Render Environment Variables - Complete Guide

## 🎯 Quick Fix for Email Timeout Issue

**CRITICAL: Add this variable immediately:**

```bash
Key: EMAIL_SERVICE
Value: gmail
```

This will fix the 2+ minute registration delay and "Connection timeout" errors.

---

## 📋 Complete Environment Variables List

### ✅ Currently Configured (Keep These)

```bash
# CORS Configuration
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:3000

# Database Configuration
DATASOURCE_URL=jdbc:postgresql://dpg-d1shosh5pdvs73ahbdog-a.frankfurt-postgres.render.com:5432/deepkentom?currentSchema=hakikisha&sslmode=require
DATASOURCE_USER=deepkentom
DATASOURCE_PASSWORD=BN3jcRrGBXERpn9jhGtqEAu2A5wlCh9K
DB_SCHEMA=hakikisha

# Database Pool Settings
DB_POOL_MAX=20
DB_POOL_MIN=2

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-too
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration (Gmail)
EMAIL_USER=crecocommunication@gmail.com
EMAIL_PASSWORD=blreyjvnynjupkrr
EMAIL_FROM=crecocommunication@gmail.com
EMAIL_FROM_NAME=Hakikisha Fact-Checking

# Frontend URL (for password reset links)
FRONTEND_URL=https://your-frontend-url.vercel.app

# Server Configuration
NODE_ENV=production
PORT=10000
SERVER_URL=https://hakikisha-backend.onrender.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration (currently disabled)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# Application Settings
REGISTRATION_APPROVAL_REQUIRED=false
AUTO_ASSIGN_CLAIMS=true
TRENDING_THRESHOLD=10
MAX_FILE_SIZE=• • • • • • • • • • • •
CACHE_TTL=3600
```

---

## ⚠️ MISSING Variables (ADD IMMEDIATELY)

### 1. EMAIL_SERVICE (CRITICAL)

```bash
Key: EMAIL_SERVICE
Value: gmail
```

**Why it's needed:**
- Without this, the backend tries to use custom SMTP configuration
- Gmail SMTP requires specific settings that are different from generic SMTP
- This is causing the "Connection timeout" errors
- Registration takes 2+ minutes because it's waiting for email to timeout

**How to add:**
1. Go to Render Dashboard
2. Select your **hakikisha-backend** service
3. Click **Environment** tab
4. Click **Add Environment Variable**
5. Enter: `EMAIL_SERVICE` = `gmail`
6. Click **Save Changes**
7. Render will auto-redeploy

---

## 🗑️ Optional: Variables to Remove

These variables are ignored when using `EMAIL_SERVICE=gmail` (you can keep them, but they're not used):

```bash
EMAIL_HOST=smtp.gmail.com  # Not needed with EMAIL_SERVICE=gmail
EMAIL_PORT=587             # Not needed with EMAIL_SERVICE=gmail
EMAIL_SECURE=false         # Not needed with EMAIL_SERVICE=gmail
```

---

## 📊 Environment Variables by Feature

### Database & Connection
```bash
DATASOURCE_URL=jdbc:postgresql://...
DATASOURCE_USER=deepkentom
DATASOURCE_PASSWORD=BN3jcRrGBXERpn9jhGtqEAu2A5wlCh9K
DB_SCHEMA=hakikisha
DB_POOL_MAX=20
DB_POOL_MIN=2
```

### Authentication & Security
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-too
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

### Email & SMTP (2FA + Verification)
```bash
EMAIL_SERVICE=gmail                              # ⚠️ MISSING - ADD THIS
EMAIL_USER=crecocommunication@gmail.com
EMAIL_PASSWORD=blreyjvnynjupkrr
EMAIL_FROM=crecocommunication@gmail.com
EMAIL_FROM_NAME=Hakikisha Fact-Checking
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### CORS & Security
```bash
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Server Configuration
```bash
NODE_ENV=production
PORT=10000
SERVER_URL=https://hakikisha-backend.onrender.com
```

### Application Features
```bash
REGISTRATION_APPROVAL_REQUIRED=false
AUTO_ASSIGN_CLAIMS=true
TRENDING_THRESHOLD=10
MAX_FILE_SIZE=• • • • • • • • • • • •
CACHE_TTL=3600
```

### Caching (Optional - Currently Disabled)
```bash
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379
```

---

## 🔐 Security Recommendations

### 1. Update JWT Secrets (IMPORTANT)

Your current JWT secrets are still using default values:
- `JWT_SECRET=your-super-secret-jwt-key-change-this-in-production`
- `JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-too`

**Generate new secrets:**

```bash
# Run this command twice to generate two different secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Then update on Render:**
```bash
JWT_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
```

### 2. Update Frontend URL

Update this to your actual production frontend URL:
```bash
FRONTEND_URL=https://your-actual-frontend-domain.com
```

### 3. Update ALLOWED_ORIGINS

Make sure it includes all your frontend URLs:
```bash
ALLOWED_ORIGINS=https://your-actual-frontend.com,https://app.yourdomain.com,capacitor://localhost
```

**Note:** Include `capacitor://localhost` if you have a mobile app.

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Add Missing EMAIL_SERVICE Variable

1. Go to: https://dashboard.render.com
2. Select your **hakikisha-backend** service
3. Click **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   ```
   Key: EMAIL_SERVICE
   Value: gmail
   ```
6. Click **Save Changes**
7. Wait for auto-redeploy (2-3 minutes)

### Step 2: Update JWT Secrets

1. Generate two new secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. In Render Environment tab, find `JWT_SECRET`
3. Click **Edit**
4. Paste new secret
5. Repeat for `JWT_REFRESH_SECRET`
6. Click **Save Changes**

### Step 3: Update Frontend URLs

1. Find your production frontend URL
2. Update these variables:
   ```bash
   FRONTEND_URL=https://your-real-frontend.com
   ALLOWED_ORIGINS=https://your-real-frontend.com,capacitor://localhost
   ```

### Step 4: Test the Setup

1. Wait for deployment to complete
2. Test user registration:
   ```bash
   curl -X POST https://hakikisha-backend.onrender.com/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "test123",
       "username": "testuser",
       "full_name": "Test User"
     }'
   ```
3. Check email inbox (should receive OTP within 30 seconds)
4. Check Render logs for success message:
   ```
   ✅ Email verification code sent to: test@example.com
   ```

---

## 📊 Expected Performance After Fix

### Before Fix
- Registration time: **120+ seconds** (2+ minutes)
- Error: `Connection timeout (ETIMEDOUT)`
- User experience: App appears frozen

### After Adding EMAIL_SERVICE=gmail
- Registration time: **5-10 seconds**
- Email delivery: **Within 30 seconds**
- User experience: Smooth, responsive

---

## 🔍 Troubleshooting

### Still Getting Timeouts?

1. **Check Gmail App Password:**
   - Must be 16 characters (no spaces)
   - Generated from: https://myaccount.google.com/apppasswords
   - 2-Step Verification must be enabled

2. **Verify Environment Variables:**
   ```bash
   # In Render, check these are set:
   EMAIL_SERVICE=gmail ✓
   EMAIL_USER=crecocommunication@gmail.com ✓
   EMAIL_PASSWORD=blreyjvnynjupkrr ✓
   ```

3. **Check Render Logs:**
   - Go to: Service → Logs
   - Look for email-related errors
   - Search for: "Error sending email"

### Emails Not Being Received?

1. **Check Spam Folder**
2. **Verify Email Service Status:**
   - Gmail: https://www.google.com/appsstatus
3. **Test Email Configuration:**
   - Add a test endpoint in your backend
   - Send a test email manually
4. **Check Gmail Account:**
   - Not locked or flagged
   - 2-Step Verification enabled
   - App Password is valid

---

## 📞 Quick Reference

### Add Variable on Render
1. Dashboard → Service → Environment
2. Add Environment Variable
3. Key + Value
4. Save Changes
5. Auto-redeploy

### Check Logs
1. Dashboard → Service → Logs
2. Search for errors
3. Filter by timestamp

### Redeploy Manually
1. Dashboard → Service
2. Manual Deploy → Deploy latest commit
3. Wait 2-3 minutes

---

## ✅ Final Checklist

Before going to production:

- [ ] `EMAIL_SERVICE=gmail` added to Render
- [ ] JWT secrets updated (not default values)
- [ ] `FRONTEND_URL` points to production frontend
- [ ] `ALLOWED_ORIGINS` includes all frontend domains
- [ ] Test user registration (receives email within 30s)
- [ ] Test admin login (receives 2FA email)
- [ ] Test password reset (receives reset email)
- [ ] Registration completes in under 10 seconds
- [ ] All emails landing in inbox (not spam)
- [ ] Database connection stable
- [ ] Rate limiting working as expected

---

## 🎉 Next Steps

After fixing the email configuration:

1. **Frontend Implementation:**
   - Build VerifyEmailScreen component
   - Build TwoFactorAuthScreen component
   - Build ForgotPassword/ResetPassword screens
   - Update LoginScreen to handle 2FA flow

2. **Testing:**
   - Test complete registration flow
   - Test admin/fact-checker 2FA login
   - Test password reset flow
   - Test edge cases (expired OTPs, wrong codes)

3. **Monitoring:**
   - Set up error tracking
   - Monitor email delivery rates
   - Track authentication failures
   - Monitor response times

---

**Documentation Complete! 🚀**

Add `EMAIL_SERVICE=gmail` to Render, redeploy, and your email issues will be resolved.
