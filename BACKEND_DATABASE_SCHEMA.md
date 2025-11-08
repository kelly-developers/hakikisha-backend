# Backend Database Schema & Workflow Documentation

## Overview
This document provides comprehensive documentation for the Hakikisha backend database schema, workflow processes, and claim status management for a scalable 5-million-user system.

---

## Table of Contents
1. [Database Schema](#database-schema)
2. [Claim Status Workflow](#claim-status-workflow)
3. [Notifications System](#notifications-system)
4. [Fact Checker Workflow](#fact-checker-workflow)
5. [Migration Guide](#migration-guide)

---

## 1. Database Schema

### Core Tables

#### **users**
Stores all user accounts including regular users, fact checkers, and admins.

```sql
CREATE TABLE hakikisha.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'fact_checker', 'admin'
  is_verified BOOLEAN DEFAULT false,
  registration_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  profile_picture TEXT,
  points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

CREATE INDEX idx_users_email ON hakikisha.users(email);
CREATE INDEX idx_users_role ON hakikisha.users(role);
CREATE INDEX idx_users_registration_status ON hakikisha.users(registration_status);
```

#### **claims**
Stores user-submitted claims for fact-checking.

```sql
CREATE TABLE hakikisha.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'politics', 'health', 'technology', 'business', 'entertainment', 'other'
  status VARCHAR(50) DEFAULT 'pending', -- See Claim Status Workflow below
  priority INTEGER DEFAULT 0,
  media_url TEXT,
  media_type VARCHAR(50), -- 'image', 'video', 'audio', 'document'
  ai_verdict_id UUID REFERENCES hakikisha.ai_verdicts(id),
  human_verdict_id UUID REFERENCES hakikisha.verdicts(id),
  assigned_fact_checker_id UUID REFERENCES hakikisha.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

CREATE INDEX idx_claims_user_id ON hakikisha.claims(user_id);
CREATE INDEX idx_claims_status ON hakikisha.claims(status);
CREATE INDEX idx_claims_category ON hakikisha.claims(category);
CREATE INDEX idx_claims_priority ON hakikisha.claims(priority DESC);
CREATE INDEX idx_claims_created_at ON hakikisha.claims(created_at DESC);
```

#### **ai_verdicts**
Stores AI-generated verdicts for claims.

```sql
CREATE TABLE hakikisha.ai_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID UNIQUE REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
  verdict VARCHAR(50) NOT NULL, -- 'true', 'false', 'misleading', 'needs_context', 'unverifiable'
  explanation TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
  evidence_sources JSONB, -- Array of source objects: [{url, title, excerpt}]
  disclaimer TEXT,
  is_edited_by_human BOOLEAN DEFAULT false,
  edited_by_fact_checker_id UUID REFERENCES hakikisha.users(id),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

CREATE INDEX idx_ai_verdicts_claim_id ON hakikisha.ai_verdicts(claim_id);
CREATE INDEX idx_ai_verdicts_verdict ON hakikisha.ai_verdicts(verdict);
CREATE INDEX idx_ai_verdicts_confidence ON hakikisha.ai_verdicts(confidence_score);
CREATE INDEX idx_ai_verdicts_edited ON hakikisha.ai_verdicts(is_edited_by_human);
```

#### **verdicts**
Stores human fact-checker verdicts (final verdicts).

```sql
CREATE TABLE hakikisha.verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
  fact_checker_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
  verdict VARCHAR(50) NOT NULL, -- 'true', 'false', 'misleading', 'needs_context', 'unverifiable'
  explanation TEXT NOT NULL,
  evidence_sources JSONB, -- Array of source objects
  time_spent INTEGER DEFAULT 0, -- Time in seconds
  ai_verdict_id UUID REFERENCES hakikisha.ai_verdicts(id),
  is_final BOOLEAN DEFAULT true,
  approval_status VARCHAR(50) DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
  responsibility VARCHAR(50) DEFAULT 'creco', -- 'creco' (human), 'ai', 'hybrid'
  based_on_ai_verdict BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

CREATE INDEX idx_verdicts_claim_id ON hakikisha.verdicts(claim_id);
CREATE INDEX idx_verdicts_fact_checker_id ON hakikisha.verdicts(fact_checker_id);
CREATE INDEX idx_verdicts_verdict ON hakikisha.verdicts(verdict);
CREATE INDEX idx_verdicts_created_at ON hakikisha.verdicts(created_at DESC);
```

#### **notifications**
Stores user notifications for verdict updates and system events.

```sql
CREATE TABLE hakikisha.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'verdict_ready', 'claim_assigned', 'system_alert', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  related_entity_type VARCHAR(50), -- 'claim', 'verdict', 'blog', etc.
  related_entity_id TEXT, -- UUID stored as text for flexibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

CREATE INDEX idx_notifications_user_id ON hakikisha.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON hakikisha.notifications(is_read);
CREATE INDEX idx_notifications_type ON hakikisha.notifications(type);
CREATE INDEX idx_notifications_created_at ON hakikisha.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_type_read ON hakikisha.notifications(user_id, type, is_read);
```

#### **blog_articles**
Stores blog articles written by fact checkers about verified claims.

```sql
CREATE TABLE hakikisha.blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES hakikisha.users(id),
  claim_id UUID REFERENCES hakikisha.claims(id),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  views INTEGER DEFAULT 0,
  tags TEXT[], -- Array of tags
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

CREATE INDEX idx_blogs_author_id ON hakikisha.blog_articles(author_id);
CREATE INDEX idx_blogs_claim_id ON hakikisha.blog_articles(claim_id);
CREATE INDEX idx_blogs_status ON hakikisha.blog_articles(status);
CREATE INDEX idx_blogs_published_at ON hakikisha.blog_articles(published_at DESC);
```

#### **fact_checker_activities**
Tracks fact checker work activities for performance monitoring.

```sql
CREATE TABLE hakikisha.fact_checker_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_checker_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'verdict_submission', 'ai_verdict_edit', 'blog_creation'
  claim_id UUID REFERENCES hakikisha.claims(id),
  verdict_id UUID REFERENCES hakikisha.verdicts(id),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- Duration in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

CREATE INDEX idx_fc_activities_fact_checker_id ON hakikisha.fact_checker_activities(fact_checker_id);
CREATE INDEX idx_fc_activities_activity_type ON hakikisha.fact_checker_activities(activity_type);
CREATE INDEX idx_fc_activities_created_at ON hakikisha.fact_checker_activities(created_at DESC);
```

---

## 2. Claim Status Workflow

### Status Values and Transitions

```
USER SUBMITS CLAIM
      ↓
[pending] → User has just submitted a claim
      ↓
      ↓ (AI Processing starts)
      ↓
[ai_processing] → AI is analyzing the claim
      ↓
      ↓ (Two possible outcomes)
      ↓
      ├─→ [completed] → AI successfully generated verdict
      │        ↓
      │        ↓ (Fact checker can review)
      │        ↓
      │        ├─→ [human_review] → Fact checker is reviewing AI verdict
      │        │        ↓
      │        │        ↓
      │        └─→ [human_approved] → Fact checker approved/edited AI verdict
      │
      └─→ [ai_processing_failed] → AI processing failed
               ↓
               ↓ (Requires fact checker manual review)
               ↓
          [human_review] → Fact checker manually reviewing
               ↓
               ↓
          [human_approved] → Fact checker submitted verdict
```

### Status Descriptions

| Status | Description | Who Can See It |
|--------|-------------|----------------|
| `pending` | Claim just submitted, waiting for AI processing | Admin only |
| `ai_processing` | AI is currently analyzing the claim | Admin only |
| `ai_processing_failed` | AI analysis failed, needs manual fact-check | Fact Checker, Admin |
| `completed` | AI verdict generated successfully | Fact Checker, Admin, User |
| `human_review` | Fact checker is reviewing (with or without AI verdict) | Fact Checker, Admin |
| `human_approved` | Final verdict submitted by fact checker | All Users |

### Fact Checker Query Filters

**Pending Claims** (claims needing attention):
```sql
WHERE c.status IN ('pending', 'ai_processing', 'ai_processing_failed', 'human_review', 'completed')
```

**AI Suggestions** (AI verdicts ready for review/approval):
```sql
WHERE c.status IN ('completed', 'ai_processing_failed', 'human_review')
  AND c.human_verdict_id IS NULL
```

---

## 3. Notifications System

### Notification Types

| Type | Description | Triggered When |
|------|-------------|----------------|
| `verdict_ready` | User's claim has received a verdict | Fact checker submits verdict OR approves AI verdict |
| `claim_assigned` | Claim assigned to fact checker | Admin assigns claim |
| `system_alert` | Important system notifications | Admin broadcasts message |
| `blog_published` | Fact checker's blog article published | Blog status changes to 'published' |

### Creating Notifications

**When Fact Checker Submits Verdict:**
```javascript
const notificationService = require('../services/notificationService');

// After verdict is created and claim is updated
await notificationService.sendVerdictReadyNotification(
  { id: claimId, user_id: userId, title: claimTitle },
  { verdict: verdictValue }
);
```

**Backend Implementation** (`notificationService.js`):
```javascript
async sendVerdictReadyNotification(claim, verdict) {
  const notification = {
    user_id: claim.user_id,
    type: 'verdict_ready',
    title: 'Verdict Ready for Your Claim',
    message: `The claim "${claim.title}" has been fact-checked. Verdict: ${verdict.verdict}`,
    related_entity_type: 'claim',
    related_entity_id: claim.id
  };
  
  await db.query(
    `INSERT INTO hakikisha.notifications 
     (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() AT TIME ZONE 'Africa/Nairobi')`,
    [uuidv4(), notification.user_id, notification.type, notification.title, 
     notification.message, notification.related_entity_type, notification.related_entity_id]
  );
}
```

---

## 4. Fact Checker Workflow

### Endpoints for Fact Checkers

#### **GET /api/v1/fact-checker/pending-claims**
Returns all claims that need fact-checker attention.

**Response:**
```json
{
  "success": true,
  "claims": [
    {
      "id": "uuid",
      "title": "Claim title",
      "description": "Claim description",
      "category": "politics",
      "submittedBy": "user@email.com",
      "submittedDate": "2024-01-15",
      "imageUrl": "https://...",
      "ai_suggestion": {
        "verdict": "false",
        "explanation": "AI explanation...",
        "confidence": 0.85,
        "sources": [...],
        "disclaimer": "AI-generated verdict",
        "isEdited": false
      }
    }
  ]
}
```

#### **GET /api/v1/fact-checker/ai-suggestions**
Returns claims with AI verdicts ready for review.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` ('all', 'edited', 'unedited')

#### **POST /api/v1/fact-checker/submit-verdict**
Submit a new human verdict for a claim.

**Request Body:**
```json
{
  "claimId": "uuid",
  "verdict": "false",
  "explanation": "Detailed fact-check explanation...",
  "sources": [
    {
      "url": "https://source.com",
      "title": "Source Title",
      "excerpt": "Relevant excerpt..."
    }
  ],
  "time_spent": 600
}
```

**Valid Verdicts:** `'true'`, `'false'`, `'misleading'`, `'needs_context'`, `'unverifiable'`

#### **PUT /api/v1/fact-checker/ai-verdicts/:claimId**
Edit an existing AI verdict.

**Request Body:**
```json
{
  "verdict": "misleading",
  "explanation": "Updated explanation...",
  "confidence_score": 0.90,
  "evidence_sources": [...]
}
```

#### **POST /api/v1/fact-checker/approve-ai-verdict/:claimId**
Approve or edit an AI verdict.

**Request Body:**
```json
{
  "approved": true,
  "editedVerdict": "false",  // Optional
  "editedExplanation": "...", // Optional
  "additionalSources": [...]   // Optional
}
```

---

## 5. Migration Guide

### Running Migrations

All migrations are located in the `/migrations` directory and should be run in numerical order.

#### **Critical Migration: notifications table**

**File:** `migrations/024_ensure_notifications_table.sql`

This migration creates the notifications table if it doesn't exist. It's **idempotent** and safe to run multiple times.

```sql
-- Run this migration
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f migrations/024_ensure_notifications_table.sql
```

#### **Complete Migration Order**

```bash
# Run all migrations in order
for file in migrations/*.sql migrations/*.js; do
  echo "Running migration: $file"
  if [[ $file == *.sql ]]; then
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $file
  else
    node $file
  fi
done
```

### Environment Variables Required

```bash
# Database Configuration
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=hakikisha_db
DB_USER=hakikisha_user
DB_PASSWORD=your-secure-password
DB_SCHEMA=hakikisha

# JWT Secret
JWT_SECRET=your-jwt-secret-key

# Server Config
PORT=3000
NODE_ENV=production

# AWS/Redis (for scaling to 5M users)
REDIS_URL=redis://your-redis-url
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
```

---

## Performance Optimization for 5M Users

### Database Indexes
All critical tables have indexes on:
- Foreign keys (user_id, claim_id, etc.)
- Status columns (claim status, verdict status)
- Timestamps (created_at, updated_at)
- Composite indexes for common query patterns

### Connection Pooling
Configure PostgreSQL connection pool:
```javascript
{
  max: 100,           // Maximum pool size
  min: 10,            // Minimum connections
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000
}
```

### Caching Strategy
- Use Redis for:
  - User session data
  - Frequently accessed claims
  - Verdict counts and stats
  - Notification counts
- Cache TTL: 5-15 minutes for most data

### Query Optimization
- Always use schema prefix: `hakikisha.table_name`
- Limit result sets (default: 20-50 items)
- Use pagination for large datasets
- Avoid `SELECT *` - specify columns
- Use prepared statements with parameters

### Monitoring
- Track slow queries (>1000ms)
- Monitor connection pool stats
- Log all database errors
- Set up alerts for:
  - High connection pool usage (>80%)
  - Slow query warnings
  - Failed migrations

---

## Troubleshooting

### Common Issues

**1. "relation hakikisha.notifications does not exist"**
- **Solution:** Run migration `024_ensure_notifications_table.sql`

**2. Fact checker sees 0 pending claims**
- **Check:** Claim status in database
- **Valid statuses for fact checkers:** `pending`, `ai_processing`, `ai_processing_failed`, `human_review`, `completed`

**3. Notifications not being created**
- **Check:** Notification service is called after verdict submission
- **Check:** Schema prefix `hakikisha.` is used in all queries

**4. AI verdicts not appearing**
- **Check:** `ai_verdict_id` is linked in claims table
- **Check:** Claim status is `completed` or `ai_processing_failed`

---

## API Testing

### Test Fact Checker Flow

```bash
# 1. Login as fact checker
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "factchecker@example.com",
    "password": "password123"
  }'

# 2. Get pending claims
curl http://localhost:3000/api/v1/fact-checker/pending-claims \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Submit verdict
curl -X POST http://localhost:3000/api/v1/fact-checker/submit-verdict \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "claimId": "claim-uuid",
    "verdict": "false",
    "explanation": "This claim is false because...",
    "sources": [],
    "time_spent": 300
  }'
```

---

## Summary

This documentation covers:
- ✅ Complete database schema for all tables
- ✅ Claim status workflow and transitions
- ✅ Notifications system implementation
- ✅ Fact checker endpoints and workflow
- ✅ Migration guide and troubleshooting
- ✅ Performance optimization for 5M users
- ✅ API testing examples

**Next Steps:**
1. Run all database migrations
2. Set up environment variables
3. Configure connection pooling
4. Set up Redis caching
5. Deploy backend to AWS
6. Monitor and optimize queries
