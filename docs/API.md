# HAKIKISHA Backend API Documentation

## 📋 Overview

Complete API documentation for HAKIKISHA fact-checking platform backend. Designed to handle 5M+ concurrent users with horizontal scaling capabilities.

**Base URL:** `https://your-backend-url.com/api` or `http://localhost:5000/api`

**Current Version:** v1.0.0

---

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Refresh Flow

When a token expires (401 error), use the refresh token endpoint to get a new token without re-authentication.

---

## 📚 API Endpoints

### Authentication Endpoints

#### 1. Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "phone": "+254712345678",
  "role": "user"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration submitted for approval",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user",
    "registration_status": "pending",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- Email: Must be valid email format, max 255 characters
- Password: Min 8 characters, must include uppercase, lowercase, number, special character
- Phone: Optional, E.164 format
- Role: Must be one of: `user`, `fact_checker`, `admin`

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `409 Conflict` - Email already exists
- `500 Internal Server Error` - Server error

---

#### 2. Login

**POST** `/api/auth/login`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user",
    "is_verified": true,
    "registration_status": "approved",
    "profile_picture": "https://example.com/avatar.jpg",
    "created_at": "2025-01-10T08:00:00.000Z",
    "last_login": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account not approved or suspended
- `500 Internal Server Error` - Server error

---

#### 3. Logout

**POST** `/api/auth/logout`

Invalidate current JWT token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

#### 4. Refresh Token

**POST** `/api/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### 5. Get Current User

**GET** `/api/auth/me`

Get authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "phone": "+254712345678",
    "role": "user",
    "is_verified": true,
    "profile_picture": "https://example.com/avatar.jpg",
    "registration_status": "approved",
    "created_at": "2025-01-10T08:00:00.000Z",
    "last_login": "2025-01-15T10:30:00.000Z",
    "login_count": 42
  }
}
```

---

### Claim Endpoints

#### 6. Submit Claim

**POST** `/api/claims`

