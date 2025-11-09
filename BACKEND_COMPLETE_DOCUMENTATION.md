# Backend Complete Documentation

## Project Overview
Hakikisha Backend - A comprehensive fact-checking system with AI assistance, human verification, and notification management.

**Technology Stack:**
- Node.js + Express.js
- PostgreSQL database
- JWT authentication
- Redis caching
- AI integration (Poe API)
- Email service (Nodemailer)

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication System](#authentication-system)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Notification System](#notification-system)
6. [AI Integration](#ai-integration)
7. [Environment Setup](#environment-setup)
8. [Deployment](#deployment)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Directory Structure
```
src/
├── config/           # Configuration files
│   ├── database.js   # PostgreSQL connection
│   ├── redis.js      # Redis configuration
│   ├── ai-config.js  # AI service config
│   └── constants.js  # App constants
├── controllers/      # Route controllers
│   ├── authController.js
│   ├── claimController.js
│   ├── verdictController.js
│   ├── factCheckerController.js
│   ├── notificationController.js
│   └── userController.js
├── middleware/       # Express middleware
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── validationMiddleware.js
│   └── errorHandler.js
├── models/          # Data models
│   ├── User.js
│   ├── Claim.js
│   ├── Verdict.js
│   ├── AIVerdict.js
│   └── Notification.js
├── services/        # Business logic
│   ├── authService.js
│   ├── claimService.js
│   ├── verdictService.js
│   ├── aiService.js
│   ├── notificationService.js
│   └── emailService.js
├── routes/          # API routes
│   ├── authRoutes.js
│   ├── claimRoutes.js
│   ├── verdictRoutes.js
│   ├── factCheckerRoutes.js
│   └── notificationRoutes.js
└── utils/           # Utility functions
    ├── logger.js
    ├── validators.js
    └── helpers.js
```

### Key Components

#### 1. Database Layer (PostgreSQL)
- Schema: `hakikisha`
- Tables: users, claims, verdicts, ai_verdicts, notifications, user_points
- All timestamps in EAT (Africa/Nairobi timezone)

#### 2. Caching Layer (Redis)
- Session storage
- Rate limiting
- API response caching

#### 3. Authentication Layer
- JWT-based authentication
- 2FA support for admins
- Role-based access control (RBAC)

---

## Authentication System

### User Roles
- **user**: Regular users who submit claims
- **fact_checker**: Verified fact-checkers who review claims
- **admin**: System administrators

### Registration Flow

#### Endpoint: `POST /api/v1/auth/register`
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "phone": "+254712345678",
  "role": "user"
}
```

**Process:**
1. Validate email format and password strength
2. Check for existing email/username
3. Hash password with bcrypt (12 rounds)
4. Generate unique username if not provided
5. Store phone number in database
6. Initialize user points (20 points for registration)
7. Send welcome email
8. Return user data with JWT token

**Response:**
```json
{
  "success": true,
  "message": "Registration successful!",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "user",
    "registration_status": "approved",
    "is_verified": true
  }
}
```

### Login Flow

#### Endpoint: `POST /api/v1/auth/login`
```json
{
  "email": "user@example.com OR username",
  "password": "password123"
}
```

**Features:**
- ✅ Login with email OR username
- ✅ Case-insensitive email matching
- ✅ 2FA for admins
- ✅ Session tracking
- ✅ Daily login streak points

**Process:**
1. Accept email OR username for login
2. Query: `WHERE LOWER(email) = $1 OR username = $2`
3. Verify password with bcrypt
4. Check account status and approval
5. Generate JWT token (24h expiry)
6. Award daily login points
7. Create/update session
8. Return token and user data

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "user"
  }
}
```

### JWT Token Structure
```javascript
{
  userId: "uuid",
  email: "user@example.com",
  role: "user",
  iat: 1234567890,
  exp: 1234654290
}
```

### Protected Routes
All routes use `authMiddleware` which:
1. Extracts JWT from Authorization header
2. Verifies token signature
3. Checks user exists in database
4. Attaches user data to `req.user`

---

## Database Schema

### Users Table
```sql
CREATE TABLE hakikisha.users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),                    -- Phone number stored here
  role VARCHAR(50) DEFAULT 'user',
  is_verified BOOLEAN DEFAULT false,
  registration_status VARCHAR(50) DEFAULT 'pending',
  profile_picture TEXT,
  two_factor_enabled BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active',
  login_count INTEGER DEFAULT 0,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Claims Table
```sql
CREATE TABLE hakikisha.claims (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES hakikisha.users(id),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  media_url TEXT,
  media_type VARCHAR(50),
  ai_verdict_id UUID REFERENCES hakikisha.ai_verdicts(id),
  human_verdict_id UUID REFERENCES hakikisha.verdicts(id),
  assigned_fact_checker_id UUID REFERENCES hakikisha.users(id),
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'Africa/Nairobi',
  updated_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'Africa/Nairobi'
);
```

### Verdicts Table (Human Fact-Checker Verdicts)
```sql
CREATE TABLE hakikisha.verdicts (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES hakikisha.claims(id),
  fact_checker_id UUID REFERENCES hakikisha.users(id),
  verdict VARCHAR(50) NOT NULL,
  explanation TEXT NOT NULL,
  evidence_sources JSONB,
  time_spent INTEGER DEFAULT 0,
  is_final BOOLEAN DEFAULT false,
  approval_status VARCHAR(50) DEFAULT 'pending',
  based_on_ai_verdict BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'Africa/Nairobi',
  updated_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'Africa/Nairobi'
);
```

### AI Verdicts Table
```sql
CREATE TABLE hakikisha.ai_verdicts (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES hakikisha.claims(id),
  verdict VARCHAR(50) NOT NULL,
  explanation TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  evidence_sources JSONB,
  disclaimer TEXT,
  is_edited_by_human BOOLEAN DEFAULT false,
  edited_by_fact_checker_id UUID REFERENCES hakikisha.users(id),
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'Africa/Nairobi',
  updated_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'Africa/Nairobi'
);
```

### Notifications Table
```sql
CREATE TABLE hakikisha.notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES hakikisha.users(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  related_entity_type VARCHAR(100),
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'Africa/Nairobi'
);
```

### User Points Table
```sql
CREATE TABLE hakikisha.user_points (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES hakikisha.users(id),
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication Endpoints

#### Register User
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "myusername",
  "password": "password123",
  "phone": "+254712345678",
  "role": "user"
}
```

#### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com OR username",
  "password": "password123"
}
```

#### Verify 2FA
```
POST /api/v1/auth/verify-2fa
Content-Type: application/json

{
  "userId": "uuid",
  "code": "123456"
}
```

#### Forgot Password
```
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

### User Profile Endpoints

#### Get User Profile
```
GET /api/v1/user/profile
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "phone": "+254712345678",    // Phone number displayed here
    "role": "user",
    "profile_picture": "url",
    "points": 100,
    "current_streak": 5,
    "longest_streak": 10,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Profile
```
PUT /api/v1/user/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "newusername",
  "phone": "+254712345678"
}
```

### Claims Endpoints

#### Submit Claim
```
POST /api/v1/claims
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Claim title",
  "description": "Detailed description",
  "category": "health",
  "media_url": "https://example.com/image.jpg",
  "media_type": "image"
}
```

#### Get My Claims
```
GET /api/v1/claims/my-claims
Authorization: Bearer {token}

Response:
{
  "success": true,
  "claims": [
    {
      "id": "uuid",
      "title": "Claim title",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00+03:00",  // EAT timezone
      "verdict": null
    }
  ]
}
```

#### Get Trending Claims
```
GET /api/v1/claims/trending?limit=20
```

### Fact Checker Endpoints

#### Get Pending Claims
```
GET /api/v1/fact-checker/pending-claims
Authorization: Bearer {token}
Role: fact_checker, admin

Response:
{
  "success": true,
  "claims": [
    {
      "id": "uuid",
      "title": "Claim title",
      "description": "Description",
      "submittedBy": "user@example.com",
      "submittedDate": "2024-01-01T12:00:00+03:00",  // EAT timezone
      "ai_suggestion": {
        "verdict": "false",
        "explanation": "AI explanation",
        "confidence": 0.85
      }
    }
  ]
}
```

#### Submit Verdict
```
POST /api/v1/fact-checker/submit-verdict
Authorization: Bearer {token}
Role: fact_checker, admin
Content-Type: application/json

{
  "claimId": "uuid",
  "verdict": "true",
  "explanation": "Detailed explanation",
  "sources": ["source1", "source2"],
  "time_spent": 300
}
```

#### Get Fact Checker Stats
```
GET /api/v1/fact-checker/stats
Authorization: Bearer {token}
Role: fact_checker, admin

Response:
{
  "success": true,
  "stats": {
    "totalVerified": 50,
    "pendingReview": 10,
    "timeSpent": "45 minutes avg",
    "accuracy": "92%"
  }
}
```

### Notification Endpoints

#### Get Unread Verdicts (Human Only)
```
GET /api/v1/notifications/unread-verdicts
Authorization: Bearer {token}

Response:
{
  "success": true,
  "verdicts": [
    {
      "notification_id": "uuid",
      "claimId": "uuid",
      "claimTitle": "Claim title",
      "verdict": "true",
      "explanation": "Explanation",
      "factCheckerName": "checker_username",
      "createdAt": "2024-01-01T12:00:00+03:00"
    }
  ],
  "count": 5
}
```

**IMPORTANT:** This endpoint now only returns verdicts from HUMAN fact checkers, not AI verdicts.

#### Get Unread Verdict Count
```
GET /api/v1/notifications/unread-verdicts/count
Authorization: Bearer {token}

Response:
{
  "success": true,
  "count": 5
}
```

#### Mark Verdict as Read
```
POST /api/v1/notifications/verdicts/{verdictId}/read
Authorization: Bearer {token}
```

#### Mark All Verdicts as Read
```
POST /api/v1/notifications/verdicts/read-all
Authorization: Bearer {token}
```

---

## Notification System

### Overview
**In-App Notifications ONLY - Email Sending Disabled**

The notification system now exclusively uses in-app notifications. Email notifications have been completely disabled to reduce server load and improve user experience.

### Notification Types
1. **verdict_ready** - When a human fact-checker completes a verdict
2. **claim_assigned** - When a claim is assigned to a fact-checker
3. **system_alert** - System-wide announcements

### Implementation

#### Creating Notifications
```javascript
const notificationService = require('../services/notificationService');

await notificationService.createNotification({
  user_id: userId,
  type: 'verdict_ready',
  title: 'Claim Verification Complete',
  message: 'Your claim has been verified',
  related_entity_type: 'claim',
  related_entity_id: claimId
});
```

#### Email Functionality
The `maybeSendEmailNotification` method has been disabled:
```javascript
async maybeSendEmailNotification(notification) {
  // DISABLED: In-app notifications only
  logger.debug('Email notifications disabled - using in-app only');
  return;
}
```

### Notification Badge
Display unread count from:
```javascript
GET /api/v1/notifications/unread-verdicts/count
```

Shows only unread verdicts from HUMAN fact-checkers (not AI).

---

## AI Integration

### AI Service Configuration
- Provider: Poe API
- Models: GPT-4, Claude, etc.
- Rate limiting: Configurable per model

### AI Verdict Flow
1. User submits claim
2. Claim status → 'ai_processing'
3. AI analyzes claim
4. AI verdict stored in `ai_verdicts` table
5. Claim status → 'human_review'
6. Fact checker can review/edit AI verdict

### AI Verdict Editing
Fact checkers can:
- Accept AI verdict as-is
- Modify AI explanation
- Override AI verdict
- Add human sources

When edited:
- `is_edited_by_human` → true
- `edited_by_fact_checker_id` → fact checker ID
- `edited_at` → timestamp

---

## Environment Setup

### Required Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hakikisha
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (Optional - Email sending disabled)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_password

# AI Service
POE_API_KEY=your_poe_api_key
AI_MODEL=gpt-4

# Server
PORT=3000
NODE_ENV=production
```

### Installation Steps
```bash
# 1. Install dependencies
npm install

# 2. Set up PostgreSQL database
psql -U postgres -c "CREATE DATABASE hakikisha;"

# 3. Run migrations
npm run migrate

# 4. Seed initial data (optional)
npm run seed

# 5. Start Redis
redis-server

# 6. Start server
npm start
```

---

## Deployment

### Build Script Issue
⚠️ **IMPORTANT**: The project is missing a `build:dev` script in package.json.

**Required Action:**
Add this script to your `package.json`:
```json
{
  "scripts": {
    "build:dev": "vite build --mode development"
  }
}
```

### Production Deployment

#### 1. Database Setup
```sql
-- Create schema
CREATE SCHEMA IF NOT EXISTS hakikisha;

-- Run all migrations in order
-- See migrations/ folder
```

#### 2. Environment Configuration
- Set all environment variables
- Use strong JWT_SECRET
- Configure production database
- Set up Redis instance

#### 3. Server Configuration
```bash
# Install PM2 for process management
npm install -g pm2

# Start server with PM2
pm2 start server.js --name hakikisha-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to restart on system reboot
pm2 startup
```

#### 4. Nginx Configuration
```nginx
server {
    listen 80;
    server_name api.hakikisha.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. SSL Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.hakikisha.com
```

---

## Testing

### Test Environment Setup
```bash
# Create test database
createdb hakikisha_test

# Set test environment
export NODE_ENV=test
export DB_NAME=hakikisha_test

# Run tests
npm test
```

### Test Coverage
- Unit tests for services
- Integration tests for APIs
- End-to-end tests for workflows

### Key Test Cases

#### Authentication Tests
- ✅ Register with email
- ✅ Register with username
- ✅ Login with email
- ✅ Login with username
- ✅ Login with email (case-insensitive)
- ✅ 2FA flow for admins
- ✅ Password reset flow

#### Notification Tests
- ✅ Create notification
- ✅ Mark as read
- ✅ Count unread (human verdicts only)
- ✅ Email sending disabled
- ✅ In-app notifications working

#### Verdict Tests
- ✅ Submit human verdict
- ✅ AI verdict generation
- ✅ Edit AI verdict
- ✅ Notification on verdict complete

---

## Troubleshooting

### Common Issues

#### 1. Login Not Working with Username
**Problem:** Users can't login with username
**Solution:** Already fixed! Login now accepts email OR username:
```javascript
WHERE LOWER(email) = $1 OR username = $2
```

#### 2. Phone Numbers Not Showing in Profile
**Problem:** Phone numbers not displayed in user profile
**Solution:** Already fixed! Profile endpoint now includes phone:
```javascript
phone: user.phone,
phone_number: user.phone
```

#### 3. Incorrect Time Display
**Problem:** Times showing as 3 AM or "now" instead of actual time
**Solution:** Already fixed! All timestamps now use EAT (Africa/Nairobi timezone):
```sql
created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'Africa/Nairobi'
```

#### 4. Email Notification Errors
**Problem:** `emailService.sendNotificationEmail is not a function`
**Solution:** Already fixed! Email sending completely disabled:
```javascript
async maybeSendEmailNotification(notification) {
  logger.debug('Email notifications disabled - using in-app only');
  return;
}
```

#### 5. Notification Badge Showing AI Verdicts
**Problem:** Notification count includes AI verdicts
**Solution:** Already fixed! Query now filters for human verdicts only:
```sql
WHERE c.human_verdict_id IS NOT NULL
```

### Database Connection Issues
```javascript
// Check connection
const testConnection = async () => {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
};
```

### Redis Connection Issues
```javascript
// Check Redis connection
const redis = require('./config/redis');
redis.ping((err, result) => {
  if (err) console.error('Redis connection failed:', err);
  else console.log('Redis connected:', result);
});
```

---

## Best Practices

### Security
1. **Never commit secrets** - Use environment variables
2. **Hash passwords** - Use bcrypt with 12 rounds minimum
3. **Validate input** - Sanitize all user input
4. **Use HTTPS** - Always in production
5. **Rate limiting** - Prevent abuse
6. **SQL injection prevention** - Use parameterized queries

### Performance
1. **Database indexing** - Index frequently queried columns
2. **Caching** - Use Redis for frequently accessed data
3. **Connection pooling** - Reuse database connections
4. **Pagination** - Limit query results
5. **Background jobs** - Use queues for heavy tasks

### Code Quality
1. **Error handling** - Try-catch all async operations
2. **Logging** - Use Winston for structured logging
3. **Code comments** - Document complex logic
4. **Consistent formatting** - Use ESLint/Prettier
5. **Version control** - Meaningful commit messages

---

## API Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Error Codes
- `VALIDATION_ERROR` - Invalid input
- `AUTH_INVALID` - Authentication failed
- `NOT_FOUND` - Resource not found
- `SERVER_ERROR` - Internal server error
- `FORBIDDEN` - Insufficient permissions
- `USER_EXISTS` - Email/username already registered

---

## Database Maintenance

### Backup Commands
```bash
# Backup database
pg_dump -U postgres hakikisha > backup_$(date +%Y%m%d).sql

# Restore database
psql -U postgres hakikisha < backup_20240101.sql
```

### Cleanup Old Data
```sql
-- Delete old notifications (older than 90 days)
DELETE FROM hakikisha.notifications 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete old sessions
DELETE FROM hakikisha.user_sessions 
WHERE expires_at < NOW();
```

---

## Monitoring

### Health Check Endpoint
```
GET /api/v1/health

Response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "uptime": 123456
}
```

### Logging
- All errors logged to `logs/error.log`
- All requests logged to `logs/combined.log`
- Use Winston for structured logging

---

## Support & Contact

For backend issues, check:
1. Server logs: `logs/error.log`
2. Database logs: PostgreSQL logs
3. Redis logs: Redis server logs

Common log locations:
- `/var/log/postgresql/`
- `/var/log/redis/`
- `./logs/` (application logs)

---

## Changelog

### Version 1.2.0 (Current)
- ✅ Fixed login with username/email
- ✅ Added phone number display in profile
- ✅ Fixed timezone issues (EAT)
- ✅ Disabled email notifications
- ✅ Notifications now show only human verdicts
- ✅ Improved error handling

### Version 1.1.0
- Added AI verdict editing
- Implemented notification system
- Added points system
- Improved authentication

### Version 1.0.0
- Initial release
- Basic authentication
- Claims and verdicts
- AI integration

---

**Documentation Last Updated:** January 2024
**Backend Version:** 1.2.0
**Database Schema Version:** 024
