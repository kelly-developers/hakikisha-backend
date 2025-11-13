# Phone Number Persistence Fix - Complete

## Overview
Updated the backend to ensure phone numbers provided during admin and fact checker registration are properly persisted in the database.

## Changes Made

### 1. Admin Registration (src/controllers/adminController.js)
**Function:** `registerAdmin`

**Changes:**
- Added `phone` to destructured request body parameters
- Included `phone: phone || null` in User.create() call

**Before:**
```javascript
const { email, username, password } = req.body;
const newUser = await User.create({
  email: email,
  username: username,
  password_hash: await authService.hashPassword(password),
  role: 'admin',
  ...
});
```

**After:**
```javascript
const { email, username, password, phone } = req.body;
const newUser = await User.create({
  email: email,
  username: username,
  password_hash: await authService.hashPassword(password),
  phone: phone || null,
  role: 'admin',
  ...
});
```

### 2. Fact Checker Registration (src/controllers/adminController.js)
**Function:** `registerFactChecker`

**Changes:**
- Added `phone` to destructured request body parameters
- Included `phone: phone || null` in User.create() call

**Before:**
```javascript
const { email, username, password, credentials, areasOfExpertise } = req.body;
const newUser = await User.create({
  email: email,
  username: username,
  password_hash: await authService.hashPassword(password),
  role: 'fact_checker',
  ...
});
```

**After:**
```javascript
const { email, username, password, phone, credentials, areasOfExpertise } = req.body;
const newUser = await User.create({
  email: email,
  username: username,
  password_hash: await authService.hashPassword(password),
  phone: phone || null,
  role: 'fact_checker',
  ...
});
```

## API Endpoints

### Register Admin
**Endpoint:** `POST /api/admin/users/register-admin`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "username": "adminuser",
  "password": "securepassword",
  "phone": "+254712345678"  // Now properly saved
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin registered and approved successfully",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "username": "adminuser",
    "role": "admin",
    "registration_status": "approved",
    "is_verified": true
  }
}
```

### Register Fact Checker
**Endpoint:** `POST /api/admin/users/register-fact-checker`

**Request Body:**
```json
{
  "email": "checker@example.com",
  "username": "factchecker",
  "password": "securepassword",
  "phone": "+254712345678",  // Now properly saved
  "credentials": "PhD in Journalism",
  "areasOfExpertise": ["politics", "health"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Fact checker registered and approved successfully",
  "user": {
    "id": "uuid",
    "email": "checker@example.com",
    "username": "factchecker",
    "role": "fact_checker",
    "registration_status": "approved",
    "is_verified": true
  },
  "fact_checker": {
    "id": "uuid",
    "user_id": "uuid",
    "credentials": "PhD in Journalism",
    "areas_of_expertise": ["politics", "health"],
    "verification_status": "approved",
    "is_active": true
  }
}
```

## How Phone Numbers Are Retrieved

Phone numbers will now appear in user details responses from these endpoints:

1. **GET /api/admin/users/:userId** - User details
2. **GET /api/admin/fact-checkers/:userId** - Fact checker details
3. **GET /api/admin/admins** - All admins list
4. **GET /api/admin/fact-checkers** - All fact checkers list
5. **GET /api/auth/me** - Current user details

The phone number is stored in the `users` table's `phone` column and is returned in all user-related queries.

## Testing

To test phone number persistence:

1. Register a new admin with phone number:
```bash
curl -X POST http://localhost:5000/api/admin/users/register-admin \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@test.com",
    "username": "newadmin",
    "password": "password123",
    "phone": "+254712345678"
  }'
```

2. Register a new fact checker with phone number:
```bash
curl -X POST http://localhost:5000/api/admin/users/register-fact-checker \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newchecker@test.com",
    "username": "newchecker",
    "password": "password123",
    "phone": "+254798765432",
    "credentials": "Master in Communications",
    "areasOfExpertise": ["technology", "business"]
  }'
```

3. Verify phone number appears in admin/fact checker lists:
```bash
curl -X GET http://localhost:5000/api/admin/admins \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

curl -X GET http://localhost:5000/api/admin/fact-checkers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Database Schema

The `phone` column already exists in the `users` table:

```sql
CREATE TABLE hakikisha.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),  -- This column stores phone numbers
  role VARCHAR(20) DEFAULT 'user',
  ...
);
```

## Notes

- Phone numbers are optional (stored as NULL if not provided)
- Phone numbers are trimmed and validated in the frontend before submission
- The regular user registration endpoint (`POST /api/auth/register`) already supports phone numbers correctly
- This fix ensures consistency across all user registration methods (regular, admin, fact checker)
