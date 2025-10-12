# Testing Authentication for Admin and Fact-Checker Roles

## Overview
This document explains how to test the admin and fact-checker dashboards during development. For production, you MUST implement proper backend authentication as described in `ROLE_BASED_AUTH_GUIDE.md`.

## ⚠️ SECURITY WARNING
The testing credentials below are ONLY for development/testing purposes. **NEVER use hardcoded credentials in production.** Always implement proper backend authentication with JWT tokens and role validation.

## Testing Credentials

### Admin Access
- **Email:** `admin@hakikisha.org`
- **Password:** `Admin@2024!`
- **Access:** Full system control, user management, fact-checker oversight

### Fact-Checker Access
- **Email:** `factchecker@hakikisha.org`
- **Password:** `Checker@2024!`
- **Access:** Claim review, verdict submission, AI suggestions

### Regular User Access
- **Email:** `user@hakikisha.org`
- **Password:** `User@2024!`
- **Access:** Submit claims, view verdicts, read blogs

## How to Test Login

### Testing Admin Dashboard

1. Launch the HAKIKISHA app
2. Navigate to the Login screen
3. Enter admin credentials:
   - Email: `admin@hakikisha.org`
   - Password: `Admin@2024!`
4. Click "Log In"
5. You should be redirected to the **Admin Dashboard**

**Admin Dashboard Features:**
- View system statistics (total users, pending claims, active fact-checkers)
- Manage users (view, suspend, delete)
- Register new fact-checkers and admins
- Monitor fact-checker activity and performance
- View time spent in system by each fact-checker

### Testing Fact-Checker Dashboard

1. Launch the HAKIKISHA app
2. Navigate to the Login screen
3. Enter fact-checker credentials:
   - Email: `factchecker@hakikisha.org`
   - Password: `Checker@2024!`
4. Click "Log In"
5. You should be redirected to the **Fact-Checker Dashboard**

**Fact-Checker Dashboard Features:**
- View pending claims with category, submission date, and urgency
- Review claim details (text, images, videos, links)
- Submit verdicts (True, False, Misleading, Needs Context)
- Write detailed verdict explanations
- Add sources and references
- Review AI-generated verdicts
- Edit or approve AI suggestions

### Testing Regular User Experience

1. Launch the HAKIKISHA app
2. Navigate to the Login screen
3. Enter user credentials:
   - Email: `user@hakikisha.org`
   - Password: `User@2024!`
4. Click "Log In"
5. You should be redirected to the **Home Screen** with bottom tabs

**User Features:**
- Submit claims via "Submit Claim" button
- View trending claims
- Browse claims by category (Governance, Misinformation, Civic Processes)
- Read fact-checker blogs
- View profile and settings

## Backend Implementation Required

Before production deployment, you MUST implement the backend endpoints documented in `BACKEND_API_DOCUMENTATION.md`. Key endpoints include:

### Authentication Endpoints
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Role-Based Access
The login endpoint must return the user's role:

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "admin@hakikisha.org",
    "username": "admin",
    "role": "admin"
  },
  "token": "jwt_token_here"
}
```

### Database Schema
Implement the `user_roles` table as described in `ROLE_BASED_AUTH_GUIDE.md`:

```sql
CREATE TYPE app_role AS ENUM ('user', 'fact_checker', 'admin');

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role)
);
```

### JWT Token Structure
Your JWT must include the role for server-side validation:

```json
{
  "sub": "user_id",
  "email": "admin@hakikisha.org",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Frontend Integration

The mobile app stores the user role after successful login:

```typescript
// In LoginScreen.tsx
const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const data = await response.json();

if (data.success) {
  await setItem('userToken', data.token);
  await setItem('userRole', data.user.role);
  
  // Navigate based on role
  if (data.user.role === 'admin') {
    navigation.navigate('AdminDashboard');
  } else if (data.user.role === 'fact_checker') {
    navigation.navigate('FactCheckerDashboard');
  } else {
    navigation.navigate('HomeScreen');
  }
}
```

## Testing Checklist

### Admin Dashboard Tests
- [ ] Login redirects to admin dashboard
- [ ] Can view system statistics
- [ ] Can view list of users
- [ ] Can view list of fact-checkers
- [ ] Can register new fact-checkers
- [ ] Can register new admins
- [ ] Can suspend users
- [ ] Can delete users (with confirmation)
- [ ] Can view fact-checker activity logs

### Fact-Checker Dashboard Tests
- [ ] Login redirects to fact-checker dashboard
- [ ] Can view pending claims
- [ ] Can view claim details (text, media, links)
- [ ] Can submit verdicts
- [ ] Can write verdict explanations
- [ ] Can add sources
- [ ] Can review AI-generated verdicts
- [ ] Can edit AI verdicts
- [ ] Can approve AI verdicts
- [ ] Claim disappears from other fact-checkers when opened

### User Experience Tests
- [ ] Login redirects to home screen
- [ ] Can submit claims
- [ ] Can select claim category
- [ ] Can attach images/videos/links to claims
- [ ] Can view trending claims
- [ ] Can browse claims by category
- [ ] Can read blogs
- [ ] Can view profile
- [ ] Can access settings
- [ ] Can view privacy policy

## Security Best Practices

### ❌ DO NOT DO THIS (Insecure)
```typescript
// NEVER check roles like this
if (email === 'admin@hakikisha.org' && password === 'Admin@2024!') {
  await setItem('userRole', 'admin'); // Easily bypassed
}
```

### ✅ DO THIS (Secure)
```typescript
// Always get role from backend
const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

const data = await response.json();
await setItem('userRole', data.user.role); // Role validated by backend
```

### Backend Role Validation
Always validate roles on the backend:

```javascript
// Express.js middleware example
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Protect admin routes
app.get('/api/admin/users', requireRole(['admin']), getAllUsers);

// Protect fact-checker routes
app.get('/api/fact-checker/claims', 
  requireRole(['fact_checker', 'admin']), 
  getPendingClaims
);
```

## Troubleshooting

### Login Not Working
- Verify backend API is running
- Check API_BASE_URL in environment variables
- Verify network connectivity
- Check console logs for error messages

### Wrong Dashboard After Login
- Verify backend returns correct role in response
- Check AsyncStorage for userRole value
- Verify navigation logic in LoginScreen.tsx

### Role Not Persisting
- Check if userRole is saved to AsyncStorage
- Verify App.tsx reads userRole on startup
- Check if logout clears userRole

## Next Steps

1. Implement backend authentication endpoints
2. Set up user_roles database table
3. Implement JWT token generation with roles
4. Add role validation middleware
5. Test all role-based access controls thoroughly
6. Remove hardcoded test credentials
7. Deploy to production

## Additional Resources

- `BACKEND_API_DOCUMENTATION.md` - Complete API specification
- `ROLE_BASED_AUTH_GUIDE.md` - Detailed security implementation guide
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
