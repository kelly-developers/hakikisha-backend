# 🚀 Quick Start Guide

## Setup in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Install PostgreSQL (if not installed)
# Create database
createdb hakikisha_prod

# Run migrations
node migrations/001_create_users_table.js
# ... run all 15 migrations
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Create First Admin
```bash
node src/scripts/createAdmin.js
# Or use SQL: See docs/DATABASE_SETUP.md
```

### 5. Start Server
```bash
npm run dev
```

### 6. Test API
```bash
curl http://localhost:5000/health
```

## Next Steps
- ✅ Read `docs/API_COMPLETE.md` for all endpoints
- ✅ Read `docs/DATABASE_SETUP.md` for database details
- ✅ Read `docs/REACT_NATIVE_SETUP.md` to connect mobile app
- ✅ Test with Postman collection (import from `/postman`)

## Default Admin Login
- Email: admin@hakikisha.com
- Password: Admin@123
- **⚠️ CHANGE IMMEDIATELY!**
