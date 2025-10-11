# HAKIKISHA Backend - Complete Setup Guide

## 📋 Overview

This is a fully TypeScript-based Node.js/Express backend for the HAKIKISHA fact-checking platform, designed to handle 5 million+ users with PostgreSQL on Render.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://yourdomain.com,https://mobile.yourdomain.com

# Database Configuration (Render PostgreSQL)
DATABASE_URL=postgres://user:password@host:5432/database
DB_HOST=your-render-host.render.com
DB_PORT=5432
DB_NAME=hakikisha_db
DB_USER=hakikisha_user
DB_PASSWORD=your-secure-password
DB_SCHEMA=hakikisha

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Database Setup on Render

1. **Create PostgreSQL Database on Render:**
   - Go to https://dashboard.render.com
   - Click "New +" → "PostgreSQL"
   - Choose a name (e.g., `hakikisha-db`)
   - Select region closest to your users
   - Click "Create Database"

2. **Get Connection Details:**
   - Copy the "External Database URL" from Render dashboard
   - Extract individual connection parameters:
     - Host: `xxx.render.com`
     - Port: `5432`
     - Database: `your_db_name`
     - User: `your_db_user`
     - Password: `your_password`

3. **Run Migrations:**
   ```bash
   # Connect to your Render PostgreSQL database
   psql -h your-host.render.com -U your_user -d your_db_name
   
   # Create schema
   CREATE SCHEMA IF NOT EXISTS hakikisha;
   
   # Run all migration files in order
   # migrations/001_create_users_table.js
   # migrations/002_create_claims_table.js
   # ... etc
   ```

### 4. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

### 5. Verify Installation

Test the server:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/refresh` | Refresh JWT token | No |
| POST | `/logout` | User logout | Yes |
| GET | `/me` | Get current user | Yes |

### Claims Routes (`/api/claims`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Submit new claim | Yes |
| GET | `/` | Get all claims | Yes |
| GET | `/:id` | Get claim by ID | Yes |
| GET | `/trending` | Get trending claims | Yes |
| PUT | `/:id` | Update claim | Yes |
| DELETE | `/:id` | Delete claim | Yes |
| POST | `/:id/status` | Update claim status | Yes |

### Verdict Routes (`/api/verdicts`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/` | Submit verdict | Yes | fact_checker, admin |
| GET | `/claim/:id` | Get verdict for claim | Yes | All |
| GET | `/my-verdicts` | Get my verdicts | Yes | fact_checker, admin |
| GET | `/stats` | Get verdict statistics | Yes | fact_checker, admin |
| PUT | `/:id` | Update verdict | Yes | fact_checker, admin |

### Search Routes (`/api/search`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/claims` | Search claims | No |
| GET | `/verdicts` | Search verdicts | No |
| GET | `/blogs` | Search blogs | No |
| GET | `/suggestions` | Get search suggestions | No |
| GET | `/history` | Get search history | Yes |
| DELETE | `/history` | Clear search history | Yes |

## 🔐 Authentication Flow

### 1. Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "phone": "+254700000000",
    "role": "user"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "registration_status": "pending"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "is_verified": true,
    "registration_status": "approved"
  }
}
```

### 3. Use Token in Requests

```bash
curl -X GET http://localhost:5000/api/claims \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Refresh Token

When token expires (24h), use refresh token:

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token"
  }'
```

## 🧪 Testing the API

### Submit a Claim

```bash
curl -X POST http://localhost:5000/api/claims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Government announces new policy",
    "description": "Detailed description of the claim...",
    "category": "politics",
    "media_type": "text"
  }'
```

### Search Claims

```bash
curl "http://localhost:5000/api/search/claims?q=government&category=politics&page=1&limit=20"
```

### Submit Verdict (Fact Checker Only)

```bash
curl -X POST http://localhost:5000/api/verdicts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer FACT_CHECKER_TOKEN" \
  -d '{
    "claim_id": "claim-uuid",
    "verdict": "false",
    "explanation": "Detailed explanation with evidence...",
    "evidence_sources": [
      "https://source1.com/article",
      "https://source2.org/report"
    ],
    "confidence_score": 95
  }'
