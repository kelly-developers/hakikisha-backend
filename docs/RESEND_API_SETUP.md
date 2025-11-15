# 📧 Resend API Setup Guide for Hakikisha

## 🎯 Overview

Hakikisha now uses **Resend API** instead of SMTP for sending emails. This provides:
- ✅ **Faster delivery** (no SMTP connection overhead)
- ✅ **Better deliverability** (optimized infrastructure)
- ✅ **Easier setup** (just one API key needed)
- ✅ **Real-time tracking** (email delivery status)

---

## 🚀 Quick Setup

### Step 1: Get Your Resend API Key

1. Go to [resend.com](https://resend.com) and create a free account
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Copy your API key (starts with `re_`)

### Step 2: Verify Your Domain (IMPORTANT!)

⚠️ **You MUST verify your domain before sending emails in production**

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `hakikisha.co.ke`)
4. Add the DNS records shown to your domain provider
5. Click **Verify DNS Records**

**For Development/Testing:**
- You can use `onboarding@resend.dev` as the sender (no verification needed)
- Limited to 100 emails per day
- Only sends to the email you signed up with

---

## 🔧 Backend Configuration

### Required Environment Variables

Add these to your **Render Dashboard → Environment Variables**:

```bash
# Resend API Configuration
RESEND_API_KEY=re_your_api_key_here

# Email Sender Configuration
EMAIL_FROM=Hakikisha <noreply@hakikisha.co.ke>

# Frontend URL (for password reset links)
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### Remove Old SMTP Variables (Optional)

These are no longer needed with Resend:
- ❌ `EMAIL_SERVICE`
- ❌ `EMAIL_USER`
- ❌ `EMAIL_PASSWORD`
- ❌ `EMAIL_HOST`
- ❌ `EMAIL_PORT`
- ❌ `EMAIL_SECURE`

---

## 📋 Email Types Supported

### 1️⃣ Email Verification (Registration)

**When:** User registers for the first time

**Email Contains:**
- 6-digit verification code
- 10-minute expiration
- Professional Hakikisha branding

**API Endpoint:** `POST /api/v1/auth/verify-email`

---

### 2️⃣ Two-Factor Authentication (2FA)

**When:** Admin or Fact-Checker logs in

**Email Contains:**
- 6-digit authentication code
- 10-minute expiration
- Security warning

**API Endpoint:** `POST /api/v1/auth/verify-2fa`

---

### 3️⃣ Password Reset

**When:** User requests password reset

**Email Contains:**
- Secure reset link
- 1-hour expiration
- One-time use token

**API Endpoint:** `POST /api/v1/auth/reset-password`

---

## 🧪 Testing

### Test Email Service

```bash
# Test the email service
curl -X GET http://localhost:5000/health

# Should return:
{
  "status": "ok",
  "emailService": "configured"
}
```

### Test Registration Email

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!",
    "phone_number": "+254712345678"
  }'
```

**Expected:**
- Email sent to `test@example.com` within 5 seconds
- Check your inbox for verification code

---

## 🎨 Frontend Implementation

### Registration Flow

```typescript
// 1. User submits registration form
const response = await api.post('/auth/register', {
  email: 'user@example.com',
  username: 'johndoe',
  password: 'SecurePass123!',
  phone_number: '+254712345678'
});

// 2. Backend sends verification email
// 3. Navigate to VerifyEmail screen
navigation.navigate('VerifyEmail', {
  userId: response.data.userId,
  email: response.data.email
});

// 4. User enters 6-digit code
const verifyResponse = await api.post('/auth/verify-email', {
  userId: userId,
  code: '123456'
});

// 5. User can now log in
```

---

### Login Flow (Admin/Fact-Checker)

```typescript
// 1. User enters credentials
const response = await api.post('/auth/login', {
  identifier: 'admin@example.com', // email or username
  password: 'AdminPass123!'
});

// 2. Check if 2FA required
if (response.data.requires2FA) {
  // Backend sends 2FA email
  navigation.navigate('TwoFactorAuth', {
    userId: response.data.userId,
    tempToken: response.data.tempToken,
    email: response.data.email
  });
}

// 3. User enters 2FA code
const twoFAResponse = await api.post('/auth/verify-2fa', {
  userId: userId,
  code: '789012',
  tempToken: tempToken
});

// 4. Login complete - save token
await saveAuthToken(twoFAResponse.data.token);
```

---

### Password Reset Flow

```typescript
// 1. User clicks "Forgot Password"
const response = await api.post('/auth/forgot-password', {
  email: 'user@example.com'
});

// 2. Backend sends reset email
// 3. User clicks link in email (opens app with token)

// 4. User enters new password
const resetResponse = await api.post('/auth/reset-password', {
  token: resetToken,
  email: 'user@example.com',
  newPassword: 'NewSecurePass123!'
});

// 5. Password reset complete
```

---

## ⚙️ Resend API Limits

