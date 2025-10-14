# HAKIKISHA Complete API Documentation
**Version 2.0 - Updated for 5M Users with 2FA, Points System, AI Integration**

Base URL: `https://api.hakikisha.com/api` or `http://localhost:5000/api`

## Table of Contents
1. [Authentication & 2FA](#authentication)
2. [User Profile & Points](#user-profile)
3. [Claims Management](#claims)
4. [Verdicts (AI & Human)](#verdicts)
5. [Fact Checker Dashboard](#fact-checker)
6. [Admin Panel](#admin)
7. [Blogs & Trending](#content)
8. [Error Codes](#errors)

---

## 🔐 Authentication Endpoints

### 1.1 Register User
**POST** `/auth/register`

Users self-register. Fact-checkers require admin approval.

```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe",
  "phone": "+254712345678",
  "role": "user" // Optional: "user" (default), "fact_checker" requires approval
}

// Response (201 Created)
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user",
    "registration_status": "approved"
  }
}

// Fact-checker response
{
  "success": true,
  "message": "Registration submitted for approval",
  "user": {
    "id": "uuid",
    "registration_status": "pending"
  }
}
```

---

### 1.2 Login (with 2FA for Admin/Fact-Checkers)
**POST** `/auth/login`

Login with email/username and password. Returns user role to direct to correct dashboard.

```json
// Step 1: Submit credentials
POST /auth/login
{
  "email": "admin@hakikisha.com",  // Or username
  "password": "Admin@123"
}

// Response if 2FA NOT enabled (regular user)
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@hakikisha.com",
    "username": "johndoe",
    "role": "user",  // ← Frontend uses this to route to dashboard
    "is_verified": true
  }
}

// Response if 2FA ENABLED (admin/fact_checker)
{
  "success": true,
  "requires2FA": true,
  "message": "2FA code sent to your email",
  "sessionId": "temp_session_id"  // Use for next step
}

// Step 2: Verify 2FA code (Admin/Fact-Checker only)
POST /auth/verify-2fa
{
  "sessionId": "temp_session_id",
  "code": "123456"  // 6-digit code from email
}

// Response
{
  "success": true,
  "message": "2FA verified, login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "admin@hakikisha.com",
    "username": "admin",
    "role": "admin",  // ← Route to admin dashboard
    "is_verified": true
  }
}
```

**Frontend Routing Logic**:
```javascript
// After successful login, route based on role
if (response.user.role === 'admin') {
  navigate('/admin-dashboard');
} else if (response.user.role === 'fact_checker') {
  navigate('/fact-checker-dashboard');
} else {
  navigate('/user-dashboard');
}
```

---

### 1.3 Enable 2FA (Admin/Fact-Checker)
**POST** `/auth/enable-2fa`  
**Headers**: `Authorization: Bearer {token}`

```json
// Request
{
  "email": "admin@hakikisha.com"
}

// Response
{
  "success": true,
  "message": "2FA enabled. Backup codes sent to email",
  "backupCodes": [
    "ABCD-1234-EFGH",
    "IJKL-5678-MNOP"
    // ... 10 total backup codes
  ]
}
```

---

### 1.4 Refresh Token
**POST** `/auth/refresh`

```json
{
  "refreshToken": "refresh_token_here"
}

// Response
{
  "success": true,
  "token": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

---

### 1.5 Logout
**POST** `/auth/logout`  
**Headers**: `Authorization: Bearer {token}`

```json
// Response
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 1.6 Forgot Password
**POST** `/auth/forgot-password`

```json
{
  "email": "user@example.com"
}

// Response
{
  "success": true,
  "message": "Password reset code sent to email"
}
```

---

### 1.7 Reset Password
**POST** `/auth/reset-password`

```json
{
  "email": "user@example.com",
  "code": "123456",  // From email
  "newPassword": "NewSecurePass123!"
}
```

---

## 👤 User Profile & Points

### 2.1 Get Current User Profile
**GET** `/user/profile`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "success": true,
  "profile": {
    "id": "user_id",
    "username": "johndoe",
    "email": "user@example.com",
    "phone": "+254712345678",
    "profilePicture": "https://s3.../avatar.jpg",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z",
    "points": {
      "total": 450,
      "currentStreak": 7,  // Days
      "longestStreak": 15,
      "lastActivity": "2024-01-15"
    }
  }
}
```

---

### 2.2 Get User Points & Streaks
**GET** `/user/points`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "success": true,
  "points": {
    "total": 450,
    "currentStreak": 7,
    "longestStreak": 15,
    "lastActivity": "2024-01-15",
    "nextReset": "2024-01-16T00:00:00Z" // If inactive
  },
  "recentActivity": [
    {
      "points": 10,
      "action": "CLAIM_SUBMISSION",
      "description": "Submitted claim about politics",
      "date": "2024-01-15T10:30:00Z"
    },
    {
      "points": 5,
      "action": "DAILY_LOGIN",
      "description": "Daily login bonus",
      "date": "2024-01-15T08:00:00Z"
    }
  ]
}
```

**Points System Rules**:
- ✅ **Award points** for: claim submission (10), daily login (5), claim verified (20)
- ✅ **Streak bonuses**: 3 days (+10), 7 days (+25), 30 days (+100)
- ⚠️ **Reset to 0**: If user doesn't engage for 24 hours
- 📊 **Leaderboard**: Top users by total points

---

### 2.3 Get Leaderboard
**GET** `/user/leaderboard?limit=100`

```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "username": "topuser",
      "points": 2450,
      "currentStreak": 30
    },
    // ... top 100
  ]
}
```

---

### 2.4 Update Profile
**PUT** `/user/profile`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "username": "johndoe_updated",
  "phone": "+254987654321",
  "bio": "Fact-checking enthusiast"
}
```

---

## 📝 Claims Management

### 3.1 Submit Claim
**POST** `/claims/submit`  
**Headers**: `Authorization: Bearer {token}`

Users can submit claims with text, video links, images, or URLs.

```json
{
  "title": "Government increased education budget by 50%",
  "description": "Full claim description here...",
  "category": "politics",  // politics, health, education, technology, etc.
  "mediaType": "video",  // text, video, image, link
  "mediaUrl": "https://youtube.com/watch?v=...",
  "sourceLinks": [
    "https://source1.com/article",
    "https://source2.com/report"
  ]
}

// Response
{
  "success": true,
  "message": "Claim submitted successfully. AI is processing...",
  "claim": {
    "id": "claim_id",
    "title": "Government increased education budget by 50%",
    "status": "ai_processing",  // pending → ai_processing → human_review → published
    "submittedDate": "2024-01-15T10:00:00Z"
  },
  "pointsAwarded": 10,
  "newTotalPoints": 460
}
```

**Flow**:
1. User submits → `status: pending`
2. AI processes → `status: ai_processing` → AI generates verdict
3. Fact-checker reviews → `status: human_review`
4. Fact-checker approves → `status: published` → User notified

---

### 3.2 Upload Claim Evidence (Image/Video)
**POST** `/claims/upload-evidence`  
**Headers**: `Authorization: Bearer {token}`, `Content-Type: multipart/form-data`

```javascript
// Form data
const formData = new FormData();
formData.append('file', imageFile);
formData.append('claimId', 'claim_id');

// Response
{
  "success": true,
  "fileUrl": "https://s3.../evidence.jpg",
  "message": "Evidence uploaded successfully"
}
```

---

### 3.3 Get My Claims
**GET** `/claims/my-claims?status=all&page=1&limit=20`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "success": true,
  "claims": [
    {
      "id": "claim_id",
      "title": "Claim title",
      "category": "politics",
      "status": "published",
      "submittedDate": "2024-01-15",
      "verdict": {
        "verdict": "false",
        "verdictText": "This claim is misleading because...",
        "sources": ["source1.com", "source2.com"],
        "factCheckerName": "Dr. Sarah Johnson"
      },
      "mediaUrl": "https://youtube.com/...",
      "pointsEarned": 30  // 10 (submission) + 20 (verified)
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### 3.4 Get Claim Details
**GET** `/claims/:claimId`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "success": true,
  "claim": {
    "id": "claim_id",
    "title": "Government increased education budget by 50%",
    "description": "Full description...",
    "category": "politics",
    "status": "published",
    "submittedBy": {
      "username": "johndoe",
      "id": "user_id"
    },
    "submittedDate": "2024-01-15",
    "mediaType": "video",
    "mediaUrl": "https://youtube.com/...",
    "sourceLinks": ["https://source1.com"],
    "aiVerdict": {
      "verdict": "false",
      "confidence": 0.89,
      "explanation": "AI analysis shows...",
      "sources": ["ai-source1.com"]
    },
    "humanVerdict": {
      "verdict": "false",
      "verdictText": "Detailed fact-check...",
      "sources": ["verified-source1.com", "verified-source2.com"],
      "factChecker": {
        "name": "Dr. Sarah Johnson",
        "id": "fc_id"
      },
      "approvedDate": "2024-01-16T12:00:00Z"
    }
  }
}
```

---

### 3.5 Search Claims
**GET** `/claims/search?q=education budget&category=politics`

```json
{
  "success": true,
  "results": [
    {
      "id": "claim_id",
      "title": "Government increased education budget...",
      "description": "Short excerpt...",
      "category": "politics",
      "status": "published",
      "verdict": "false"
    }
  ],
  "total": 12
}
```

---

### 3.6 Get Trending Claims
**GET** `/claims/trending?limit=10`

```json
{
  "success": true,
  "trendingClaims": [
    {
      "id": "claim_id",
      "title": "Trending claim about...",
      "category": "health",
      "verdict": "misleading",
      "verdictText": "Short summary...",
      "trendingScore": 95,
      "submissionCount": 234,  // How many users submitted similar
      "views": 12500
    }
  ]
}
```

---

## ✅ Verdicts (AI & Human)

### 4.1 Get AI Verdict for Claim (Fact-Checker Only)
**GET** `/verdicts/ai/:claimId`  
**Headers**: `Authorization: Bearer {token}`  
**Role**: fact_checker, admin

```json
{
  "success": true,
  "aiVerdict": {
    "claimId": "claim_id",
    "verdict": "false",
    "confidence": 0.89,
    "explanation": "AI analysis indicates this claim is false because...",
    "sources": [
      "https://authoritative-source1.org",
      "https://research-paper2.edu"
    ],
    "processingTime": "2.3s",
    "createdAt": "2024-01-15T10:05:00Z"
  }
}
```

---

## 🔍 Fact-Checker Dashboard

### 5.1 Get Pending Claims (For Review)
**GET** `/fact-checker/pending-claims?page=1&limit=20`  
**Headers**: `Authorization: Bearer {token}`  
**Role**: fact_checker, admin

```json
{
  "success": true,
  "pendingClaims": [
    {
      "id": "claim_id",
      "title": "Claim to verify",
      "description": "Full description",
      "category": "politics",
      "submittedBy": {
        "username": "johndoe",
        "id": "user_id"
      },
      "submittedDate": "2024-01-15T10:00:00Z",
      "mediaType": "video",
      "mediaUrl": "https://youtube.com/...",
      "sourceLinks": ["https://source1.com"],
      "aiVerdict": {
        "verdict": "false",
        "confidence": 0.89,
        "explanation": "AI suggests this is false because..."
      },
      "priority": "high"  // Based on trending, similar submissions
    }
  ],
  "pagination": {
    "page": 1,
    "total": 45
  }
}
```

---

### 5.2 Submit/Edit Verdict
**POST** `/fact-checker/submit-verdict`  
**Headers**: `Authorization: Bearer {token}`  
**Role**: fact_checker, admin

Fact-checkers can approve AI verdict or write their own.

```json
// Option 1: Approve AI verdict (with optional edits)
{
  "claimId": "claim_id",
  "approveAI": true,
  "editedVerdictText": "Optional: edited explanation...",
  "additionalSources": ["https://extra-source.com"]
}

// Option 2: Write new verdict
{
  "claimId": "claim_id",
  "verdict": "misleading",  // true, false, misleading, needs_context, satire
  "verdictText": "After thorough fact-checking, this claim is misleading because...",
  "sources": [
    "https://verified-source1.gov",
    "https://research-institution2.edu"
  ],
  "confidenceScore": 0.95
}

// Response
{
  "success": true,
  "message": "Verdict published successfully. User has been notified.",
  "verdict": {
    "id": "verdict_id",
    "claimId": "claim_id",
    "verdict": "misleading",
    "publishedAt": "2024-01-16T12:00:00Z"
  }
}
```

**Workflow**:
1. FC sees claim with AI verdict
2. FC can:
   - ✅ Approve AI verdict → Sent to user
   - ✏️ Edit AI verdict → Sent to user
   - ✍️ Write new verdict → Sent to user
   - ❌ Reject claim → Not published

---

### 5.3 Get My Verdicts (Fact-Checker Stats)
**GET** `/fact-checker/my-verdicts?page=1&limit=20`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "success": true,
  "verdicts": [
    {
      "id": "verdict_id",
      "claim": {
        "title": "Claim title",
        "id": "claim_id"
      },
      "verdict": "false",
      "publishedDate": "2024-01-16",
      "editedFromAI": true
    }
  ],
  "stats": {
    "totalVerified": 145,
    "thisMonth": 23,
    "avgResponseTime": "2.5 hours",
    "accuracy": "97%"  // Based on user reports/appeals
  }
}
```

---

## 👨‍💼 Admin Panel

### 6.1 Get All Users
**GET** `/admin/users?role=all&status=all&page=1&limit=50`  
**Headers**: `Authorization: Bearer {token}`  
**Role**: admin

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
      "registrationStatus": "approved",
      "createdAt": "2024-01-01",
      "lastLogin": "2024-01-15T08:00:00Z",
      "totalPoints": 450,
      "claimsSubmitted": 12
    }
  ],
  "pagination": {
    "page": 1,
    "total": 5234,
    "pages": 105
  }
}
```

---

### 6.2 Register Fact-Checker (Admin Only)
**POST** `/admin/register-fact-checker`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "email": "checker@example.com",
  "username": "factchecker1",
  "password": "TempPassword123!",
  "phone": "+254712345678",
  "expertiseAreas": ["politics", "health"]
}

// Response
{
  "success": true,
  "message": "Fact-checker registered. Credentials sent to email.",
  "user": {
    "id": "fc_id",
    "username": "factchecker1",
    "role": "fact_checker",
    "twoFactorEnabled": true  // Auto-enabled for FC
  }
}
```

---

### 6.3 Register Admin (Super Admin Only)
**POST** `/admin/register-admin`  
**Headers**: `Authorization: Bearer {token}`

Same as fact-checker registration.

---

### 6.4 Approve/Reject Fact-Checker Application
**POST** `/admin/approve-fact-checker`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "userId": "pending_fc_id",
  "action": "approve"  // or "reject"
}

// Response
{
  "success": true,
  "message": "Fact-checker approved. They can now log in."
}
```

---

### 6.5 Suspend/Delete User
**POST** `/admin/user-action`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "userId": "user_id",
  "action": "suspend"  // suspend, delete, activate
}
```

---

### 6.6 Admin Dashboard Stats
**GET** `/admin/dashboard-stats`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "success": true,
  "stats": {
    "users": {
      "total": 5234567,
      "active": 3456789,
      "newThisMonth": 45678
    },
    "claims": {
      "total": 234567,
      "pending": 456,
      "aiProcessing": 123,
      "humanReview": 234,
      "published": 233754
    },
    "verdicts": {
      "true": 45000,
      "false": 120000,
      "misleading": 68754
    },
    "factCheckers": {
      "total": 45,
      "active": 38
    },
    "trending": [
      {
        "topic": "Election Fraud",
        "category": "politics",
        "claims": 234,
        "score": 98
      }
    ]
  }
}
```

---

### 6.7 Fact-Checker Activity Log
**GET** `/admin/fact-checker-activity?factCheckerId=uuid`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "success": true,
  "activity": [
    {
      "factCheckerId": "fc_id",
      "username": "checker1",
      "claimsVerified": 145,
      "thisWeek": 12,
      "avgResponseTime": "2.5 hours",
      "lastActive": "2024-01-15T14:30:00Z",
      "accuracy": "97%"
    }
  ]
}
```

---

## 📰 Blogs & Trending

### 7.1 Get All Blogs
**GET** `/blogs?category=all&page=1&limit=20`

```json
{
  "success": true,
  "blogs": [
    {
      "id": "blog_id",
      "title": "Understanding Misinformation in 2024",
      "excerpt": "Short description...",
      "content": "Full markdown content...",
      "author": {
        "name": "Dr. Sarah Johnson",
        "id": "fc_id"
      },
      "category": "Digital Literacy",
      "readTime": "5 min",
      "publishedDate": "2024-01-15",
      "imageUrl": "https://s3.../blog-cover.jpg",
      "views": 12500
    }
  ]
}
```

---

### 7.2 Create Blog (Fact-Checker/Admin)
**POST** `/blogs/create`  
**Headers**: `Authorization: Bearer {token}`

```json
{
  "title": "Blog title",
  "excerpt": "Short description",
  "content": "Full markdown content",
  "category": "Politics",
  "readTime": "8 min",
  "coverImage": "https://s3.../cover.jpg"
}
```

---

## ⚠️ Error Codes

```json
// Authentication errors
{
  "success": false,
  "error": "Invalid credentials",
  "code": "AUTH_INVALID"
}

// Common codes:
- AUTH_REQUIRED: No token provided
- AUTH_INVALID: Invalid token
- AUTH_EXPIRED: Token expired
- AUTH_2FA_REQUIRED: 2FA code needed
- AUTH_2FA_INVALID: Wrong 2FA code
- FORBIDDEN: Insufficient permissions
- NOT_FOUND: Resource not found
- VALIDATION_ERROR: Invalid input
- RATE_LIMIT: Too many requests
- SERVER_ERROR: Internal error
```

---

## 🔒 CORS Configuration

Add these origins to backend CORS:
- `capacitor://localhost` (Mobile app)
- `http://localhost` (Dev)
- `https://yourdomain.com` (Production)

```javascript
const allowedOrigins = [
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:3000',
  'https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com',
  'https://yourdomain.com'
];
```

---

## 📱 React Native Integration

See `docs/REACT_NATIVE_SETUP.md` for complete mobile app integration guide.

**Quick Start**:
```javascript
// api.js
const API_BASE_URL = 'https://api.hakikisha.com/api';

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};
```

---

**Next Steps**:
1. ✅ Setup database (see `DATABASE_SETUP.md`)
2. ✅ Configure environment variables
3. ✅ Test APIs with Postman
4. ✅ Connect React Native app
5. ✅ Deploy to production

**Need help?** Check troubleshooting guides in `/docs` folder.
