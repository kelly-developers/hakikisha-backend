# Hakikisha Backend API Documentation
**Complete API specification for 5 million user scalable backend**

## Base Configuration
- **Base URL**: `https://api.hakikisha.com/api/v1` (or your deployed URL)
- **Authentication**: JWT Bearer Token in Authorization header
- **Content-Type**: `application/json`
- **CORS**: Enabled for mobile apps (Capacitor, React Native)

---

## 🔐 Authentication Endpoints

### 1.1 Register User
```http
POST /api/v1/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe",
  "phone": "+254712345678"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration pending admin approval",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "registration_status": "pending"
  }
}
```

**Note:** Users must wait for admin approval before they can login.

---

### 1.2 Login
```http
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200) - Regular User:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "username": "johndoe"
  },
  "redirect": "/user/dashboard"
}
```

**Response (200) - Admin/Fact-Checker (2FA Required):**
```json
{
  "success": true,
  "requires2FA": true,
  "message": "2FA code sent to your email",
  "userId": "uuid",
  "tempToken": "temporary_token_for_2fa"
}
```

---

### 1.3 Verify 2FA Code
```http
POST /api/v1/auth/verify-2fa
```

**Request Body:**
```json
{
  "userId": "uuid",
  "code": "123456",
  "tempToken": "temporary_token_from_login"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "username": "admin_user"
  },
  "redirect": "/admin/dashboard"
}
```

---

### 1.4 Refresh Token
```http
POST /api/v1/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

---

### 1.5 Forgot Password
```http
POST /api/v1/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

---

### 1.6 Reset Password
```http
POST /api/v1/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## 👤 User Profile Endpoints

### 2.1 Get User Profile
```http
GET /api/v1/user/profile
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "profile": {
    "id": "user_id",
    "username": "johndoe",
    "email": "user@example.com",
    "phone": "+254123456789",
    "bio": "Fact-checking enthusiast",
    "profilePicture": "url_to_image",
    "points": 450,
    "lastActive": "2025-10-27T10:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 2.2 Update User Profile
```http
PUT /api/v1/user/profile
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "username": "johndoe_updated",
  "phone": "+254987654321",
  "bio": "Updated bio"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    "id": "user_id",
    "username": "johndoe_updated",
    "phone": "+254987654321",
    "bio": "Updated bio"
  }
}
```

---

### 2.3 Upload Profile Picture
```http
POST /api/v1/user/profile-picture
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `image`: File (image file)

**Response (200):**
```json
{
  "success": true,
  "message": "Profile picture uploaded",
  "imageUrl": "https://api.hakikisha.com/uploads/profiles/profile-uuid-timestamp.png"
}
```

---

### 2.4 Get User Points
```http
GET /api/v1/user/points
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "points": {
    "total": 450,
    "rank": "Silver",
    "history": [
      {
        "date": "2025-10-27",
        "points": 50,
        "reason": "Claim submitted"
      }
    ],
    "lastReset": "2025-10-26T00:00:00Z"
  }
}
```

**Note:** Points reset to 0 if user doesn't engage with the app for a full day.

---

## 📝 Claims Endpoints

### 3.1 Submit Claim
```http
POST /api/v1/claims
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "category": "politics",
  "claimText": "The government increased education budget by 50%",
  "videoLink": "https://youtube.com/...",
  "sourceLink": "https://source.com/...",
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Claim submitted successfully",
  "claim": {
    "id": "claim_id",
    "category": "politics",
    "status": "ai_approved",
    "submittedDate": "2025-10-27T10:00:00Z"
  },
  "aiVerdict": {
    "verdict": "needs_context",
    "explanation": "AI-generated explanation...",
    "confidence": 0.75,
    "disclaimer": "This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers."
  },
  "pointsAwarded": 50,
  "isFirstClaim": false
}
```

**Note:** 
- AI automatically processes and replies to claims immediately
- AI response includes a disclaimer that CRECO is not responsible
- First claim submission awards bonus points (100 points vs 50 points)

---

### 3.2 Upload Claim Evidence
```http
POST /api/v1/claims/upload-evidence
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `evidence`: File (image or video)

**Response (200):**
```json
{
  "success": true,
  "fileUrl": "https://api.hakikisha.com/uploads/evidence/file-uuid.jpg"
}
```

---

