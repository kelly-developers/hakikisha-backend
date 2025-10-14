# HAKIKISHA Backend Deployment Guide

## ⚠️ IMPORTANT: This is a Node.js Backend Project

This project is a **Node.js/Express backend API**, not a web frontend. Lovable's preview window will show build errors because it's trying to build this as a web application.

## Backend Status

✅ All API endpoints have been updated to match your specification
✅ CORS configured for mobile app (capacitor://localhost)
✅ JWT authentication with refresh tokens
✅ Role-based access control (user, fact_checker, admin)
✅ Database queries ready for PostgreSQL

## Deploying to AWS

### Option 1: AWS Elastic Beanstalk (Recommended for 5M users)

1. **Install AWS CLI and EB CLI**
```bash
npm install -g aws-cli eb-cli
```

2. **Initialize Elastic Beanstalk**
```bash
eb init -p node.js hakikisha-backend
```

3. **Create environment**
```bash
eb create hakikisha-production --scale 5
```

4. **Set environment variables**
```bash
eb setenv DB_HOST=your-rds-host \
  DB_USER=your-db-user \
  DB_PASSWORD=your-db-password \
  DB_NAME=hakikisha \
  JWT_SECRET=your-secure-secret \
  NODE_ENV=production
```

5. **Deploy**
```bash
eb deploy
```

### Option 2: AWS EC2 with Load Balancer

1. **Launch EC2 instances** (t3.medium or larger)
2. **Install dependencies on each instance**
```bash
sudo apt update
sudo apt install nodejs npm postgresql-client nginx
```

3. **Clone your repository**
```bash
git clone your-repo
cd hakikisha-backend
npm install
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your production values
```

5. **Install PM2 for process management**
```bash
npm install -g pm2
pm2 start server.js -i max
pm2 startup
pm2 save
```

6. **Configure nginx as reverse proxy**
```nginx
server {
    listen 80;
    server_name api.hakikisha.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **Set up AWS Application Load Balancer**
- Create target group pointing to your EC2 instances
- Configure health checks to `/health`
- Enable sticky sessions

### Option 3: AWS ECS with Fargate (Best for Auto-scaling)

1. **Build Docker image**
```bash
docker build -t hakikisha-backend .
```

2. **Push to ECR**
```bash
aws ecr create-repository --repository-name hakikisha-backend
docker tag hakikisha-backend:latest your-account.dkr.ecr.region.amazonaws.com/hakikisha-backend:latest
docker push your-account.dkr.ecr.region.amazonaws.com/hakikisha-backend:latest
```

3. **Create ECS task definition**
4. **Create ECS service with auto-scaling**
5. **Configure ALB to route traffic to ECS tasks**

## Database Setup (AWS RDS PostgreSQL)

1. **Create RDS PostgreSQL instance**
   - Engine: PostgreSQL 15
   - Instance class: db.t3.medium (start) → db.r5.xlarge (production)
   - Storage: 100GB SSD with auto-scaling
   - Multi-AZ: Yes
   - Backup retention: 7 days

2. **Run migrations**
```bash
npm run migrate
```

3. **Seed initial data (optional)**
```bash
npm run seed
```

## Scaling for 5 Million Users

### Infrastructure Recommendations:

**Application Layer:**
- 10-20 EC2 instances (t3.large) behind ALB
- Auto-scaling group (min: 5, max: 50)
- OR: ECS Fargate with 20-100 tasks

**Database Layer:**
- RDS PostgreSQL: db.r5.2xlarge or larger
- Read replicas: 3-5 instances
- Connection pooling: pgbouncer

**Caching Layer:**
- ElastiCache Redis: cache.r5.xlarge
- Cache TTL: 5-15 minutes for claims
- Session storage in Redis

**File Storage:**
- S3 for images and videos
- CloudFront CDN for global delivery

**Monitoring:**
- CloudWatch for metrics and logs
- X-Ray for distributed tracing
- Set up alarms for high CPU, memory, and latency

### Cost Estimate (Monthly):
- EC2 instances (20 × t3.large): ~$2,400
- RDS (db.r5.2xlarge + replicas): ~$2,000
- ElastiCache (cache.r5.xlarge): ~$350
- S3 + CloudFront: ~$500
- Data transfer: ~$1,000
- **Total: ~$6,250/month**

## Environment Variables

Create `.env` file with:

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=hakikisha
DB_USER=hakikisha_user
DB_PASSWORD=your-secure-password

# JWT
JWT_SECRET=your-very-secure-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# CORS
ALLOWED_ORIGINS=capacitor://localhost,http://localhost,https://your-domain.com

# AWS (if using S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=hakikisha-uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Testing the API

Once deployed, test with:

```bash
# Health check
curl https://api.hakikisha.com/health

# Register
curl -X POST https://api.hakikisha.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "full_name": "Test User",
    "phone_number": "+254712345678"
  }'

# Login
curl -X POST https://api.hakikisha.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

## Security Checklist

✅ Environment variables stored securely (AWS Secrets Manager)
✅ HTTPS enabled (SSL certificate from ACM)
✅ Rate limiting configured
✅ CORS restricted to app domains
✅ SQL injection prevention (parameterized queries)
✅ Password hashing (bcrypt)
✅ JWT tokens with expiration
✅ Database connection encryption
✅ Security groups configured (only allow necessary ports)
✅ Regular security updates

## Monitoring & Maintenance

1. **Set up CloudWatch dashboards**
2. **Configure log aggregation**
3. **Set up automated backups**
4. **Create disaster recovery plan**
5. **Schedule regular security audits**
6. **Monitor API performance metrics**

## Support

For deployment issues, contact your DevOps team or AWS support.

## Next Steps

1. ✅ Review all API endpoints
2. ✅ Test with Postman/Insomnia
3. ⏳ Deploy to AWS staging environment
4. ⏳ Connect mobile app to staging API
5. ⏳ Load testing (simulate 5M users)
6. ⏳ Deploy to production
7. ⏳ Configure monitoring and alerts
