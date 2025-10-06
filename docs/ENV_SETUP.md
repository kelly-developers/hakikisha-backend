# 🔧 Environment Variables Setup Guide

## 📝 Overview

This guide explains every environment variable needed for the HAKIKISHA backend.

## 🚨 Required vs Optional Variables

### ✅ REQUIRED (Must Set)
- `ALLOWED_ORIGINS` - CORS configuration
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - Authentication security

### ⚠️ RECOMMENDED
- `NODE_ENV` - Environment mode
- `PORT` - Server port
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` - Rate limiting

### ⭐ OPTIONAL
- AWS credentials (if using S3 for file uploads)
- Redis credentials (if using caching)
- Email service credentials (if sending emails)
- AI API credentials (if using AI fact-checking)

---

## 🌐 CORS Configuration

### `ALLOWED_ORIGINS`

**Purpose:** Controls which domains can make requests to your API

**Format:** Comma-separated list of origins

**For Development:**
```bash
ALLOWED_ORIGINS=capacitor://localhost,http://localhost,ionic://localhost,http://localhost:3000,http://localhost:8080
```

**For Production:**
```bash
ALLOWED_ORIGINS=capacitor://localhost,http://localhost,https://hakikisha.app,https://yourdomain.com
```

**Why it matters:** 
- Mobile apps use `capacitor://localhost` as origin
- Without this, your mobile app CANNOT connect to backend
- Security: Only allow trusted domains

---

## 🗄️ Database Configuration (PostgreSQL)

### Option 1: Individual Variables (Recommended for Render)

```bash
DB_HOST=dpg-xxx.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=hakikisha_db
DB_USER=hakikisha_user
DB_PASSWORD=your_password_here
```

**How to get these from Render:**
1. Go to your Render PostgreSQL dashboard
2. Click on your database
3. Copy values from "Connection" section
4. Set each variable in Render environment

### Option 2: Database URL (Alternative)

```bash
DATABASE_URL=postgres://username:password@host:port/database
```

**Example:**
```bash
DATABASE_URL=postgres://hakikisha_user:abc123@dpg-xxx.oregon-postgres.render.com/hakikisha_db
```

**Note:** Render provides `DATABASE_URL` automatically for PostgreSQL instances

---

## 🔐 JWT Configuration

### `JWT_SECRET` (REQUIRED)

**Purpose:** Signs JWT tokens for user authentication

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example:**
```bash
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**⚠️ CRITICAL:** 
- Never use the default value in production
- Keep this secret secure
- Never commit to git

### `JWT_REFRESH_SECRET` (REQUIRED)

**Purpose:** Signs refresh tokens for renewing expired JWTs

**How to generate:** Same as JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example:**
```bash
JWT_REFRESH_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
```

### `JWT_EXPIRES_IN`

**Purpose:** How long JWT tokens are valid

**Options:**
- `15m` - 15 minutes
- `1h` - 1 hour
- `24h` - 24 hours (recommended)
- `7d` - 7 days

**Example:**
```bash
JWT_EXPIRES_IN=24h
```

### `JWT_REFRESH_EXPIRES_IN`

**Purpose:** How long refresh tokens are valid

**Options:**
- `7d` - 7 days (recommended)
- `30d` - 30 days
- `90d` - 90 days

**Example:**
```bash
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 🚦 Rate Limiting

### `RATE_LIMIT_WINDOW_MS`

**Purpose:** Time window for rate limiting (in milliseconds)

**Common values:**
- `900000` - 15 minutes (recommended)
- `60000` - 1 minute
- `3600000` - 1 hour

**Example:**
```bash
RATE_LIMIT_WINDOW_MS=900000
```

### `RATE_LIMIT_MAX_REQUESTS`

**Purpose:** Maximum requests allowed per window per IP address

**Common values:**
- `100` - Normal usage (recommended)
- `1000` - High traffic
- `50` - Strict limiting