```

## 🚀 Deployment to Render

### 1. Deploy Backend

1. Push code to GitHub repository
2. Go to Render Dashboard
3. Click "New +" → "Web Service"
4. Connect your repository
5. Configure:
   - **Name**: `hakikisha-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Start with `Starter` (scales to handle millions)

### 2. Add Environment Variables

In Render dashboard, add all `.env` variables:
- NODE_ENV=production
- DATABASE_URL=(from your Render PostgreSQL)
- JWT_SECRET=(generate strong secret)
- All other variables from `.env.example`

### 3. Connect to PostgreSQL

- In Render dashboard, go to your PostgreSQL database
- Click "Connect" → "External Connection"
- Copy connection string
- Add to your Web Service as `DATABASE_URL`

### 4. Run Migrations

Connect to database and run migrations:
```bash
# Use Render's built-in shell or local psql
psql $DATABASE_URL < migrations/001_create_users_table.sql
psql $DATABASE_URL < migrations/002_create_claims_table.sql
# ... run all migrations
```

## 📊 Scaling for 5 Million Users

### Database Optimization

**1. Connection Pooling (Already Configured)**
```typescript
// src/config/database.ts
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

**2. Database Indexes (Add to migrations)**
```sql
-- Speed up search queries
CREATE INDEX idx_claims_title ON claims USING gin(to_tsvector('english', title));
CREATE INDEX idx_claims_description ON claims USING gin(to_tsvector('english', description));
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX idx_claims_trending ON claims(is_trending, trending_score DESC);

-- Speed up authentication
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);

-- Speed up verdicts
CREATE INDEX idx_verdicts_claim_id ON verdicts(claim_id);
CREATE INDEX idx_verdicts_fact_checker_id ON verdicts(fact_checker_id);
```

### Caching Strategy

**Install Redis:**
```bash
npm install redis ioredis
```

**Setup Redis on Render:**
1. Create Redis instance on Render
2. Add `REDIS_URL` to environment variables

**Implement Caching (Example):**
```typescript
// src/config/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cacheGet = async (key: string) => {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};

export const cacheSet = async (key: string, value: any, ttl: number = 300) => {
  await redis.setex(key, ttl, JSON.stringify(value));
};
```

### Load Balancing

**Horizontal Scaling on Render:**
1. Go to your Web Service
2. Increase "Instance Count" (e.g., 3-5 instances)
3. Render automatically load balances

### Rate Limiting (Already Implemented)

Current configuration:
- 100 requests per 15 minutes per IP
- Adjust in `.env` if needed

### Monitoring

**Add Logging Service:**
```bash
npm install winston
```

**Configure Winston:**
```typescript
// src/config/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🔒 Security Best Practices

✅ **Implemented:**
- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Input validation with Zod
- Rate limiting
- CORS configuration
- Helmet security headers
- SQL injection prevention (parameterized queries)

❗ **Additional Recommendations:**
1. Use HTTPS in production (Render provides free SSL)
2. Rotate JWT secrets regularly
3. Implement 2FA for admin accounts
4. Set up database backups
5. Monitor failed login attempts
6. Add request logging

## 📞 Troubleshooting

### Database Connection Issues

**Error:** `Connection timeout`
**Solution:** Check Render database is running and connection string is correct

```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

### Token Errors

**Error:** `Invalid token`
**Solution:** Ensure JWT_SECRET matches between registration and login

### Migration Issues

**Error:** `relation does not exist`
**Solution:** Run all migrations in order (001, 002, 003, etc.)

### Performance Issues

**Slow queries?**
1. Check database indexes
2. Enable query logging
3. Use `EXPLAIN ANALYZE` to debug slow queries

```sql
EXPLAIN ANALYZE SELECT * FROM claims WHERE status = 'published';
```

## 📝 Next Steps

1. ✅ Set up PostgreSQL on Render
2. ✅ Deploy backend to Render
3. ✅ Run database migrations
4. ✅ Test all API endpoints
5. ✅ Connect mobile app to backend
6. ⬜ Set up Redis caching
7. ⬜ Configure monitoring/logging
8. ⬜ Add automated backups
9. ⬜ Load test with 10k+ concurrent users

## 🆘 Support

For issues or questions:
- Check API documentation: `docs/API.md`
- Review test examples: `docs/TESTING.md`
- Render support: https://render.com/docs

---

Built with ❤️ for HAKIKISHA - Fighting Misinformation with Technology
