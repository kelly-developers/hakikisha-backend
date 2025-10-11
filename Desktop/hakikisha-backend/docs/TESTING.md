# HAKIKISHA Backend - Testing Guide

## 📋 Overview

Complete guide for testing the HAKIKISHA backend API locally and in production.

---

## 🚀 Quick Start Testing

### 1. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 2. Verify Server is Running

```bash
# Health check
curl http://localhost:5000/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 120.5,
  "memory": { ... },
  "environment": "development"
}
```

---

## 🔧 Testing Tools

### Option 1: cURL (Command Line)

Best for: Quick tests, CI/CD pipelines, scripts

### Option 2: Postman

Best for: Interactive testing, collections, team collaboration

**Import Postman Collection:**
1. Download `HAKIKISHA.postman_collection.json` from `/docs/postman/`
2. Open Postman
3. Click Import → Upload File
4. Select the collection file

### Option 3: HTTPie

Best for: Human-friendly command line

```bash
# Install HTTPie
pip install httpie

# or
brew install httpie
```

---

## 🧪 API Endpoint Tests

### Authentication Tests

#### 1. Register New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test1234!",
    "phone": "+254712345678",
    "role": "user"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration submitted for approval",
  "data": {
    "id": "uuid-here",
    "email": "testuser@example.com",
    "role": "user",
    "registration_status": "pending"
  }
}
```

**HTTPie:**
```bash
http POST http://localhost:5000/api/auth/register \
  email=testuser@example.com \
  password=Test1234! \
  phone=+254712345678 \
  role=user
```

---

#### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test1234!"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "testuser@example.com",
    "role": "user",
    "is_verified": true
  }
}
```

**Save the token for subsequent requests:**
```bash
# In your terminal
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### 3. Get Current User

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "testuser@example.com",
    "role": "user",
    "is_verified": true,
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

---

#### 4. Refresh Token

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token"
  }'
```

---

#### 5. Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

### Claim Tests

#### 6. Submit Claim

```bash
curl -X POST http://localhost:5000/api/claims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Government announces new education policy",
    "description": "The government has announced a comprehensive new education policy affecting all schools nationwide. This policy includes major changes to curriculum and funding.",
    "category": "education",
    "media_type": "link",
    "media_url": "https://example.com/news-article"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "claim-uuid",
    "title": "Government announces new education policy",
    "description": "The government has announced...",
    "category": "education",
    "status": "pending",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**HTTPie:**
```bash
http POST http://localhost:5000/api/claims \
  Authorization:"Bearer $TOKEN" \
  title="Government announces new education policy" \
  description="Detailed description here" \
  category=education \
  media_type=link \
  media_url=https://example.com/news
```

---

#### 7. Get All Claims (Paginated)

```bash
curl -X GET "http://localhost:5000/api/claims?page=1&limit=20&category=education" \
  -H "Authorization: Bearer $TOKEN"
```

**Test Pagination:**
```bash
# Page 1
curl -X GET "http://localhost:5000/api/claims?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Page 2
curl -X GET "http://localhost:5000/api/claims?page=2&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

**Test Filters:**
```bash
# Filter by status
curl -X GET "http://localhost:5000/api/claims?status=published" \
  -H "Authorization: Bearer $TOKEN"

# Filter by category
curl -X GET "http://localhost:5000/api/claims?category=politics" \
  -H "Authorization: Bearer $TOKEN"

# Multiple filters
curl -X GET "http://localhost:5000/api/claims?status=published&category=health&priority=high" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 8. Get Claim by ID

```bash
# Replace claim-uuid with actual UUID from previous response
curl -X GET http://localhost:5000/api/claims/claim-uuid \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "claim-uuid",
    "title": "Government announces new education policy",
    "description": "Complete description...",
    "category": "education",
    "status": "published",
    "verdict": {
      "verdict": "true",
      "explanation": "This claim has been verified...",
      "evidence_sources": ["source1", "source2"]
    }
  }
}
```

---

#### 9. Get Trending Claims

```bash
curl -X GET "http://localhost:5000/api/claims/trending?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 10. Update Claim Status (Fact Checkers/Admins Only)

```bash
curl -X POST http://localhost:5000/api/claims/claim-uuid/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "human_review",
    "priority": "high"
  }'
```

---

### Search Tests

#### 11. Search Claims