**Example:**
```bash
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🌍 Server Configuration

### `NODE_ENV`

**Purpose:** Defines the runtime environment

**Options:**
- `development` - Development mode (detailed errors, CORS relaxed)
- `production` - Production mode (secure, optimized)

**Example:**
```bash
NODE_ENV=production
```

### `PORT`

**Purpose:** Port number the server listens on

**Default:** 5000

**Example:**
```bash
PORT=5000
```

**Note:** Render automatically sets PORT, you usually don't need to set this

### `SERVER_URL`

**Purpose:** Full URL where backend is hosted (for emails, redirects)

**Example:**
```bash
SERVER_URL=https://hakikisha-backend.onrender.com
```

---

## ☁️ AWS Configuration (Optional)

Only needed if you want to store files (images, videos) on AWS S3.

```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
AWS_REGION=us-east-1
S3_BUCKET_NAME=hakikisha-uploads
CLOUDFRONT_DISTRIBUTION=d111111abcdef8.cloudfront.net
```

**How to get these:**
1. Create AWS account
2. Create IAM user with S3 access
3. Create S3 bucket
4. Get credentials from IAM console

---

## 📧 Email Configuration (Optional)

Only needed if you want to send notification emails.

```bash
EMAIL_SERVICE=ses
EMAIL_FROM=noreply@hakikisha.com
SENDGRID_API_KEY=SG.xxx...
```

**Email service options:**
- `ses` - Amazon SES
- `sendgrid` - SendGrid
- `smtp` - Generic SMTP

---

## 🤖 AI Configuration (Optional)

Only needed if you want AI-powered fact-checking.

```bash
AI_API_KEY=sk-...
AI_API_URL=https://api.openai.com/v1
AI_MODEL_VERSION=gpt-4
```

---

## 🎯 Complete .env Example for Development

Create a file named `.env` in your project root:

```bash
# CORS
ALLOWED_ORIGINS=capacitor://localhost,http://localhost,ionic://localhost,http://localhost:3000,http://localhost:8080

# Server
NODE_ENV=development
PORT=5000

# Database (Local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hakikisha_dev
DB_USER=postgres
DB_PASSWORD=postgres

# JWT (Generate your own!)
JWT_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Complete .env Example for Render Production

Set these in your Render dashboard (Environment tab):

```bash
# CORS - Include your production domains
ALLOWED_ORIGINS=capacitor://localhost,http://localhost,https://hakikisha.app,https://yourdomain.com

# Server
NODE_ENV=production

# Database (Copy from Render PostgreSQL dashboard)
DB_HOST=dpg-xxx.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=hakikisha_db
DB_USER=hakikisha_user
DB_PASSWORD=your_password_from_render

# JWT (Generate secure secrets!)
JWT_SECRET=generate_32_character_random_string
JWT_REFRESH_SECRET=generate_another_32_character_random_string
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## ✅ Verification Checklist

After setting environment variables:

- [ ] `ALLOWED_ORIGINS` includes `capacitor://localhost`
- [ ] Database credentials are from Render dashboard
- [ ] JWT secrets are randomly generated (not default values)
- [ ] `NODE_ENV` is set to `production` on Render
- [ ] Tested backend with `curl https://your-backend.onrender.com/health`
- [ ] Redeployed service after setting variables
- [ ] Mobile app can connect to backend

---

## 🔒 Security Best Practices

1. **Never commit .env file to git**
   - Add `.env` to `.gitignore`
   - Keep `.env.example` for documentation

2. **Generate strong secrets**
   - Use `crypto.randomBytes(32).toString('hex')`
   - Don't use dictionary words or simple patterns

3. **Rotate secrets periodically**
   - Change JWT secrets every 3-6 months
   - Update database passwords regularly

4. **Restrict CORS in production**
   - Don't use `*` (allow all)
   - Only include necessary domains

5. **Use environment-specific values**
   - Different secrets for dev/staging/production
   - Different rate limits per environment

---

## 📞 Common Issues

### Issue: Mobile app can't connect

**Check:**
- Is `capacitor://localhost` in `ALLOWED_ORIGINS`?
- Did you redeploy after setting variables?

### Issue: 401 Unauthorized errors

**Check:**
- Are JWT secrets set?
- Are they the same as when tokens were generated?

### Issue: Database connection failed

**Check:**
- Are database credentials correct?
- Is database running?
- Can you connect with `psql` command?

### Issue: Rate limit blocking legitimate users

**Solution:**
- Increase `RATE_LIMIT_MAX_REQUESTS`
- Increase `RATE_LIMIT_WINDOW_MS`