Submit a new claim for fact-checking.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Government announces new education policy",
  "description": "The government has announced a comprehensive new education policy that will affect all schools...",
  "category": "education",
  "media_type": "link",
  "media_url": "https://example.com/news-article"
}
```

**Categories:**
- `politics`
- `health`
- `education`
- `technology`
- `entertainment`
- `sports`
- `business`
- `other`

**Media Types:**
- `text` - Text-only claim
- `image` - Image-based claim
- `video` - Video-based claim
- `link` - URL/link to external content

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "claim-uuid-here",
    "user_id": "user-uuid",
    "title": "Government announces new education policy",
    "description": "The government has announced...",
    "category": "education",
    "media_type": "link",
    "media_url": "https://example.com/news-article",
    "status": "pending",
    "priority": "medium",
    "similarity_hash": "a1b2c3d4e5f6",
    "submission_count": 1,
    "is_trending": false,
    "trending_score": 0,
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- Title: Required, max 500 characters
- Description: Required, max 5000 characters
- Category: Required, must be valid category
- Media URL: Optional, must be valid URL if provided

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Not authenticated
- `429 Too Many Requests` - Rate limit exceeded (10 claims per hour)
- `500 Internal Server Error` - Server error

---

#### 7. Get All Claims

**GET** `/api/claims`

Get paginated list of claims with optional filters.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `status` (string, optional) - Filter by status
- `category` (string, optional) - Filter by category
- `priority` (string, optional) - Filter by priority
- `sort` (string, default: 'created_at') - Sort field
- `order` (string, default: 'desc') - Sort order (asc/desc)

**Example Request:**
```
GET /api/claims?page=1&limit=20&category=politics&status=published
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "claim-uuid",
      "user_id": "user-uuid",
      "title": "Claim title",
      "description": "Claim description...",
      "category": "politics",
      "media_type": "text",
      "media_url": null,
      "status": "published",
      "priority": "high",
      "is_trending": true,
      "trending_score": 85.5,
      "submission_count": 15,
      "created_at": "2025-01-15T08:00:00.000Z",
      "updated_at": "2025-01-15T09:30:00.000Z",
      "published_at": "2025-01-15T09:30:00.000Z",
      "verdict": {
        "id": "verdict-uuid",
        "verdict": "false",
        "explanation": "This claim is false because...",
        "evidence_sources": [
          "https://source1.com",
          "https://source2.org"
        ],
        "fact_checker_id": "checker-uuid",
        "is_ai_generated": false,
        "created_at": "2025-01-15T09:00:00.000Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Status Values:**
- `pending` - Awaiting AI processing
- `ai_processing` - Being processed by AI
- `human_review` - Awaiting human fact-checker review
- `ai_approved` - AI verdict approved
- `human_approved` - Human fact-checker verdict approved
- `published` - Published with verdict
- `rejected` - Rejected claim

---

#### 8. Get Claim by ID

**GET** `/api/claims/:id`

Get detailed information about a specific claim.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "claim-uuid",
    "user_id": "user-uuid",
    "title": "Full claim title",
    "description": "Complete description with all details...",
    "category": "health",
    "media_type": "link",
    "media_url": "https://example.com/source",
    "status": "published",
    "priority": "high",
    "similarity_hash": "hash-value",
    "submission_count": 23,
    "is_trending": true,
    "trending_score": 92.3,
    "ai_verdict_id": "ai-verdict-uuid",
    "human_verdict_id": "verdict-uuid",
    "assigned_fact_checker_id": "checker-uuid",
    "created_at": "2025-01-14T15:45:00.000Z",
    "updated_at": "2025-01-15T09:30:00.000Z",
    "published_at": "2025-01-15T09:30:00.000Z",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com"
    },
    "verdict": {
      "id": "verdict-uuid",
      "claim_id": "claim-uuid",
      "verdict": "misleading",
      "explanation": "While parts of this claim are accurate...",
      "evidence_sources": [
        "https://credible-source1.com/article",
        "https://research-paper.edu/study"
      ],
      "fact_checker_id": "fact-checker-uuid",
      "is_ai_generated": false,
      "approval_status": "approved",
      "time_spent": 1800,
      "created_at": "2025-01-15T09:00:00.000Z",
      "fact_checker": {
        "id": "checker-uuid",
        "email": "checker@example.com",
        "profile_picture": "https://example.com/checker-avatar.jpg"
      }
    },
    "ai_verdict": {
      "id": "ai-verdict-uuid",
      "verdict": "misleading",
      "confidence_score": 0.87,
      "reasoning": "AI analysis suggests...",
      "sources_analyzed": ["source1", "source2"],
      "created_at": "2025-01-14T16:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Claim not found
- `500 Internal Server Error` - Server error

---

#### 9. Get Trending Claims

**GET** `/api/claims/trending`

Get currently trending claims based on submission count and engagement.

**Query Parameters:**
- `limit` (number, default: 5, max: 20) - Number of trending claims

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "claim-uuid",
      "title": "Trending claim title",
      "description": "Claim description...",
      "category": "politics",
      "media_type": "text",
      "status": "published",
      "is_trending": true,
      "trending_score": 95.2,
      "submission_count": 45,
      "created_at": "2025-01-15T08:00:00.000Z",
      "verdict": {
        "verdict": "false",
        "explanation": "Brief explanation...",
        "evidence_sources": ["source1", "source2"]
      }
    }
  ]
}
```

---

#### 10. Update Claim Status

**POST** `/api/claims/:id/status`

Update claim status (fact-checkers and admins only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "human_review",
  "priority": "high",
  "notes": "Requires urgent review"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "claim-uuid",
    "status": "human_review",
    "priority": "high",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Search Endpoints

#### 11. Search Claims

**GET** `/api/search/claims`

Search claims by title, description, or keywords.

**Query Parameters:**
- `q` (string, required) - Search query
- `category` (string, optional) - Filter by category
- `status` (string, optional) - Filter by status
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

**Example Request:**
```
GET /api/search/claims?q=election%20results&category=politics&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "claim-uuid",
      "title": "Highlighted title with election results",
      "description": "Description...",
      "category": "politics",
      "verdict": { "verdict": "false" },
      "created_at": "2025-01-15T08:00:00.000Z",
      "relevance_score": 0.95
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

#### 12. Search Verdicts

**GET** `/api/search/verdicts`

Search verdicts by explanation or evidence sources.

