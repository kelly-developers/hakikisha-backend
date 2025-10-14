# HAKIKISHA Database Setup Guide

## PostgreSQL Database Configuration for 5 Million Users

### Prerequisites
- PostgreSQL 14+ installed
- Database admin access
- Command line access

---

## 1. Database Creation

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE hakikisha_prod;

# Create dedicated user
CREATE USER hakikisha_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hakikisha_prod TO hakikisha_user;

# Connect to database
\c hakikisha_prod

# Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For performance
```

---

## 2. Run Migrations

The backend includes all necessary migrations. Run them in order:

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=hakikisha_prod
export DB_USER=hakikisha_user
export DB_PASSWORD=your_secure_password_here

# Run migrations
node migrations/001_create_users_table.js
node migrations/002_create_claims_table.js
node migrations/003_create_verdicts_table.js
node migrations/004_create_fact_checkers_table.js
node migrations/005_create_blogs_table.js
node migrations/006_create_notifications_table.js
node migrations/007_create_ai_verdicts_table.js
node migrations/008_create_admin_activities_table.js
node migrations/009_create_fact_checker_activities_table.js
node migrations/010_create_trending_topics_table.js
node migrations/011_create_blog_articles_table.js
node migrations/012_create_search_logs_table.js
node migrations/013_create_user_sessions_table.js
node migrations/014_create_registration_requests_table.js
node migrations/015_add_2fa_and_points.js
```

---

## 3. Database Schema Overview

### Core Tables

#### **users** - All users (admin, fact_checker, user)
- `id` (UUID, Primary Key)
- `email` (Unique, Indexed)
- `password_hash` (Bcrypt hashed)
- `username` (Unique, for login)
- `phone` (Optional)
- `role` (user, fact_checker, admin)
- `two_factor_enabled` (Boolean, for admin/fact_checker)
- `two_factor_secret` (Encrypted)
- `two_factor_backup_codes` (Array)
- `is_verified` (Email verification)
- `registration_status` (pending, approved, rejected)

#### **user_points** - Points & Streak Tracking
- `user_id` (References users)
- `total_points` (Integer, resets if inactive)
- `current_streak_days` (Consecutive active days)
- `longest_streak_days` (Best streak)
- `last_activity_date` (Last engagement)
- **Points reset to 0 if user skips a day**

#### **points_history** - Audit Trail
- `user_id`
- `points_awarded` (Can be negative for resets)
- `action_type` (CLAIM_SUBMISSION, DAILY_LOGIN, etc.)
- `description`
- `created_at`

