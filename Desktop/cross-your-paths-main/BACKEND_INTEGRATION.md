# HAKIKISHA Mobile App - Backend Integration Guide

## Overview
This guide explains how to integrate your HAKIKISHA backend with the React Native mobile app.

## App Structure
The app has been transformed from an e-commerce platform to a fact-checking platform with the following structure:

### Bottom Navigation Tabs:
1. **Home** - Dashboard with trending claims and quick actions
2. **Claims** - User's submitted claims list
3. **Search** - Search for claims and verdicts
4. **Profile** - User profile and settings

## Theme Colors
- **Primary Green**: `#0A864D`
- **Secondary Orange**: `#EF9334`
- **Background**: `#F9FAFB`
- **Card**: `#FFFFFF`

## Backend API Integration Points

### 1. Authentication APIs
**Files to modify:**
- `src/screens/LoginScreen.tsx`
- `src/screens/SignupScreen.tsx`
- `src/screens/ForgotPasswordScreen.tsx`

**Backend endpoints to connect:**
```javascript
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/logout
// GET /api/auth/me
// POST /api/auth/forgot-password
```

**Implementation example:**
```typescript
// In LoginScreen.tsx
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await fetch('YOUR_BACKEND_URL/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    // Store JWT token
    await AsyncStorage.setItem('authToken', data.token);
  } catch (error) {
    console.error('Login error:', error);
  }
};
```

### 2. Claims Management APIs
**Files to modify:**
- `src/tabs/HomeTab.tsx` - Display trending claims
- `src/tabs/ClaimsListTab.tsx` - Display user's claims
- `src/screens/PlaceOrder.tsx` - Submit new claim (rename to SubmitClaim.tsx)

**Backend endpoints to connect:**
```javascript
// POST /api/claims - Submit new claim
// GET /api/claims - Get claims with filters
// GET /api/claims/:id - Get specific claim
// GET /api/claims/trending - Get trending claims
// GET /api/user/my-claims - Get user's submitted claims
```

**Implementation example:**
```typescript
// In PlaceOrder.tsx (Submit Claim)
const handleSubmitClaim = async (claimData: {
  title: string;
  description: string;
  category: string;
  media_type: string;
  media_url?: string;
}) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const response = await fetch('YOUR_BACKEND_URL/api/claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(claimData),
    });
    const data = await response.json();
    // Handle success
  } catch (error) {
    console.error('Submit claim error:', error);
  }
};
```

### 3. Search APIs
**Files to modify:**
- `src/tabs/SearchTab.tsx`

**Backend endpoints to connect:**
```javascript
// GET /api/search/claims - Search claims and verdicts
// GET /api/search/verdicts - Search specific verdicts
// GET /api/search/suggestions - Get search suggestions
```

### 4. User Profile APIs
**Files to modify:**
- `src/tabs/SettingTab.tsx`
- `src/screens/ProfileScreen.tsx`

**Backend endpoints to connect:**
```javascript
// GET /api/auth/me - Get current user profile
// PUT /api/user/profile - Update user profile
// GET /api/user/notifications - Get notifications
```

### 5. Admin & Fact-Checker APIs
**Files to modify:**
- Create `src/screens/FactCheckerDashboardScreen.tsx`
- Create `src/screens/AdminDashboardScreen.tsx`

**Backend endpoints to connect:**
```javascript
// Fact-Checker routes:
// GET /api/dashboard/fact-checker/claims
// POST /api/dashboard/fact-checker/claims/:id/assign
// POST /api/dashboard/fact-checker/verdicts
// PUT /api/dashboard/fact-checker/claims/:id/status

// Admin routes:
// GET /api/admin/registration-requests
// POST /api/admin/approve-registration/:requestId
// POST /api/admin/reject-registration/:requestId
// GET /api/admin/analytics
```

## File Upload Implementation

For claims with images/videos, implement file upload:

```typescript
const uploadMedia = async (fileUri: string) => {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'image/jpeg',
    name: 'claim_media.jpg',
  });

  const token = await AsyncStorage.getItem('authToken');
  const response = await fetch('YOUR_BACKEND_URL/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  return await response.json();
};
```

## Environment Configuration

Create a configuration file for your backend URL:

**Create `src/config/api.ts`:**
```typescript
export const API_CONFIG = {
  BASE_URL: 'https://your-backend-url.com',
  API_VERSION: 'v1',
  ENDPOINTS: {
    AUTH: '/api/auth',
    CLAIMS: '/api/claims',
    SEARCH: '/api/search',
    USER: '/api/user',
    ADMIN: '/api/admin',
    FACT_CHECKER: '/api/dashboard/fact-checker',
  },
};

export const getFullUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
```

## Mock Data Location

Current mock data files (replace with real API calls):
- `src/constants/claimsData.ts` - Mock claims data
- `src/constants/data.ts` - General mock data

## Authentication Flow

1. User logs in → Store JWT token in AsyncStorage
2. On app start → Check for token and validate
3. Include token in all authenticated requests
4. Handle token expiry and refresh

**Example auth utility:**
```typescript
// src/utils/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getAuthToken = async () => {
  return await AsyncStorage.getItem('authToken');
};

export const setAuthToken = async (token: string) => {
  await AsyncStorage.setItem('authToken', token);
};

export const clearAuthToken = async () => {
  await AsyncStorage.removeItem('authToken');
};

export const isAuthenticated = async () => {
  const token = await getAuthToken();
  return !!token;
};
```

## Next Steps

1. **Replace YOUR_BACKEND_URL** with your actual backend URL in all API calls
2. **Implement error handling** for network requests
3. **Add loading states** during API calls
4. **Implement token refresh** logic
5. **Add offline support** using AsyncStorage for caching
6. **Test all API endpoints** with your backend

## Testing

Use tools like:
- **Postman** - Test backend APIs
- **React Native Debugger** - Debug API calls in the app
- **Network Inspector** - Monitor network requests

## Security Considerations

1. Never store sensitive data in plain text
2. Use HTTPS for all API calls
3. Implement proper token management
4. Add request timeouts
5. Validate all user inputs before sending to backend
6. Handle API errors gracefully

## Support

For questions about the mobile app structure, refer to the code comments and existing implementations in the screens and tabs.