```bash
# Basic search
curl -X GET "http://localhost:5000/api/search/claims?q=election" \
  -H "Authorization: Bearer $TOKEN"

# Search with filters
curl -X GET "http://localhost:5000/api/search/claims?q=election&category=politics&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 12. Search Verdicts

```bash
curl -X GET "http://localhost:5000/api/search/verdicts?q=false+claim&verdict_type=false" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 13. Search Blogs

```bash
curl -X GET "http://localhost:5000/api/search/blogs?q=fact+checking" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 14. Get Search Suggestions

```bash
curl -X GET "http://localhost:5000/api/search/suggestions?q=ele" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "suggestions": [
    "election results",
    "election fraud",
    "election verification"
  ]
}
```

---

### User Tests

#### 15. Get User Profile

```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 16. Update User Profile

```bash
curl -X PUT http://localhost:5000/api/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "phone": "+254798765432",
    "profile_picture": "https://example.com/new-avatar.jpg"
  }'
```

---

#### 17. Get My Claims

```bash
curl -X GET "http://localhost:5000/api/user/my-claims?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 18. Get Notifications

```bash
# All notifications
curl -X GET http://localhost:5000/api/user/notifications \
  -H "Authorization: Bearer $TOKEN"

# Unread only
curl -X GET "http://localhost:5000/api/user/notifications?unread_only=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 19. Mark Notification as Read

```bash
curl -X PUT http://localhost:5000/api/user/notifications/notification-uuid/read \
  -H "Authorization: Bearer $TOKEN"
```

---

### Fact Checker Dashboard Tests

**Note:** Requires fact_checker or admin role

#### 20. Get Claims for Review

```bash
# Get fact checker token first (login with fact_checker account)
export FC_TOKEN="fact_checker_token_here"

curl -X GET "http://localhost:5000/api/dashboard/fact-checker/claims?status=human_review&priority=high" \
  -H "Authorization: Bearer $FC_TOKEN"
```

---

#### 21. Assign Claim to Self

```bash
curl -X POST http://localhost:5000/api/dashboard/fact-checker/claims/claim-uuid/assign \
  -H "Authorization: Bearer $FC_TOKEN"
```

---

#### 22. Submit Verdict

```bash
curl -X POST http://localhost:5000/api/dashboard/fact-checker/verdicts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FC_TOKEN" \
  -d '{
    "claim_id": "claim-uuid",
    "verdict": "false",
    "explanation": "After thorough investigation, this claim has been determined to be false. Multiple credible sources contradict the assertion.",
    "evidence_sources": [
      "https://credible-source1.com/article",
      "https://government-site.gov/data"
    ],
    "time_spent": 1800
  }'
```

---

### Admin Dashboard Tests

**Note:** Requires admin role

#### 23. Get System Statistics

```bash
# Get admin token first
export ADMIN_TOKEN="admin_token_here"

curl -X GET http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

#### 24. Get Fact Checkers List

```bash
curl -X GET "http://localhost:5000/api/admin/fact-checkers?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

#### 25. Get Fact Checker Performance

```bash
curl -X GET http://localhost:5000/api/admin/fact-checkers/checker-uuid/performance \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

#### 26. Get Recent Activity

```bash
curl -X GET "http://localhost:5000/api/admin/recent-activity?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

#### 27. Get Registration Requests

```bash
curl -X GET "http://localhost:5000/api/admin/registration-requests?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

#### 28. Approve Registration

```bash
curl -X POST http://localhost:5000/api/admin/approve-registration/request-uuid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "role": "fact_checker",
    "notes": "Approved based on qualifications"
  }'
```

---

#### 29. Reject Registration

```bash
curl -X POST http://localhost:5000/api/admin/reject-registration/request-uuid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "reason": "Insufficient qualifications"
  }'
```

---

### File Upload Tests

#### 30. Upload Media File

```bash
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Expected Response (200):**
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

## 🧪 Automated Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/tests/unit/auth.test.js

# Watch mode
npm run test:watch
```

### Integration Tests

```bash
# Run integration tests
npm test -- src/tests/integration/

# Test specific endpoint
npm test -- src/tests/integration/claims.test.js
```

### Example Test File

Create `src/tests/integration/claims.test.js`:

```javascript
const request = require('supertest');
const app = require('../../app');