**Query Parameters:**
- `q` (string, required) - Search query
- `verdict_type` (string, optional) - Filter by verdict (true/false/misleading/unverifiable)
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

---

#### 13. Search Blogs

**GET** `/api/search/blogs`

Search blog articles.

**Query Parameters:**
- `q` (string, required) - Search query
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

---

#### 14. Get Search Suggestions

**GET** `/api/search/suggestions`

Get autocomplete suggestions for search queries.

**Query Parameters:**
- `q` (string, required) - Partial search query (min 2 characters)
- `limit` (number, default: 5, max: 10) - Number of suggestions

**Response (200 OK):**
```json
{
  "success": true,
  "suggestions": [
    "election results 2025",
    "election fraud claims",
    "election verification process"
  ]
}
```

---

### User Endpoints

#### 15. Get User Profile

**GET** `/api/user/profile`

Get authenticated user's complete profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "phone": "+254712345678",
    "role": "user",
    "profile_picture": "https://example.com/avatar.jpg",
    "is_verified": true,
    "registration_status": "approved",
    "created_at": "2025-01-10T08:00:00.000Z",
    "last_login": "2025-01-15T10:30:00.000Z",
    "login_count": 42,
    "statistics": {
      "claims_submitted": 15,
      "claims_verified": 12,
      "claims_pending": 3
    }
  }
}
```

---

#### 16. Update User Profile

**PUT** `/api/user/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "phone": "+254712345678",
  "profile_picture": "https://example.com/new-avatar.jpg"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "phone": "+254712345678",
    "profile_picture": "https://example.com/new-avatar.jpg",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

#### 17. Get My Claims

**GET** `/api/user/my-claims`

Get claims submitted by authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string, optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "claim-uuid",
      "title": "My submitted claim",
      "description": "Description...",
      "category": "politics",
      "status": "published",
      "created_at": "2025-01-14T10:00:00.000Z",
      "verdict": {
        "verdict": "true",
        "explanation": "Verified as accurate"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

---

#### 18. Get Notifications

**GET** `/api/user/notifications`

Get user notifications.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `unread_only` (boolean, default: false)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "notification-uuid",
      "user_id": "user-uuid",
      "type": "claim_verdict",
      "title": "Your claim has been verified",
      "message": "The claim you submitted has been fact-checked and verified.",
      "is_read": false,
      "related_id": "claim-uuid",
      "related_type": "claim",
      "created_at": "2025-01-15T10:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "unread_count": 3
  }
}
```

**Notification Types:**
- `claim_verdict` - Claim has received a verdict
- `claim_status_update` - Claim status changed
- `system_announcement` - System-wide announcement
- `account_update` - Account-related update

---

#### 19. Mark Notification as Read

**PUT** `/api/user/notifications/:id/read`

Mark a notification as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

#### 20. Get Search History

**GET** `/api/user/search-history`

Get user's search history.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (number, default: 10, max: 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "search-uuid",
      "query": "election results",
      "results_count": 42,
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### 21. Save Search History

**POST** `/api/user/search-history`

Save a search query to history.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "query": "election results",
  "results_count": 42
}
```

---

### Fact Checker Dashboard Endpoints

#### 22. Get Claims for Review

**GET** `/api/dashboard/fact-checker/claims`

Get claims assigned for fact-checking (fact-checkers only).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string, optional) - Filter by status
- `priority` (string, optional) - Filter by priority
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "claim-uuid",
      "title": "Claim title",
      "description": "Description...",
      "category": "politics",
      "media_type": "text",
      "media_url": null,
      "status": "human_review",
      "priority": "high",
      "submission_count": 15,
      "is_trending": true,
      "ai_verdict": {
        "verdict": "false",
        "confidence_score": 0.87,
        "reasoning": "AI analysis..."
      },
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

---

#### 23. Assign Claim to Fact Checker

**POST** `/api/dashboard/fact-checker/claims/:id/assign`

