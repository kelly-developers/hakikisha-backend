# HAKIKISHA Backend API Documentation

This document outlines all the API endpoints needed for the HAKIKISHA mobile app to function properly.

**Base URL:** `https://hakikisha-backend.onrender.com`

---

## Authentication Endpoints

### 1. Register User
- **Endpoint:** `POST /api/auth/register`
- **Description:** Register a new user
- **Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "token": "jwt_token_here"
}
```

### 2. Login
- **Endpoint:** `POST /api/auth/login`
- **Description:** Login existing user
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user"
  },
  "token": "jwt_token_here"
}
```

### 3. Forgot Password
- **Endpoint:** `POST /api/auth/forgot-password`
- **Description:** Request password reset
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

### 4. Reset Password
- **Endpoint:** `POST /api/auth/reset-password`
- **Description:** Reset password using token
- **Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword123"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

## User Profile Endpoints

### 5. Get User Profile
- **Endpoint:** `GET /api/user/profile`
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
```json
{
  "success": true,
  "profile": {
    "id": "user_id",
    "username": "johndoe",
    "email": "user@example.com",
    "phone": "+255123456789",
    "bio": "Fact-checking enthusiast",
    "profilePicture": "url_to_image",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 6. Update User Profile
- **Endpoint:** `PUT /api/user/profile`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "username": "johndoe_updated",
  "phone": "+255987654321",
  "bio": "Updated bio"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": { /* updated profile data */ }
}
```

### 7. Upload Profile Picture
- **Endpoint:** `POST /api/user/profile-picture`
- **Headers:** `Authorization: Bearer {token}`, `Content-Type: multipart/form-data`
- **Request Body:** Form data with `image` field
- **Response:**
```json
{
  "success": true,
  "message": "Profile picture uploaded",
  "imageUrl": "url_to_uploaded_image"
}
```

### 8. Change Password
- **Endpoint:** `POST /api/user/change-password`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Claims Endpoints

### 9. Submit Claim
- **Endpoint:** `POST /api/claims/submit`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "category": "politics",
  "claimText": "The government increased education budget by 50%",
  "videoLink": "https://youtube.com/...",
  "sourceLink": "https://source.com/...",
  "imageUrl": "url_to_uploaded_image"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Claim submitted successfully",
  "claim": {
    "id": "claim_id",
    "category": "politics",
    "status": "pending",
    "submittedDate": "2024-01-15T10:00:00Z"
  }
}
```

### 10. Upload Claim Evidence
- **Endpoint:** `POST /api/claims/upload-evidence`
- **Headers:** `Authorization: Bearer {token}`, `Content-Type: multipart/form-data`
- **Request Body:** Form data with `image` or `video` field
- **Response:**
```json
{
  "success": true,
  "fileUrl": "url_to_uploaded_file"
}
```

### 11. Get User Claims
- **Endpoint:** `GET /api/claims/my-claims`
- **Headers:** `Authorization: Bearer {token}`
- **Query Params:** `?status=all|verified|false|pending`
- **Response:**
```json
{
  "success": true,
  "claims": [
    {
      "id": "claim_id",
      "title": "Claim title",
      "category": "politics",
      "status": "verified",
      "submittedDate": "2024-01-15",
      "verdictDate": "2024-01-16",
      "verdict": "Verdict text",
      "sources": ["source1.com", "source2.com"]
    }
  ]
}
```

### 12. Get Claim Details
- **Endpoint:** `GET /api/claims/:claimId`
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
```json
{
  "success": true,
  "claim": {
    "id": "claim_id",
    "title": "Claim title",
    "description": "Full claim description",
    "category": "politics",
    "status": "verified",
    "submittedBy": "user_id",
    "submittedDate": "2024-01-15",
    "verdictDate": "2024-01-16",
    "verdict": "Detailed verdict",
    "sources": ["source1.com"],
    "imageUrl": "url",
    "videoLink": "url"
  }
}
```

### 13. Search Claims
- **Endpoint:** `GET /api/claims/search`
- **Query Params:** `?q=search_term`
- **Response:**
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

### 14. Get Trending Claims
- **Endpoint:** `GET /api/claims/trending`
- **Response:**
```json
{
  "success": true,
  "trendingClaims": [
    {
      "id": "claim_id",
      "title": "Trending claim",
      "category": "health",
      "status": "verified",
      "verdict": "Verdict text",
      "trendingScore": 95
    }
  ]
}
```

---

## Fact Checker Endpoints

### 15. Get Pending Claims (Fact Checkers Only)
- **Endpoint:** `GET /api/fact-checker/pending-claims`
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
```json
{
  "success": true,
  "pendingClaims": [
    {
      "id": "claim_id",
      "title": "Claim to verify",
      "description": "Full description",
      "category": "politics",
      "submittedBy": "user_id",
      "submittedDate": "2024-01-15",
      "imageUrl": "url",
      "videoLink": "url",
      "sourceLink": "url"
    }
  ]
}
```

### 16. Submit Verdict (Fact Checkers Only)
- **Endpoint:** `POST /api/fact-checker/submit-verdict`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "claimId": "claim_id",
  "status": "verified|false|misleading|needs_context",
  "verdict": "Detailed explanation of the verdict",
  "sources": ["source1.com", "source2.com"]
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Verdict submitted successfully"
}
```