describe('Claims API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Login and get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'Test1234!'
      });
    
    authToken = loginRes.body.token;
    userId = loginRes.body.user.id;
  });

  test('POST /api/claims - Submit new claim', async () => {
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test claim',
        description: 'Test description',
        category: 'politics',
        media_type: 'text'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe('Test claim');
  });

  test('GET /api/claims - Get all claims', async () => {
    const res = await request(app)
      .get('/api/claims?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('GET /api/claims/:id - Get claim by ID', async () => {
    // First create a claim
    const createRes = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test claim for get',
        description: 'Test description',
        category: 'health',
        media_type: 'text'
      });

    const claimId = createRes.body.data.id;

    // Then retrieve it
    const res = await request(app)
      .get(`/api/claims/${claimId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(claimId);
  });

  test('GET /api/claims/trending - Get trending claims', async () => {
    const res = await request(app)
      .get('/api/claims/trending?limit=5')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
```

---

## 🚦 Load Testing

### Using Apache Bench

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test 1000 requests, 100 concurrent connections
ab -n 1000 -c 100 -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/claims

# With POST data
ab -n 100 -c 10 -p claim.json -T application/json \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/claims
```

### Using Artillery

```bash
# Install Artillery
npm install -g artillery

# Quick test
artillery quick --count 10 --num 1000 http://localhost:5000/api/claims
```

Create `artillery-config.yml`:

```yaml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  variables:
    token: "your_jwt_token_here"

scenarios:
  - name: "Get claims"
    flow:
      - get:
          url: "/api/claims?page=1&limit=20"
          headers:
            Authorization: "Bearer {{ token }}"
  
  - name: "Submit claim"
    flow:
      - post:
          url: "/api/claims"
          headers:
            Authorization: "Bearer {{ token }}"
            Content-Type: "application/json"
          json:
            title: "Load test claim"
            description: "Testing under load"
            category: "politics"
            media_type: "text"
```

Run load test:

```bash
artillery run artillery-config.yml
```

---

## 📊 Testing Checklist

### Pre-Deployment Testing

- [ ] All authentication endpoints work
- [ ] User registration and login successful
- [ ] Token refresh works correctly
- [ ] Claim submission and retrieval work
- [ ] Search functionality returns results
- [ ] Pagination works correctly
- [ ] Filtering works for all parameters
- [ ] File upload works (images, videos)
- [ ] Rate limiting is enforced
- [ ] Error responses are consistent
- [ ] CORS is configured correctly
- [ ] Database connections are stable
- [ ] Redis caching works
- [ ] Health check endpoint responds
- [ ] All migrations run successfully

### Security Testing

- [ ] JWT tokens expire correctly
- [ ] Invalid tokens are rejected
- [ ] Role-based access control works
- [ ] SQL injection protection works
- [ ] XSS protection is in place
- [ ] CSRF protection works
- [ ] Rate limiting prevents abuse
- [ ] Passwords are properly hashed
- [ ] Sensitive data is not logged

### Performance Testing

- [ ] API response times < 200ms
- [ ] Database queries < 50ms
- [ ] Can handle 100+ concurrent requests
- [ ] Memory usage is stable
- [ ] No memory leaks detected
- [ ] Load testing passed

---

## 🐛 Debugging Failed Tests

### Check Server Logs

```bash
# View real-time logs
tail -f logs/app.log

# Search for errors
grep ERROR logs/app.log

# Filter by date
grep "2025-01-15" logs/app.log | grep ERROR
```

### Database Debugging

```bash
# Connect to database
psql $DATABASE_URL

# Check table data
SELECT * FROM users LIMIT 10;
SELECT * FROM claims WHERE status = 'pending';

# Check indexes
\d claims

# Explain query performance
EXPLAIN ANALYZE SELECT * FROM claims WHERE category = 'politics';
```

### Common Test Failures

#### 1. 401 Unauthorized

**Cause:** Invalid or expired token

**Solution:**
```bash
# Get fresh token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Update TOKEN variable
export TOKEN="new_token_here"
```

#### 2. 404 Not Found

**Cause:** Wrong endpoint URL or resource doesn't exist

**Solution:**
```bash
# Verify endpoint exists
curl http://localhost:5000/api/test

# Check server is running
curl http://localhost:5000/health
```

#### 3. 500 Internal Server Error

**Cause:** Server error, check logs

**Solution:**
```bash
# Check server logs
tail -f logs/error.log

# Restart server
npm run dev
```

---

## 📞 Support

For testing issues:

- **Email**: testing@hakikisha.com
- **Documentation**: https://docs.hakikisha.com/testing
- **Bug Reports**: https://github.com/your-org/hakikisha-backend/issues
