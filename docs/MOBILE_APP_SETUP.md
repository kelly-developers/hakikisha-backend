# 📱 Mobile App Backend Integration Guide

## 🚨 IMPORTANT: CORS Configuration for Mobile Apps

Mobile apps using Capacitor require special CORS configuration because they use custom protocols like `capacitor://localhost` instead of regular HTTP origins.

## ✅ Backend Setup (Already Configured)

The backend is now configured to accept requests from:
- ✅ `capacitor://localhost` (Capacitor iOS/Android apps)
- ✅ `ionic://localhost` (Ionic apps)
- ✅ `http://localhost` (Local development)
- ✅ `http://localhost:3000` (Web app local)
- ✅ `http://localhost:8080` (Alternative port)
- ✅ Your Lovable preview URL

## 📝 Environment Setup

### 1. Create `.env` File on Render

In your Render dashboard, set these environment variables:

```bash
# CRITICAL: CORS Origins
ALLOWED_ORIGINS=capacitor://localhost,http://localhost,ionic://localhost,http://localhost:3000,http://localhost:8080,https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com,https://yourdomain.com

# Server
NODE_ENV=production
PORT=5000

# Database (Render provides these automatically)
# Copy from your Render PostgreSQL dashboard
DB_HOST=dpg-xxx.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=hakikisha_db
DB_USER=hakikisha_user
DB_PASSWORD=your_password_from_render

# JWT Secrets (REQUIRED - generate secure random strings)
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Generate Secure JWT Secrets

Run this command to generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

## 🧪 Testing from Your Phone

### Test 1: Check Backend is Running

From your computer:
```bash
curl https://hakikisha-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 123.45,
  "memory": {...},
  "environment": "production"
}
```

### Test 2: Test Login API

```bash
curl -X POST https://hakikisha-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test 3: Test from Mobile App

1. **Update Mobile App API URL**
   
   In your mobile app `src/config/api.ts`:
   ```typescript
   export const API_BASE_URL = 'https://hakikisha-backend.onrender.com';
   ```

2. **Build and Run**
   ```bash
   # Build the app
   npm run build
   
   # Sync with Capacitor
   npx cap sync
   
   # Run on Android
   npx cap run android
   ```

3. **Test Login from Your Phone**
   - Open the app on your phone
   - Try to register/login
   - Check network requests in Android Studio Logcat

## 🔍 Troubleshooting

### Issue 1: CORS Error on Mobile

**Symptom:** Mobile app shows CORS errors or network request failed

**Solution:**
1. Make sure `ALLOWED_ORIGINS` in Render includes `capacitor://localhost`
2. Redeploy your backend after updating environment variables
3. Clear app data and reinstall on phone

### Issue 2: 401 Unauthorized

**Symptom:** All requests return 401

**Solution:**
1. Check JWT secrets are set in Render environment
2. Test login API with curl first
3. Make sure token is being saved in localStorage

### Issue 3: Network Request Failed

**Symptom:** App can't reach backend at all

**Solution:**
1. Check backend is running: `curl https://your-backend.onrender.com/health`
2. Verify API_BASE_URL in mobile app is correct
3. Make sure phone has internet connection
4. Check Render logs for errors

### Issue 4: Timeout Errors

**Symptom:** Requests timeout after 30 seconds

**Solution:**
- Render free tier can sleep after inactivity
- First request may take 30-50 seconds to wake up
- Consider upgrading to paid tier for always-on service

## 📊 Monitor Backend Logs

View real-time logs on Render:
1. Go to your Render dashboard
2. Select your backend service
3. Click "Logs" tab
4. Watch for incoming requests from mobile app

## 🔐 Security Checklist

- ✅ JWT_SECRET is random and secure (32+ characters)
- ✅ ALLOWED_ORIGINS only includes your domains (don't use `*` in production)
- ✅ HTTPS enabled (Render does this automatically)
- ✅ Rate limiting configured
- ✅ Database credentials are from Render (don't use default values)

## 📱 Mobile App Requirements

Make sure your mobile app has:

1. **Correct API URL** (`src/config/api.ts`):
   ```typescript
   export const API_BASE_URL = 'https://hakikisha-backend.onrender.com';
   ```

2. **Network Permissions** (Android - `android/app/src/main/AndroidManifest.xml`):
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
   ```

3. **Cleartext Traffic** (Android - for development only):
   ```xml
   <application
     android:usesCleartextTraffic="true">
   ```

## 🚀 Deployment Checklist

Before deploying to Play Store:

- [ ] Backend deployed on Render and running
- [ ] Environment variables set correctly
- [ ] Database connected and migrations run
- [ ] API tested with curl
- [ ] Mobile app tested on real device
- [ ] CORS configured for production domains
- [ ] Remove any development-only settings
- [ ] Rate limiting enabled
- [ ] Error handling implemented

## 💡 Pro Tips

1. **Use ngrok for local testing:**
   ```bash
   ngrok http 5000
   # Use the ngrok URL in mobile app
   ```

2. **Monitor Render logs while testing mobile app:**
   - Open Render logs
   - Tap buttons in mobile app
   - Watch logs in real-time

3. **Test on both WiFi and mobile data:**
   - Some networks block certain ports
   - Mobile data behaves differently than WiFi

4. **Cache responses in mobile app:**
   - Render free tier can be slow
   - Implement offline support
   - Cache frequently accessed data

## 📞 Need Help?

If you're still having issues:

1. Check Render logs for error messages
2. Test API endpoints with Postman/curl first
3. Verify environment variables are set correctly
4. Make sure database is connected
5. Check mobile app network requests in Chrome DevTools (for web preview)
6. Use Android Studio Logcat to see mobile app errors