### 3.3 Get User Claims
```http
GET /api/v1/claims/my-claims?status={all|verified|false|pending}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "claims": [
    {
      "id": "claim_id",
      "title": "Claim title",
      "category": "politics",
      "status": "human_approved",
      "submittedDate": "2025-10-27T10:00:00Z",
      "verdictDate": "2025-10-27T14:00:00Z",
      "verdict": "verified",
      "verdictText": "Verdict explanation",
      "sources": [
        {
          "title": "Source 1",
          "url": "https://source1.com",
          "type": "human"
        }
      ],
      "factCheckerName": "Fact Checker Name"
    }
  ]
}
```

---

### 3.4 Get Claim Details
```http
GET /api/v1/claims/{claimId}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "claim": {
    "id": "claim_id",
    "title": "Claim title",
    "description": "Full claim description",
    "category": "politics",
    "status": "human_approved",
    "submittedBy": "user@example.com",
    "submittedDate": "2025-10-27T10:00:00Z",
    "verdictDate": "2025-10-27T14:00:00Z",
    "verdict": "verified",
    "verdictText": "Detailed verdict explanation",
    "sources": [
      {
        "title": "Source 1",
        "url": "https://source1.com",
        "type": "human"
      }
    ],
    "ai_verdict": "needs_context",
    "ai_explanation": "AI explanation...",
    "ai_confidence": 0.75,
    "ai_disclaimer": "This is an AI-generated response. CRECO is not responsible for any implications.",
    "ai_edited": false,
    "verdict_responsibility": "creco",
    "factChecker": {
      "name": "Fact Checker Name",
      "email": "checker@example.com",
      "avatar": "url"
    },
    "imageUrl": "url",
    "videoLink": "url"
  }
}
```

---

