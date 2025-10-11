# HAKIKISHA Backend - Setup & Deployment Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Production Deployment on Render](#production-deployment-on-render)
7. [Scaling for 5M Users](#scaling-for-5m-users)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

Before starting, ensure you have:

- **Node.js** v18.0.0 or higher
- **PostgreSQL** 14 or higher
- **Redis** 6 or higher (for caching and rate limiting)
- **Git** for version control
- **npm** or **yarn** package manager

### System Requirements (for 5M users)

**Minimum Production Setup:**
- 4 CPU cores
- 8GB RAM
- 100GB SSD storage
- 1Gbps network

**Recommended Production Setup:**
- 8+ CPU cores
- 16GB+ RAM
- 500GB+ SSD storage
- Load balancer with multiple instances

---

## 💻 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/hakikisha-backend.git
cd hakikisha-backend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Install Development Tools

```bash
# Install nodemon for auto-restart
npm install -g nodemon

# Install PostgreSQL client (if not already installed)
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

---

## ⚙️ Environment Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your settings:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration (PostgreSQL on Render)
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_HOST=your-db-host.render.com
DB_PORT=5432
DB_NAME=hakikisha_prod
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_SCHEMA=hakikisha

# Connection Pool Settings (for 5M users)
DB_POOL_MIN=20
DB_POOL_MAX=100
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=30d

# Redis Configuration (Caching & Rate Limiting)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://hakikisha.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
UPLOAD_MAX_SIZE=52428800
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,video/mp4

# AWS S3 Configuration (Optional - for file storage)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=hakikisha-uploads

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@hakikisha.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=HAKIKISHA <noreply@hakikisha.com>

# AI Configuration (OpenAI for AI verdicts)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Security
BCRYPT_ROUNDS=10
PASSWORD_MIN_LENGTH=8

# Performance Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 3. Security Best Practices for Environment Variables

**Never commit `.env` to version control!**

```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

---

## 🗄️ Database Setup

### Option 1: PostgreSQL on Render (Recommended for Production)

#### Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **PostgreSQL**
3. Configure:
   - **Name**: hakikisha-db
   - **Database**: hakikisha_prod
   - **User**: hakikisha_user
   - **Region**: Choose closest to your users
   - **Plan**: Select based on load (For 5M users: Standard plan or higher)
4. Click **Create Database**
5. Copy the **External Database URL** and **Connection Details**

#### Step 2: Update .env with Render Database

```env
DATABASE_URL=postgresql://hakikisha_user:password@dpg-xxx.render.com:5432/hakikisha_prod
DB_HOST=dpg-xxx.render.com
DB_PORT=5432
DB_NAME=hakikisha_prod
DB_USER=hakikisha_user
DB_PASSWORD=<password_from_render>
```

#### Step 3: Run Database Migrations

```bash
# Run all migrations
npm run migrate

# Or run specific migration
node migrations/001_create_users_table.js
node migrations/002_create_claims_table.js
node migrations/003_create_verdicts_table.js
```

### Option 2: Local PostgreSQL (Development)

#### Step 1: Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql
```

#### Step 2: Create Database and User

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE hakikisha_dev;
CREATE USER hakikisha_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hakikisha_dev TO hakikisha_user;
\q
```

#### Step 3: Update .env for Local Development

```env
DATABASE_URL=postgresql://hakikisha_user:your_password@localhost:5432/hakikisha_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hakikisha_dev
DB_USER=hakikisha_user
DB_PASSWORD=your_password
```

#### Step 4: Run Migrations

```bash
npm run migrate
```

### Database Schema Overview

The application creates these tables:

1. **users** - User accounts and authentication
2. **claims** - User-submitted claims for fact-checking
3. **verdicts** - Fact-check results from human checkers
4. **ai_verdicts** - AI-generated verdicts
5. **fact_checkers** - Fact-checker profiles and expertise
6. **notifications** - User notifications
7. **blogs** - Blog articles
8. **trending_topics** - Trending claim analysis
9. **search_logs** - Search history and analytics
10. **admin_activities** - Admin action logs

---

## 🚀 Running the Application

### Development Mode

```bash
# Start with nodemon (auto-restart on file changes)
npm run dev

# Or start normally
npm start
```

The server will start on `http://localhost:5000`

### Verify Server is Running

```bash
# Health check
curl http://localhost:5000/health

# Test API
curl http://localhost:5000/api/test

# Check database connection
curl http://localhost:5000/api/debug/db
```

### Seed Database (Optional)

```bash
# Add sample data for development
npm run seed
```

---

## 🌐 Production Deployment on Render

### Step 1: Prepare for Deployment

#### 1.1 Create `render.yaml` Configuration

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: hakikisha-backend
    env: node
    region: oregon
    plan: standard
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: hakikisha-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
    autoDeploy: true
    healthCheckPath: /health

databases:
  - name: hakikisha-db
    databaseName: hakikisha_prod
    user: hakikisha_user
    plan: standard
```

### Step 2: Deploy to Render

#### 2.1 Via Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub/GitLab repository
4. Configure:
   - **Name**: hakikisha-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Standard (or higher for 5M users)
5. Add **Environment Variables** from your `.env` file
6. Click **Create Web Service**

#### 2.2 Via Render CLI

```bash
# Install Render CLI
npm install -g render-cli

# Login to Render
render login

# Deploy
render deploy
```

### Step 3: Configure Custom Domain (Optional)

1. In Render Dashboard, go to your service
2. Click **Settings** → **Custom Domain**
3. Add your domain: `api.hakikisha.com`
4. Update DNS records as instructed by Render:
   ```
   Type: CNAME
   Name: api
   Value: hakikisha-backend.onrender.com
   ```

### Step 4: Run Migrations on Production

```bash
# SSH into Render instance or use Render Shell
render shell

# Run migrations
npm run migrate
```

### Step 5: Monitor Deployment

```bash
# View logs
render logs

# Check health
curl https://hakikisha-backend.onrender.com/health
```

---

## 📈 Scaling for 5 Million Users

### 1. Database Optimization

#### Connection Pooling
Already configured in `src/config/database.js`:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 100,                    // Maximum pool size
  min: 20,                     // Minimum pool size
  idleTimeoutMillis: 30000,    // Close idle connections after 30s
  connectionTimeoutMillis: 10000
});
```

#### Database Indexes

Ensure these indexes exist for optimal performance:

```sql
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Claims table indexes
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_category ON claims(category);
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_created_at ON claims(created_at);
CREATE INDEX idx_claims_trending ON claims(is_trending, trending_score);

-- Verdicts table indexes
CREATE INDEX idx_verdicts_claim_id ON verdicts(claim_id);
CREATE INDEX idx_verdicts_fact_checker_id ON verdicts(fact_checker_id);

-- Full-text search indexes
CREATE INDEX idx_claims_title_search ON claims USING GIN(to_tsvector('english', title));
CREATE INDEX idx_claims_description_search ON claims USING GIN(to_tsvector('english', description));
```

#### Query Optimization

- Use prepared statements (already implemented in models)
- Limit result sets with pagination
- Use appropriate JOINs instead of N+1 queries
- Monitor slow queries with PostgreSQL logs

### 2. Caching Strategy

#### Redis Configuration

Install Redis:

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis
brew services start redis
```

Configure Redis in `.env`:

```env
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600
```

#### Caching Implementation

Cache frequently accessed data:

```javascript
// Cache claims for 5 minutes
const cachedClaims = await redis.get('claims:trending');
if (cachedClaims) {
  return JSON.parse(cachedClaims);
}

const claims = await Claim.getTrendingClaims();
await redis.setex('claims:trending', 300, JSON.stringify(claims));
```

### 3. Load Balancing

#### Horizontal Scaling on Render

1. Go to your service in Render Dashboard
2. Click **Settings** → **Scaling**
3. Increase instance count:
   - **5M users**: Recommend 10-20 instances
   - **Auto-scaling**: Enable based on CPU/memory

#### Load Balancer Configuration

Render automatically provides load balancing. For custom setup:

```nginx
# nginx.conf (if using custom load balancer)
upstream backend {
    least_conn;
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}

server {
    listen 80;
    server_name api.hakikisha.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Rate Limiting (Already Configured)

Rate limiting prevents abuse and ensures fair usage:

```javascript
// Configured in app.js and rateLimitMiddleware.js
- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- Claim submission: 10 requests per hour
- Search: 30 requests per minute
```

### 5. Database Read Replicas

For read-heavy workloads:

1. Set up PostgreSQL read replicas on Render
2. Configure read/write split:

```javascript
const masterPool = new Pool({ /* master config */ });
const replicaPool = new Pool({ /* replica config */ });

// Write operations
await masterPool.query('INSERT INTO claims ...');

// Read operations
await replicaPool.query('SELECT * FROM claims ...');
```

### 6. CDN for Static Assets

Use CDN for uploaded media files:

- **Cloudflare CDN**: Cache images, videos
- **AWS CloudFront**: Serve from S3 with CDN
- **Render CDN**: Built-in CDN for static assets

### 7. Monitoring & Alerts

#### Application Performance Monitoring

```bash
# Install PM2 for process monitoring
npm install -g pm2

# Start with PM2
pm2 start server.js -i max  # Cluster mode, max CPUs

# Monitor
pm2 monit

# View logs
pm2 logs
```

#### Set Up Alerts

- **Render**: Built-in monitoring and alerts
- **External**: Use services like DataDog, New Relic, Sentry

### 8. Database Partitioning (for 5M+ users)

Partition large tables by date:

```sql
-- Partition claims table by month
CREATE TABLE claims_2025_01 PARTITION OF claims
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE claims_2025_02 PARTITION OF claims
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### 9. Optimize Migrations for Large Scale

```javascript
// Use batching for large data migrations
const BATCH_SIZE = 1000;
let offset = 0;

while (true) {
  const batch = await db.query(`
    SELECT * FROM old_table LIMIT ${BATCH_SIZE} OFFSET ${offset}
  `);
  
  if (batch.rows.length === 0) break;
  
  // Process batch
  await processBatch(batch.rows);
  offset += BATCH_SIZE;
}
```

---

## 🔍 Monitoring & Logging

### Application Logs

Logs are configured with Winston:

```bash
# View logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Combined logs
tail -f logs/combined.log
```

### Database Logs

```bash
# PostgreSQL logs on Render
render logs --type postgres
```

### Health Monitoring

```bash
# Check server health
curl https://api.hakikisha.com/health

# Response:
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 86400,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640
  },
  "environment": "production"
}
```

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. Database Connection Fails

**Error:** `Connection timeout` or `ECONNREFUSED`

**Solutions:**
```bash
# Check database is running
pg_isready -h localhost -p 5432

# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check firewall rules (Render)
# Ensure your IP is whitelisted in Render database settings
```

#### 2. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solutions:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=5001 npm start
```

#### 3. Memory Issues

**Error:** `JavaScript heap out of memory`

**Solutions:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Monitor memory usage
node --expose-gc --max-old-space-size=4096 server.js
```

#### 4. Migration Errors

**Error:** `Migration failed` or `Table already exists`

**Solutions:**
```bash
# Check migration status
psql $DATABASE_URL -c "SELECT * FROM migrations"

# Rollback and retry
npm run migrate:rollback
npm run migrate

# Force recreate (DANGER: deletes data)
psql $DATABASE_URL -c "DROP SCHEMA hakikisha CASCADE"
npm run migrate
```

#### 5. Redis Connection Issues

**Error:** `Redis connection refused`

**Solutions:**
```bash
# Check Redis is running
redis-cli ping

# Start Redis
# Ubuntu/Debian
sudo service redis-server start

# macOS
brew services start redis

# Test connection
redis-cli -h localhost -p 6379 ping
```

---

## 📊 Performance Benchmarks

### Expected Performance (Optimized Setup)

| Metric | Target | Notes |
|--------|--------|-------|
| API Response Time | < 200ms | Average for GET requests |
| Database Query Time | < 50ms | With proper indexing |
| Concurrent Users | 50,000+ | Per instance |
| Requests/Second | 1,000+ | Per instance |
| Uptime | 99.9% | With load balancing |

### Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test 1000 requests, 100 concurrent
ab -n 1000 -c 100 https://api.hakikisha.com/api/claims

# Install Artillery for advanced testing
npm install -g artillery

# Run load test
artillery quick --count 10 --num 1000 https://api.hakikisha.com/api/claims
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (min 32 characters)
- [ ] Enable HTTPS only
- [ ] Configure CORS for specific domains
- [ ] Set up rate limiting
- [ ] Enable database SSL connections
- [ ] Implement input validation on all endpoints
- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Implement proper logging (no sensitive data)
- [ ] Set up database backups

---

## 📞 Support

For deployment issues:

- **Documentation**: https://docs.hakikisha.com
- **Email**: devops@hakikisha.com
- **Render Support**: https://render.com/docs

---

## 🎯 Next Steps

After successful setup:

1. ✅ Test all API endpoints
2. ✅ Run integration tests
3. ✅ Set up monitoring
4. ✅ Configure backups
5. ✅ Set up CI/CD pipeline
6. ✅ Load test the application
7. ✅ Configure domain and SSL
8. ✅ Train team on deployment process