#### **claims** - User-submitted claims
- `id` (UUID)
- `user_id` (Who submitted)
- `title` (Max 500 chars)
- `description` (Full claim text)
- `category` (politics, health, education, etc.)
- `media_type` (text, image, video, link)
- `media_url` (Video link, image URL, source URL)
- `status` (pending → ai_processing → human_review → published)
- `ai_verdict_id` (References AI verdict)
- `human_verdict_id` (Final fact-checker verdict)
- `assigned_fact_checker_id` (Who's reviewing)
- `is_trending` (Boolean)
- `trending_score` (Float)

#### **verdicts** - Human fact-checker responses
- `id` (UUID)
- `claim_id`
- `fact_checker_id`
- `verdict` (true, false, misleading, needs_context, satire)
- `verdict_text` (Detailed explanation)
- `sources` (Array of URLs)
- `confidence_score` (0-1)
- `is_published` (Admin/FC approved)
- `edited_from_ai` (Boolean, if based on AI)

#### **ai_verdicts** - AI-generated verdicts
- `id` (UUID)
- `claim_id`
- `verdict` (true, false, misleading, etc.)
- `verdict_text` (AI explanation)
- `sources` (AI-found sources)
- `confidence_score` (0-1)
- `processing_time_ms`
- `approved_by_fact_checker` (Boolean)
- `edited_by_fact_checker_id` (Who reviewed)

---

## 4. Performance Optimization for 5M Users

### Indexes Created

```sql
-- User authentication (fast login)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Claims filtering
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_category ON claims(category);
CREATE INDEX idx_claims_created_at ON claims(created_at);
CREATE INDEX idx_claims_trending ON claims(is_trending, trending_score);

-- Verdicts lookups
CREATE INDEX idx_verdicts_claim_id ON verdicts(claim_id);
CREATE INDEX idx_verdicts_fact_checker_id ON verdicts(fact_checker_id);

-- Points leaderboard
CREATE INDEX idx_user_points_total ON user_points(total_points DESC);
CREATE INDEX idx_user_points_streak ON user_points(current_streak_days DESC);

-- Full-text search
CREATE INDEX idx_claims_search ON claims USING gin(to_tsvector('english', title || ' ' || description));
```

### Connection Pooling

Configure in `src/config/database.ts`:
```typescript
pool: {
  min: 10,          // Minimum connections
  max: 100,         // Maximum connections (scale based on load)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
}
```

---

## 5. Create First Admin Account

Run this script to create the initial admin:

```bash
node src/scripts/createAdmin.js
```

Or manually:

```sql
INSERT INTO users (id, email, password_hash, username, role, is_verified, registration_status, created_at)
VALUES (
  gen_random_uuid(),
  'admin@hakikisha.com',
  -- Password: Admin@123 (CHANGE THIS!)
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'admin',
  true,
  'approved',
  NOW()
);
```

**⚠️ CHANGE THE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!**

---

## 6. Database Backup Strategy

### Daily Backups
```bash
# Create backup script: /scripts/backup-db.sh
#!/bin/bash
BACKUP_DIR="/backups/hakikisha"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="hakikisha_$DATE.sql"

pg_dump -U hakikisha_user -h localhost hakikisha_prod > $BACKUP_DIR/$FILENAME
gzip $BACKUP_DIR/$FILENAME

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Setup Cron Job
```bash
crontab -e
# Add: Daily backup at 2 AM
0 2 * * * /scripts/backup-db.sh
```

---

## 7. Production Optimizations

### PostgreSQL Configuration (postgresql.conf)

```ini
# For 5M users on AWS RDS db.r5.2xlarge (64GB RAM)

# Memory
shared_buffers = 16GB
effective_cache_size = 48GB
maintenance_work_mem = 2GB
work_mem = 32MB

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Query Planning
random_page_cost = 1.1  # SSD
effective_io_concurrency = 200

# Connections
max_connections = 500
```

---

## 8. Monitoring & Maintenance

### Weekly Maintenance
```sql
-- Vacuum and analyze (run during low traffic)
VACUUM ANALYZE users;
VACUUM ANALYZE claims;
VACUUM ANALYZE verdicts;
VACUUM ANALYZE user_points;

-- Reindex if needed
REINDEX TABLE claims;
```

### Query Performance Monitoring
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 20;
```

---

## 9. Test Database Connection

```bash
# Test from backend
npm run test:db

# Manual test
psql -h localhost -U hakikisha_user -d hakikisha_prod -c "SELECT COUNT(*) FROM users;"
```

---

## 10. Scaling Strategy

### Read Replicas (for 5M users)
- **Primary**: Handle writes (claims, verdicts, registrations)
- **Read Replica 1**: User queries (search, browsing)
- **Read Replica 2**: Analytics & reporting
- **Read Replica 3**: Admin dashboard

### Sharding (Future, 50M+ users)
- Shard by user_id range
- Separate claim databases by date/region

---

## Environment Variables

Add to your `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hakikisha_prod
DB_USER=hakikisha_user
DB_PASSWORD=your_secure_password
DB_SCHEMA=public

# Connection Pool
DB_POOL_MIN=10
DB_POOL_MAX=100

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily 2 AM
BACKUP_RETENTION_DAYS=30
```

---

## Troubleshooting

### Can't connect?
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check if port is open
sudo netstat -plnt | grep 5432

# Check logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Slow queries?
```sql
-- Find table bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum if needed
VACUUM FULL ANALYZE claims;
```

### Out of connections?
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '1 hour';
```

---

## ✅ Verification Checklist

- [ ] PostgreSQL 14+ installed
- [ ] Database created
- [ ] All 15 migrations run successfully
- [ ] Indexes created
- [ ] First admin account created
- [ ] Connection pooling configured
- [ ] Backup script setup
- [ ] Backend connects successfully
- [ ] Test queries running fast

---

**Next Steps**: See `docs/API_COMPLETE.md` for API documentation