### 3.5 Search Claims
```http
GET /api/v1/claims/search?q={search_term}
```

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "id": "claim_id",
      "title": "Claim title",
      "description": "Description",
      "category": "politics",
      "status": "verified"
    }
  ]
}
```

---

### 3.6 Get Trending Claims
```http
GET /api/v1/claims/trending?limit=10
```

**Response (200):**
```json
{
  "success": true,
  "trendingClaims": [
    {
      "id": "claim_id",
      "title": "Trending claim",
      "category": "health",
      "status": "verified",
      "verdict": "verified",
      "verdictText": "Verdict explanation",
      "sources": [],
      "trendingScore": 95,
      "submittedDate": "2025-10-27",
      "verdictDate": "2025-10-27"
    }
  ],
  "count": 10
}
```

---

## 🔍 Fact Checker Endpoints

### 4.1 Get Pending Claims (Fact Checkers Only)
```http
GET /api/v1/fact-checker/pending-claims
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "claims": [
    {
      "id": "claim_id",
      "title": "Claim to verify",
      "description": "Full description",
      "category": "politics",
      "submittedBy": "user@example.com",
      "submittedDate": "2025-10-27",
      "imageUrl": "url",
      "videoLink": "url",
      "sourceLink": "url",
      "ai_suggestion": {
        "verdict": "needs_context",
        "explanation": "AI explanation...",
        "confidence": 0.75,
        "sources": [],
        "disclaimer": "This is an AI-generated response. CRECO is not responsible for any implications.",
        "isEdited": false
      }
    }
  ]
}
```

---

### 4.2 Submit Human Verdict (Fact Checkers Only)
```http
POST /api/v1/fact-checker/submit-verdict
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "claimId": "claim_id",
  "verdict": "verified",
  "explanation": "Detailed explanation of the verdict",
  "sources": [
    {
      "title": "Source 1",
      "url": "https://source1.com"
    }
  ],
  "time_spent": 300
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verdict submitted successfully",
  "verdictId": "verdict_id"
}
```

**Note:** When fact-checker writes their own verdict (not based on AI), CRECO is responsible.

---

### 4.3 Approve/Edit AI Verdict (Fact Checkers Only)
```http
POST /api/v1/fact-checker/approve-ai-verdict
Authorization: Bearer {token}
```

**Request Body (Approve without changes):**
```json
{
  "claimId": "claim_id",
  "approved": true
}
```

**Request Body (Edit AI verdict):**
```json
{
  "claimId": "claim_id",
  "approved": false,
  "editedVerdict": "verified",
  "editedExplanation": "Edited explanation",
  "additionalSources": [
    {
      "title": "New Source",
      "url": "https://newsource.com"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verdict edited and approved. CRECO is now responsible.",
  "responsibility": "creco"
}
```

**Note:** 
- If approved without changes: AI disclaimer remains, CRECO not responsible
- If edited: AI disclaimer removed, CRECO becomes responsible

---

### 4.4 Get AI Suggestions (Fact Checkers Only)
```http
GET /api/v1/fact-checker/ai-suggestions
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "claims": [
    {
      "id": "claim_id",
      "title": "Claim text",
      "description": "Description",
      "category": "politics",
      "submittedBy": "user_id",
      "submittedDate": "2025-10-27",
      "aiSuggestion": {
        "status": "needs_context",
        "verdict": "AI analysis completed",
        "confidence": 0.75,
        "sources": []
      }
    }
  ]
}
```

---

### 4.5 Get Fact Checker Stats
```http
GET /api/v1/fact-checker/stats
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalVerified": 45,
    "pendingReview": 12,
    "timeSpent": "24 minutes avg",
    "accuracy": "95%"
  }
}
```

---

## 👨‍💼 Admin Endpoints

### 5.1 Get All Users (Admin Only)
```http
GET /api/v1/admin/users?role={all|user|fact_checker|admin}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id",
      "username": "johndoe",
      "email": "user@example.com",
      "role": "user",
      "status": "active",
      "registration_status": "approved",
      "createdAt": "2024-01-01"
    }
  ]
}
```

---

### 5.2 Approve User Registration (Admin Only)
```http
POST /api/v1/admin/users/approve-registration
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "userId": "user_id"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User registration approved"
}
```

---

### 5.3 Register Fact Checker (Admin Only)
```http
POST /api/v1/admin/users/register-fact-checker
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "email": "checker@example.com",
  "username": "factchecker1",
  "password": "securePassword123",
  "phone": "+254712345678"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Fact checker registered successfully",
  "user": {
    "id": "user_id",
    "email": "checker@example.com",
    "role": "fact_checker"
  }
}
```

---

### 5.4 Register Admin (Admin Only)
```http
POST /api/v1/admin/users/register-admin
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "username": "admin2",
  "password": "securePassword123",
  "phone": "+254712345678"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "user": {
    "id": "user_id",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

---

### 5.5 Suspend/Delete/Activate User (Admin Only)
```http
POST /api/v1/admin/users/action
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "userId": "user_id",
  "action": "suspend"
}
```

**Valid actions:** `suspend`, `delete`, `activate`

**Response (200):**
```json
{
  "success": true,
  "message": "User suspended successfully"
}
```

---

### 5.6 Get Admin Dashboard Stats (Admin Only)
```http
GET /api/v1/admin/dashboard/stats
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 1250,
    "totalClaims": 3400,
    "pendingClaims": 45,
    "verifiedClaims": 2890,
    "falseClaims": 465,
    "factCheckers": 12,
    "admins": 3,
    "pendingRegistrations": 5
  }
}
```

---

### 5.7 Get Fact Checker Activity (Admin Only)
```http
GET /api/v1/admin/fact-checker-activity
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "activity": [
    {
      "factCheckerId": "user_id",
      "username": "checker1",
      "claimsVerified": 45,
      "timeSpent": "12 hours",
      "lastActive": "2025-10-27T10:00:00Z"
    }
  ]
}
```

---

## 📰 Blog Endpoints

### 6.1 Get All Blogs
```http
GET /api/v1/blogs
```

**Response (200):**
```json
{
  "success": true,
  "blogs": [
    {
      "id": "blog_id",
      "title": "Blog title",
      "excerpt": "Short excerpt",
      "content": "Full blog content",
      "author": {
        "name": "Dr. Sarah Johnson",
        "avatar": "url"
      },
      "category": "Digital Literacy",
      "readTime": "5 min read",
      "publishedDate": "2025-10-27",
      "imageUrl": "url"
    }
  ]
}
```

---

### 6.2 Get Single Blog
```http
GET /api/v1/blogs/{blogId}
```

**Response (200):**
```json
{
  "success": true,
  "blog": {
    "id": "blog_id",
    "title": "Blog title",
    "content": "Full markdown content",
    "author": {
      "name": "Dr. Sarah Johnson",
      "avatar": "url"
    },
    "category": "Politics",
    "readTime": "8 min read",
    "publishedDate": "2025-10-27"
  }
}
```

---

### 6.3 Create Blog (Fact Checkers/Admin Only)
```http
POST /api/v1/blogs
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Blog title",
  "excerpt": "Short description",
  "content": "Full markdown content",
  "category": "Politics",
  "readTime": "8 min read"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Blog published successfully",
  "blog": {
    "id": "blog_id",
    "title": "Blog title",
    "slug": "blog-title"
  }
}
```

---

## 🤖 AI Integration

### AI Auto-Reply System
- **Trigger:** Automatic when user submits a claim
- **Model:** Poe API with Web-Search model
- **Response Time:** < 5 seconds
- **Disclaimer:** All AI responses include:
  > "This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers."

### AI Verdict Workflow
1. **User submits claim** → AI processes immediately
2. **AI verdict created** with disclaimer
3. **Fact-checker views** AI verdict in their dashboard
4. **Fact-checker can:**
   - Approve without changes (AI disclaimer remains)
   - Edit and approve (CRECO becomes responsible, disclaimer removed)
   - Write new verdict from scratch (CRECO responsible)

---

## ⚠️ Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

**Common error codes:**
- `AUTH_REQUIRED` - No auth token provided
- `AUTH_INVALID` - Invalid auth token
- `FORBIDDEN` - User doesn't have permission
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `SERVER_ERROR` - Internal server error
- `2FA_REQUIRED` - 2FA verification needed
- `REGISTRATION_PENDING` - User registration not yet approved

---

## 🌐 CORS Configuration

**Allowed Origins:**
- `capacitor://localhost`
- `http://localhost`
- `ionic://localhost`
- `http://localhost:8100`
- `http://localhost:3000`
- `http://localhost:5173`
- Your production domain

**Allowed Methods:**
- GET, POST, PUT, DELETE, OPTIONS, PATCH

**Allowed Headers:**
- Content-Type, Authorization, X-Requested-With, X-Client-Info

---

## 📊 Points System

### Point Awards
- **First claim submission:** 100 points
- **Subsequent claim submissions:** 50 points
- **Claim gets verified:** 20 points
- **Daily engagement:** Maintains current points

### Point Reset Rules
- **Condition:** User doesn't engage with app for 24 hours
- **Action:** Points reset to 0
- **Engagement activities:** Login, submit claim, view claim status

### Point Ranks
- 0-99: Bronze
- 100-499: Silver
- 500-999: Gold
- 1000+: Platinum

---

## 🚀 Performance Optimizations

### For 5M Users
1. **Database Connection Pooling:** 100 connections
2. **Redis Caching:** AI responses cached for 5 minutes
3. **Response Time Monitoring:** Logs requests > 1s
4. **Rate Limiting:** 1000 requests/15 minutes per IP
5. **Query Optimization:** Indexed all foreign keys
6. **Lazy Loading:** Pagination on all list endpoints

---

## 📱 React Native Integration

### API Client Setup
```typescript
import axios from 'axios';

const API = axios.create({
  baseURL: 'https://your-backend-url.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
    }
    return Promise.reject(error);
  }
);
```

### Example API Calls
```typescript
// Login
const login = async (email: string, password: string) => {
  const response = await API.post('/auth/login', { email, password });
  return response.data;
};

// Submit Claim
const submitClaim = async (claim: ClaimData) => {
  const response = await API.post('/claims', claim);
  return response.data;
};

// Get My Claims
const getMyClaims = async () => {
  const response = await API.get('/claims/my-claims');
  return response.data;
};
```

---

## 🧪 Testing Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-10-27T10:00:00Z"
}
```

### Debug Database
```http
GET /api/debug/db
```

**Response:** Database connection status, tables, and counts

---

## 📝 Notes

1. **First-time Setup:** Run migrations to create database schema
2. **Admin Creation:** Use `node src/scripts/createAdmin.js` to create first admin
3. **2FA for Admin/Fact-Checkers:** Enforced on every login
4. **User Registration:** Requires admin approval before login
5. **AI Processing:** Automatic and instant on claim submission
6. **Points System:** Resets daily if user doesn't engage

---

## 🔗 Additional Resources

- [Database Setup Guide](./DATABASE_SETUP.md)
- [React Native Setup Guide](./REACT_NATIVE_SETUP.md)
- [Quick Start Guide](./QUICK_START.md)
- [API Testing Collection](./API_COMPLETE.md)

---

**Last Updated:** October 27, 2025  
**API Version:** 1.0.0  
**Backend Status:** Production Ready ✅