### 17. Get Fact Checker Stats
- **Endpoint:** `GET /api/fact-checker/stats`
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
```json
{
  "success": true,
  "stats": {
    "totalVerified": 45,
    "pendingReview": 12,
    "timeSpent": "24 hours",
    "accuracy": "95%"
  }
}
```

---

## Admin Endpoints

### 18. Get All Users (Admin Only)
- **Endpoint:** `GET /api/admin/users`
- **Headers:** `Authorization: Bearer {token}`
- **Query Params:** `?role=all|user|fact_checker|admin`
- **Response:**
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
      "createdAt": "2024-01-01"
    }
  ]
}
```

### 19. Register Fact Checker (Admin Only)
- **Endpoint:** `POST /api/admin/register-fact-checker`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "email": "checker@example.com",
  "username": "factchecker1",
  "password": "securePassword123"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Fact checker registered successfully",
  "user": { /* user data */ }
}
```

### 20. Suspend/Delete User (Admin Only)
- **Endpoint:** `POST /api/admin/user-action`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "userId": "user_id",
  "action": "suspend|delete|activate"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "User suspended successfully"
}
```

### 21. Get Admin Dashboard Stats (Admin Only)
- **Endpoint:** `GET /api/admin/dashboard-stats`
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
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
    "admins": 3
  }
}
```

### 22. Get Fact Checker Activity (Admin Only)
- **Endpoint:** `GET /api/admin/fact-checker-activity`
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
```json
{
  "success": true,
  "activity": [
    {
      "factCheckerId": "user_id",
      "username": "checker1",
      "claimsVerified": 45,
      "timeSpent": "12 hours",
      "lastActive": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## Blog Endpoints

### 23. Get All Blogs
- **Endpoint:** `GET /api/blogs`
- **Response:**
```json
{
  "success": true,
  "blogs": [
    {
      "id": "blog_id",
      "title": "Blog title",
      "excerpt": "Short excerpt",
      "content": "Full blog content",
      "author": "Dr. Sarah Johnson",
      "category": "Digital Literacy",
      "readTime": "5 min read",
      "publishedDate": "2024-01-15",
      "imageUrl": "url"
    }
  ]
}
```

### 24. Get Single Blog
- **Endpoint:** `GET /api/blogs/:blogId`
- **Response:**
```json
{
  "success": true,
  "blog": { /* full blog data */ }
}
```

### 25. Create Blog (Fact Checkers/Admin Only)
- **Endpoint:** `POST /api/blogs/create`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "title": "Blog title",
  "excerpt": "Short description",
  "content": "Full markdown content",
  "category": "Politics",
  "readTime": "8 min read"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Blog published successfully",
  "blog": { /* created blog data */ }
}
```

---

## AI Integration Endpoints

### 26. AI Verify Claim (Internal - Fact Checkers See Results)
- **Endpoint:** `POST /api/ai/verify-claim`
- **Headers:** `Authorization: Bearer {token}` (Admin/System Only)
- **Request Body:**
```json
{
  "claimId": "claim_id"
}
```
- **Response:**
```json
{
  "success": true,
  "aiVerdict": {
    "status": "verified|false|misleading|needs_context",
    "confidence": 0.85,
    "verdict": "AI-generated verdict text",
    "sources": ["source1.com", "source2.com"]
  }
}
```

### 27. Get AI Suggested Verdicts (Fact Checkers)
- **Endpoint:** `GET /api/fact-checker/ai-suggestions`
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "claimId": "claim_id",
      "claimTitle": "Claim text",
      "aiStatus": "verified",
      "aiConfidence": 0.85,
      "aiVerdict": "Verdict text",
      "aiSources": ["source1.com"]
    }
  ]
}
```

### 28. Approve AI Verdict (Fact Checkers)
- **Endpoint:** `POST /api/fact-checker/approve-ai-verdict`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "claimId": "claim_id",
  "approved": true,
  "editedVerdict": "Optional edited verdict"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Verdict approved and sent to user"
}
```

---

## CORS Configuration Required

**IMPORTANT:** Your backend MUST allow requests from:
- `capacitor://localhost` (for mobile app)
- `http://localhost` (for mobile app)
- `https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com` (for testing)

Add this to your backend CORS configuration:
```javascript
const allowedOrigins = [
  'capacitor://localhost',
  'http://localhost',
  'https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

---

## Error Response Format

All errors should follow this format:
```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `AUTH_REQUIRED` - No auth token provided
- `AUTH_INVALID` - Invalid auth token
- `FORBIDDEN` - User doesn't have permission
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `SERVER_ERROR` - Internal server error

---

## Testing the API

Use tools like Postman or curl to test all endpoints before integrating with the mobile app. Ensure all endpoints return proper status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error
