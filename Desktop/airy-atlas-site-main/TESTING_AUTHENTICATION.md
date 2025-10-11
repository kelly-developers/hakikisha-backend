# Testing Authentication Flow

## ⚠️ IMPORTANT: This is a React Native Mobile App

**This app CANNOT be previewed in Lovable's web interface.** You must test it on a real device or emulator using React Native CLI.

## Authentication Flow Implemented

The authentication flow has been successfully implemented with the following sequence:

### 1. Onboarding Flow
```
App Launch → Onboarding Screen (3 slides) → Get Started Screen → Login Screen
```

- First-time users see 3 onboarding slides about HAKIKISHA
- After completing onboarding, they see the "Get Started" screen
- Clicking "Get Started" navigates to the Login screen

### 2. Login Screen
**Fields:**
- Email or Username (single input field)
- Password

**Actions:**
- "Login" button → Validates credentials → Navigates to HomeScreen
- "Forgot Password?" link → Navigates to ForgotPassword screen
- "Sign Up" link → Navigates to Signup screen
- Social login options (Google, Apple, Facebook) - placeholders for now

### 3. Signup Screen
**Fields:**
- Email
- Username (NEW - as requested)
- Password
- Confirm Password

**Actions:**
- "Sign Up" button → Validates all fields → Navigates to Login screen
- "Login" link → Navigates back to Login screen
- Social signup options (Google, Apple, Facebook) - placeholders for now

**Validation:**
- Checks all fields are filled
- Ensures passwords match
- Shows error messages for validation failures

### 4. After Login
- User is redirected to HomeScreen
- Authentication state is stored in AsyncStorage
- User stays logged in on app restart

## How to Test

### Step 1: Run the App
```bash
# For iOS
npm run ios
# or
npx react-native run-ios

# For Android
npm run android
# or
npx react-native run-android
```

### Step 2: Test Onboarding
1. On first launch, you'll see 3 onboarding screens
2. Swipe through or click "Skip"
3. You'll see the "Get Started" screen with HAKIKISHA branding
4. Click "Get Started" button

### Step 3: Test Signup
1. From Login screen, click "Sign Up"
2. Fill in:
   - Email: test@example.com
   - Username: testuser
   - Password: password123
   - Confirm Password: password123
3. Click "Sign Up"
4. You'll be redirected to Login screen

### Step 4: Test Login
1. Enter the credentials you just created:
   - Email/Username: test@example.com or testuser
   - Password: password123
2. Click "Login"
3. You'll be redirected to HomeScreen

### Step 5: Test Persistence
1. Close and reopen the app
2. You should go directly to HomeScreen (skipping onboarding and login)

## Backend Integration

Currently, the authentication uses **mock/simulated** responses. To integrate with your real backend:

### 1. Update LoginScreen.tsx
Replace lines 47-66 with your actual API call:

```typescript
const response = await fetch('YOUR_BACKEND_URL/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: form.email,
    password: form.password,
  }),
});

const data = await response.json();

if (response.ok) {
  // Store authentication token and user data
  await setItem('isAuthenticated', 'true');
  await setItem('authToken', data.token);
  await setItem('userEmail', data.user.email);
  
  navigation.navigate('HomeScreen');
} else {
  setEmailError(data.message || 'Login failed');
}
```

### 2. Update SignupScreen.tsx
Replace lines 37-64 with your actual API call:

```typescript
const response = await fetch('YOUR_BACKEND_URL/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: form.email,
    username: form.username,
    password: form.password,
    role: 'user', // Default role
  }),
});

const data = await response.json();

if (response.ok) {
  // Navigate to login after successful signup
  navigation.navigate('Login');
} else {
  setEmailError(data.message || 'Signup failed');
}
```

## Color Scheme Applied

The authentication screens now use HAKIKISHA's brand colors:
- **Primary Green**: `#0A864D` - Used for buttons, links, and accents
- **Secondary Orange**: `#EF9334` - Used for "Forgot Password" and emphasis
- **Neutral**: Black and white for text

## Next Steps

1. ✅ Test the complete flow on iOS/Android emulator
2. ✅ Verify all navigation works correctly
3. ✅ Test validation messages
4. ⏳ Integrate with your backend API
5. ⏳ Add proper error handling for network failures
6. ⏳ Implement social login (Google, Apple, Facebook)
7. ⏳ Add email verification flow
8. ⏳ Implement forgot password functionality

## Troubleshooting

### Issue: App crashes on startup
**Solution:** Make sure all React Native dependencies are installed:
```bash
npm install
cd ios && pod install && cd ..
```

### Issue: Navigation doesn't work
**Solution:** Check that react-navigation packages are installed:
```bash
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
```

### Issue: AsyncStorage errors
**Solution:** Install AsyncStorage:
```bash
npm install @react-native-async-storage/async-storage
```

## File Changes Summary

The following files were updated to implement the authentication flow:

1. **App.tsx** - Updated initial route logic
2. **LoginScreen.tsx** - Added authentication logic and navigation to HomeScreen
3. **SignupScreen.tsx** - Added username field, validation, and navigation to Login
4. **GetStartedScreen.tsx** - Already had "Get Started" button functionality
5. **OnboardingScreen.tsx** - Already had navigation to GetStarted

All authentication screens now use the correct HAKIKISHA brand colors (#0A864D and #EF9334).