Assign a claim to the authenticated fact-checker.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Claim assigned successfully",
  "data": {
    "id": "claim-uuid",
    "assigned_fact_checker_id": "checker-uuid",
    "status": "human_review",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

#### 24. Submit Verdict

**POST** `/api/dashboard/fact-checker/verdicts`

Submit fact-check verdict for a claim (fact-checkers only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "claim_id": "claim-uuid",
  "verdict": "false",
  "explanation": "After thorough investigation and verification with multiple credible sources, this claim has been determined to be false. The evidence clearly contradicts the assertion made in the claim.",
  "evidence_sources": [
    "https://credible-source1.com/article",
    "https://government-official-site.gov/data",
    "https://research-institution.edu/study"
  ],
  "approve_ai_verdict": false,
  "time_spent": 1800,
  "review_notes": "Requires additional monitoring for similar claims"
}
```

**Verdict Types:**
- `true` - Claim is accurate
- `false` - Claim is false
- `misleading` - Claim contains partial truth but misleading context
- `unverifiable` - Cannot be verified with available evidence

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "verdict-uuid",
    "claim_id": "claim-uuid",
    "fact_checker_id": "checker-uuid",
    "verdict": "false",
    "explanation": "After thorough investigation...",
    "evidence_sources": [
      "https://credible-source1.com/article",
      "https://government-official-site.gov/data"
    ],
    "approval_status": "approved",
    "time_spent": 1800,
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- Explanation: Min 50 characters, max 5000 characters
- Evidence Sources: At least 2 credible sources required
- Time Spent: In seconds

---

### Admin Dashboard Endpoints

#### 25. Get System Statistics

**GET** `/api/admin/dashboard/stats`

Get comprehensive system statistics (admins only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 152400,
      "active_today": 8542,
      "new_this_month": 4230,
      "verified": 145800,
      "pending_verification": 6600
    },
    "claims": {
      "total": 34210,
      "pending": 420,
      "in_review": 156,
      "verified": 32010,
      "rejected": 1624,
      "today_submissions": 87,
      "today_verifications": 56
    },
    "fact_checkers": {
      "total": 285,
      "active": 182,
      "average_rating": 4.7,
      "total_verdicts": 32010,
      "average_response_time": "2.5 hours"
    },
    "performance": {
      "average_claim_processing_time": "4.2 hours",
      "ai_accuracy_rate": 0.89,
      "user_satisfaction_rate": 0.92
    }
  }
}
```

---

#### 26. Get Fact Checkers List

**GET** `/api/admin/fact-checkers`

Get list of all fact-checkers (admins only).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string, optional) - Filter by verification status

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "checker-uuid",
      "email": "checker@example.com",
      "phone": "+254712345678",
      "profile_picture": "https://example.com/avatar.jpg",
      "verification_status": "approved",
      "expertise_areas": ["politics", "health"],
      "rating": 4.8,
      "statistics": {
        "total_verified": 145,
        "pending_review": 3,
        "accuracy": 96,
        "average_response_time": "2.5 hours"
      },
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 285
  }
}
```

---

#### 27. Get Fact Checker Performance

**GET** `/api/admin/fact-checkers/:id/performance`

Get detailed performance metrics for a fact-checker (admins only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "checker-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "statistics": {
      "total_verified": 145,
      "pending_review": 3,
      "accuracy": 96,
      "average_response_time": "2.5 hours",
      "this_month_verifications": 42,
      "verdicts_by_type": {
        "true": 45,
        "false": 62,
        "misleading": 28,
        "unverifiable": 10
      }
    },
    "recent_verdicts": [
      {
        "id": "verdict-uuid",
        "claim_title": "Claim title",
        "verdict": "false",
        "time_spent": 1800,
        "created_at": "2025-01-15T09:00:00.000Z"
      }
    ],
    "performance_trend": [
      {
        "month": "2025-01",
        "verdicts": 42,
        "average_time": "2.3 hours",
        "accuracy": 97
      }
    ]
  }
}
```

---

#### 28. Get Recent Activity

**GET** `/api/admin/recent-activity`