### Free Plan
- ✅ 100 emails/day
- ✅ 3,000 emails/month
- ✅ 1 verified domain
- ❌ No phone support

### Pro Plan ($20/month)
- ✅ 50,000 emails/month
- ✅ Unlimited verified domains
- ✅ Priority support
- ✅ Advanced analytics

For 5M users, you'll need a custom enterprise plan.

---

## 🔍 Monitoring & Debugging

### Check Resend Dashboard

1. Go to [resend.com/emails](https://resend.com/emails)
2. View all sent emails
3. Check delivery status:
   - ✅ **Delivered** - Email successfully received
   - 📤 **Sent** - Email in transit
   - ❌ **Failed** - Check error details

### Backend Logs

Check your Render logs for:

```bash
# Success
✅ Email verification code sent to: user@email.com (ID: abc123)

# Failure
❌ Error sending email verification code via Resend: [error details]
```

---

## 🐛 Troubleshooting

### Issue: "Invalid API key"

**Solution:**
1. Verify `RESEND_API_KEY` starts with `re_`
2. Check key is active in Resend dashboard
3. Redeploy backend after adding key

---

### Issue: "Domain not verified"

**Solution:**
1. Use `onboarding@resend.dev` for testing
2. Or verify your domain at [resend.com/domains](https://resend.com/domains)
3. Update `EMAIL_FROM` to use verified domain

---

### Issue: "Emails not being received"

**Checklist:**
- [ ] Check spam/junk folder
- [ ] Verify domain is verified (for production)
- [ ] Check Resend dashboard for delivery status
- [ ] Verify `EMAIL_FROM` is correct
- [ ] Check email address is valid

---

### Issue: "Rate limit exceeded"

**Solution:**
- Free plan: 100 emails/day limit reached
- Upgrade to Pro plan or wait 24 hours
- Check Resend dashboard for usage

---

## 🔒 Security Best Practices

### 1. Protect Your API Key

```bash
# ✅ DO: Store in environment variables
RESEND_API_KEY=re_abc123xyz

# ❌ DON'T: Hardcode in code
const resend = new Resend('re_abc123xyz'); // NEVER DO THIS!
```

---

### 2. Use Verified Domains in Production

```bash
# ✅ DO: Use your verified domain
EMAIL_FROM=Hakikisha <noreply@hakikisha.co.ke>

# ❌ DON'T: Use resend.dev in production
EMAIL_FROM=onboarding@resend.dev
```

---

### 3. Implement Rate Limiting

Already implemented in `src/middleware/performanceMiddleware.js`

---

## 📊 Performance

### Expected Email Delivery Times

- **Email Verification:** 2-5 seconds
- **2FA Code:** 2-5 seconds
- **Password Reset:** 2-5 seconds

### Comparison: SMTP vs Resend

| Metric | SMTP (Old) | Resend (New) |
|--------|-----------|-------------|
| Setup Time | 15-30 mins | 5 mins |
| Delivery Time | 10-30 secs | 2-5 secs |
| Deliverability | ~85% | ~99% |
| Tracking | No | Yes |
| Setup Complexity | High | Low |

---

## ✅ Deployment Checklist

Before going to production:

- [ ] Resend API key added to Render environment variables
- [ ] Domain verified in Resend dashboard
- [ ] `EMAIL_FROM` updated with verified domain
- [ ] Test all 3 email types (verification, 2FA, password reset)
- [ ] Check emails not going to spam
- [ ] Monitor Resend dashboard for first 24 hours
- [ ] Old SMTP environment variables removed
- [ ] Backend redeployed with Resend integration

---

## 🎉 Next Steps

1. ✅ Add `RESEND_API_KEY` to Render
2. ✅ Verify your domain (or use `onboarding@resend.dev` for testing)
3. ✅ Update `EMAIL_FROM` environment variable
4. ✅ Redeploy backend on Render
5. ✅ Test registration email
6. ✅ Test admin 2FA email
7. ✅ Test password reset email
8. ✅ Build frontend verification screens
9. ✅ Monitor email delivery in Resend dashboard

---

## 📞 Support

- **Resend Docs:** [resend.com/docs](https://resend.com/docs)
- **Resend Support:** [resend.com/support](https://resend.com/support)
- **Backend Logs:** Check Render dashboard

---

## 🔄 Migration from SMTP

### What Changed?

| Feature | SMTP (Old) | Resend (New) |
|---------|-----------|-------------|
| Library | `nodemailer` | `resend` |
| Config | 6+ env vars | 1 env var |
| Setup | Complex | Simple |
| Speed | Slower | Faster |

### What Stayed the Same?

- ✅ All email templates (unchanged)
- ✅ All API endpoints (unchanged)
- ✅ Frontend integration (unchanged)
- ✅ Email types (verification, 2FA, password reset)

---

**🎉 You're all set! Resend is now handling all email delivery for Hakikisha.**
