# HAKIKISHA Admin Setup & 2FA Guide

## 🔐 Creating the Admin User

### Automatic Creation (Recommended)

Run this script after deploying your backend:

```bash
npm run create-admin
```

Or manually:

```bash
node src/scripts/createAdmin.js
```

### What it does:

1. ✅ Creates admin user with email: `admin@hakikisha.com`
2. ✅ Generates secure 2FA secret
3. ✅ Creates QR code for Google Authenticator
4. ✅ Saves QR code as `admin-2fa-qr.png`

### Default Credentials:

```
Email: admin@hakikisha.com
Password: Admin123!@#Change
```

⚠️ **IMPORTANT:** Change these credentials immediately after first login!

## 📱 Setting Up 2FA for Admin

### Step 1: Install Authenticator App

Download one of these apps:
- Google Authenticator (iOS/Android)
- Authy (iOS/Android/Desktop)
- Microsoft Authenticator (iOS/Android)

### Step 2: Scan QR Code

After running the admin creation script:
1. Open the generated `admin-2fa-qr.png` file
2. Open your authenticator app
3. Tap "+" or "Add account"
4. Scan the QR code

### Step 3: Save Backup Codes

The script will output a 2FA secret key. **Save this securely!**

Example:
```
2FA Secret: JBSWY3DPEHPK3PXP
```

If you lose your phone, you can manually enter this secret in a new authenticator app.

## 🔑 Admin Login Flow

### Step 1: Regular Login

POST to `/api/v1/auth/login`:

```json
{
  "email": "admin@hakikisha.com",
  "password": "your-password"
}
```

**Response (2FA Required):**

```json
{
  "success": true,
  "requires2FA": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 2: Verify 2FA Code

POST to `/api/v1/auth/verify-2fa`:

```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "code": "123456"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "admin-uuid",
      "email": "admin@hakikisha.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh-token-here"
  }
}
```

## 🎯 Points System for Users

### How Points Work:

Users earn points for every interaction:

| Action | Points |
|--------|--------|
| Daily Login | 5 |
| Submit Claim | 10 |
| First Claim | 50 |
| Claim Verified | 20 |
| Share Claim | 3 |
| Report Misinformation | 15 |
| Complete Profile | 25 |
| 3-Day Streak Bonus | 10 |
| 7-Day Streak Bonus | 25 |
| 30-Day Streak Bonus | 100 |

### Daily Reset Rule:

⚠️ **If a user skips a day (doesn't log in or interact), their points reset to ZERO!**

This encourages daily engagement with the platform.

### Streak System:

- Users build streaks by logging in consecutive days
- Streak bonuses are awarded at 3, 7, and 30 days
- Streaks reset if user misses a day

### API Endpoints for Points:

**Get User's Points:**
```
GET /api/v1/points/my-points
Authorization: Bearer {token}
```

**Get Points History:**
```
GET /api/v1/points/history?limit=50
Authorization: Bearer {token}
```

**Get Leaderboard:**
```
GET /api/v1/points/leaderboard?limit=100
Authorization: Bearer {token}
```

### Automatic Points Reset:

Set up a daily cron job to check for inactive users:

```bash
# Add to crontab
0 0 * * * node -e "require('./src/services/pointsService').PointsService.checkAndResetInactiveUsers()"
```

Or use AWS CloudWatch Events to trigger this daily.

## 🔄 Database Migration

Run the new migration to add 2FA and points tables:

```bash
# If you have a migration runner
npm run migrate

# Or manually
psql -U your-db-user -d hakikisha -f migrations/015_add_2fa_and_points.js
```

This creates:
- `two_factor_enabled`, `two_factor_secret` columns in `users`
- `user_points` table
- `points_history` table

## 🧪 Testing

### Test Admin Login with 2FA:

```bash
# Step 1: Login
curl -X POST https://api.hakikisha.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hakikisha.com",
    "password": "Admin123!@#Change"
  }'

# Step 2: Verify 2FA (use code from authenticator app)
curl -X POST https://api.hakikisha.com/api/v1/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "temp-token-from-step-1",
    "code": "123456"
  }'
```

### Test Points System:

```bash
# Get user points
curl -X GET https://api.hakikisha.com/api/v1/points/my-points \
  -H "Authorization: Bearer {user-token}"

# Submit claim (should award points)
curl -X POST https://api.hakikisha.com/api/v1/claims/submit \
  -H "Authorization: Bearer {user-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "politics",
    "claimText": "Test claim for points",
    "sourceLink": "https://example.com"
  }'
```

## 📊 Mobile App Integration

### Update Login Flow:

```typescript
// 1. Initial login
const loginResponse = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const loginData = await loginResponse.json();

if (loginData.requires2FA) {
  // 2. Show 2FA input screen
  const code = await show2FAInputScreen();
  
  // 3. Verify 2FA
  const verify2FAResponse = await fetch(`${API_URL}/auth/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tempToken: loginData.tempToken,
      code
    })
  });
  
  const authData = await verify2FAResponse.json();
  // Save token and proceed
  await AsyncStorage.setItem('token', authData.data.token);
}
```

### Display Points in UI:

```typescript
// Fetch user points
const pointsResponse = await fetch(`${API_URL}/points/my-points`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { points } = await pointsResponse.json();

// Display in UI
<View>
  <Text>Total Points: {points.total_points}</Text>
  <Text>Current Streak: {points.current_streak_days} days</Text>
  <Text>Longest Streak: {points.longest_streak_days} days</Text>
</View>
```

## 🔒 Security Best Practices

1. ✅ Admin passwords should be complex (min 12 characters)
2. ✅ Store 2FA backup codes securely (encrypted)
3. ✅ Never commit admin credentials to Git
4. ✅ Use environment variables for admin email/password
5. ✅ Enable rate limiting on 2FA endpoint (max 5 attempts)
6. ✅ Log all admin login attempts
7. ✅ Rotate admin password every 90 days

## 🆘 Troubleshooting

### "Invalid 2FA code" error:

- Check phone time is synced correctly
- Try previous/next code (time drift)
- Verify secret was entered correctly

### Points not resetting:

- Ensure cron job is running
- Check `last_activity_date` in database
- Verify timezone settings

### Admin can't login:

- Check if account exists: `SELECT * FROM users WHERE role = 'admin'`
- Reset password if needed
- Verify 2FA is enabled correctly

## 📝 Environment Variables

Add to your `.env` file:

```env
# Admin Setup
ADMIN_EMAIL=admin@hakikisha.com
ADMIN_PASSWORD=SecurePassword123!
ADMIN_2FA_ENABLED=true

# Points System
POINTS_ENABLED=true
POINTS_RESET_ENABLED=true
```

## ✅ Deployment Checklist

- [ ] Run migration for 2FA and points tables
- [ ] Run admin creation script
- [ ] Save admin QR code securely
- [ ] Test admin login with 2FA
- [ ] Set up daily cron job for points reset
- [ ] Update mobile app with 2FA flow
- [ ] Test points system end-to-end
- [ ] Configure rate limiting
- [ ] Enable audit logging