Get recent system activity (admins only).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (number, default: 10, max: 50)
- `type` (string, optional) - Filter by activity type

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "activity-uuid",
      "type": "verdict_submitted",
      "actor": {
        "id": "checker-uuid",
        "email": "checker@example.com",
        "role": "fact_checker"
      },
      "action": "verified_claim",
      "details": {
        "claim_id": "claim-uuid",
        "claim_title": "Government policy announcement",
        "verdict": "true"
      },
      "timestamp": "2025-01-15T10:25:00.000Z"
    }
  ]
}
```

---

#### 29. Get Registration Requests

**GET** `/api/admin/registration-requests`

Get pending user registration requests (admins only).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string, default: 'pending') - Filter by status
- `role` (string, optional) - Filter by requested role
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "request-uuid",
      "email": "user@example.com",
      "phone": "+254712345678",
      "requested_role": "fact_checker",
      "status": "pending",
      "justification": "I have 5 years of experience in journalism...",
      "expertise_areas": ["politics", "health"],
      "submitted_at": "2025-01-15T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

---

#### 30. Approve Registration

**POST** `/api/admin/approve-registration/:requestId`

Approve a pending registration request (admins only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "role": "fact_checker",
  "notes": "Approved based on qualifications"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration approved successfully",
  "data": {
    "user_id": "user-uuid",
    "email": "user@example.com",
    "role": "fact_checker",
    "registration_status": "approved"
  }
}
```

---

#### 31. Reject Registration

**POST** `/api/admin/reject-registration/:requestId`

Reject a pending registration request (admins only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "Insufficient qualifications for fact-checker role"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration rejected",
  "data": {
    "request_id": "request-uuid",
    "status": "rejected",
    "reason": "Insufficient qualifications"
  }
}
```

---

## 📤 File Upload

### Upload Media File

**POST** `/api/upload`

Upload image or video file for claims.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```
FormData with 'file' field
```

**Supported Formats:**
- Images: JPG, PNG, GIF, WEBP (max 10MB)
- Videos: MP4, MOV, AVI (max 50MB)

**Response (200 OK):**
```json
{
  "success": true,
  "url": "https://storage.example.com/uploads/claim-uuid/image-1234.jpg",
  "filename": "image-1234.jpg",
  "size": 1048576,
  "mime_type": "image/jpeg"
}
```

---

## 🚦 Rate Limiting

Rate limits are applied per IP address and user account:

| Endpoint Group | Rate Limit | Window |
|---------------|------------|---------|
| Authentication | 5 requests | 15 minutes |
| Claim Submission | 10 requests | 1 hour |
| Search | 30 requests | 1 minute |
| General API | 100 requests | 15 minutes |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642262400
```

**Rate Limit Error (429):**
```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 900
}
```

---

## ❌ Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "issue": "Email already exists"
  }
}
```

### HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Common Error Codes

- `INVALID_CREDENTIALS` - Login failed
- `TOKEN_EXPIRED` - JWT token expired
- `INVALID_TOKEN` - JWT token invalid
- `INSUFFICIENT_PERMISSIONS` - User lacks required role
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `VALIDATION_ERROR` - Input validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVER_ERROR` - Internal server error

---

## 🔒 Security Best Practices

### HTTPS Only
All API requests must use HTTPS in production.

### JWT Token Security
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- Tokens are signed with HS256 algorithm
- Store tokens securely (never in localStorage for sensitive apps)

### Password Requirements
- Minimum 8 characters
- Must include: uppercase, lowercase, number, special character
- Passwords are hashed with bcrypt (10 rounds)

### CORS Policy
Configure allowed origins in production:
```javascript
ALLOWED_ORIGINS=https://hakikisha.app,https://mobile.hakikisha.app
```

---

## 📊 Pagination

All list endpoints support pagination with consistent format:

**Request:**
```
?page=2&limit=20
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 145,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## 🧪 Testing Endpoints

Use these curl examples to test endpoints:

### Login
```bash
curl -X POST https://api.hakikisha.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Get Claims
```bash
curl -X GET "https://api.hakikisha.com/api/claims?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Submit Claim
```bash
curl -X POST https://api.hakikisha.com/api/claims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title":"Test claim",
    "description":"Test description",
    "category":"politics",
    "media_type":"text"
  }'
```

---

## 📝 Changelog

### Version 1.0.0 (2025-01-15)
- Initial API release
- Complete authentication system
- Claim submission and management
- Search functionality
- User notifications
- Fact-checker dashboard
- Admin dashboard
- Rate limiting
- File upload support

---

## 💬 Support

For API support and questions:
- Email: api-support@hakikisha.com
- Documentation: https://docs.hakikisha.com
- Status Page: https://status.hakikisha.com
