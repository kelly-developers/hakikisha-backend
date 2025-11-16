# Mobile App API Integration Guide

## ⚠️ CRITICAL: Don't Import Backend Services Directly

Your mobile app should **NEVER** import backend services like `authService` directly. Instead, make HTTP requests to the API endpoints.

## Authentication API Endpoints

Base URL: `http://your-backend-url/api/v1/auth`

### 1. Register User
```javascript
// ❌ WRONG - Don't do this in mobile app:
// const authService = require('../services/authService');
// authService.verifyEmail(userId, code);

// ✅ CORRECT - Call API endpoint:
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "username": "username",
  "full_name": "Full Name",
  "role": "user"
}

Response:
{
  "success": true,
  "userId": "uuid",
  "email": "user@example.com",
  "message": "Registration successful. Please verify your email."
}
```

### 2. Verify Email (After Registration)
```javascript
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "userId": "user-uuid",
  "code": "123456"
}

Response:
{
  "success": true,
  "message": "Email verified successfully"
}
```

### 3. Resend Verification Code
```javascript
POST /api/v1/auth/resend-verification
Content-Type: application/json

{
  "userId": "user-uuid",
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Verification code sent"
}
```

### 4. Login
```javascript
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

// For regular users:
Response:
{
  "success": true,
  "token": "jwt-token",
  "user": { /* user object */ }
}

// For admin/fact-checker (requires 2FA):
Response:
{
  "success": true,
  "requires2FA": true,
  "userId": "user-uuid",
  "message": "2FA code sent to your email"
}
```

### 5. Verify 2FA (Admin/Fact-Checker Only)
```javascript
POST /api/v1/auth/verify-2fa
Content-Type: application/json

{
  "userId": "user-uuid",
  "code": "123456"
}

Response:
{
  "success": true,
  "token": "jwt-token",
  "user": { /* user object */ }
}
```

### 6. Resend 2FA Code
```javascript
POST /api/v1/auth/resend-2fa
Content-Type: application/json

{
  "userId": "user-uuid",
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "2FA code resent"
}
```

### 7. Forgot Password
```javascript
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Password reset code sent to your email"
}
```

### 8. Reset Password
```javascript
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}

Response:
{
  "success": true,
  "message": "Password reset successful"
}
```

## Example: React Native API Service

Create a service file in your mobile app:

```javascript
// src/services/api/authApi.js
import axios from 'axios';

const API_BASE_URL = 'http://your-backend-url/api/v1';

const authApi = {
  // Register user
  register: async (email, password, phone, username, fullName) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        phone,
        username,
        full_name: fullName,
        role: 'user'
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify email with OTP
  verifyEmail: async (userId, code) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, {
        userId,
        code
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Resend verification code
  resendVerificationCode: async (userId, email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/resend-verification`, {
        userId,
        email
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Login
  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify 2FA
  verify2FA: async (userId, code) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-2fa`, {
        userId,
        code
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Resend 2FA code
  resend2FACode: async (userId, email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/resend-2fa`, {
        userId,
        email
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reset password
  resetPassword: async (email, code, newPassword) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email,
        code,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default authApi;
```

## Usage in Your React Native Screens

### VerifyEmailScreen.tsx
```typescript
import authApi from '../services/api/authApi';

const handleVerify = async () => {
  try {
    const result = await authApi.verifyEmail(userId, code);
    if (result.success) {
      // Navigate to login screen
      navigation.navigate('Login');
    }
  } catch (error) {
    Alert.alert('Error', error.error || 'Verification failed');
  }
};

const handleResend = async () => {
  try {
    const result = await authApi.resendVerificationCode(userId, email);
    Alert.alert('Success', result.message);
  } catch (error) {
    Alert.alert('Error', error.error || 'Failed to resend code');
  }
};
```

### TwoFactorAuthScreen.tsx
```typescript
import authApi from '../services/api/authApi';

const handleVerify = async () => {
  try {
    const result = await authApi.verify2FA(userId, code);
    if (result.success) {
      // Save token and navigate to home
      await AsyncStorage.setItem('token', result.token);
      navigation.navigate('Home');
    }
  } catch (error) {
    Alert.alert('Error', error.error || 'Verification failed');
  }
};

const handleResend = async () => {
  try {
    const result = await authApi.resend2FACode(userId, email);
    Alert.alert('Success', result.message);
  } catch (error) {
    Alert.alert('Error', error.error || 'Failed to resend code');
  }
};
```

## Environment Configuration

Create a `.env` file in your mobile app:

```env
API_BASE_URL=http://localhost:3000/api/v1
# OR for production:
# API_BASE_URL=https://your-production-url.com/api/v1
```

## Important Notes

1. **Never import backend services in mobile app** - Always use HTTP requests
2. **Handle errors properly** - Backend returns detailed error messages
3. **Store JWT tokens securely** - Use AsyncStorage or SecureStore
4. **Add Authorization header** for protected routes:
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```

## Need Help?

If you see errors like `authService.verifyEmail is not a function`, it means:
- Your mobile app is trying to import backend code directly ❌
- You need to use the API endpoints instead ✅
