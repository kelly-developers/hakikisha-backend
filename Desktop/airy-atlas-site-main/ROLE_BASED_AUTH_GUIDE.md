# Role-Based Authentication Implementation Guide

## Overview
This guide explains how to implement role-based authentication for the HAKIKISHA mobile app with three user types: **Users**, **Fact Checkers**, and **Admins**.

## Architecture

### User Roles
1. **User** - Regular users who submit claims and view verdicts
2. **Fact Checker** - Reviews claims and submits verdicts
3. **Admin** - Manages users, fact checkers, and system settings

### Security Best Practices
- **NEVER** store roles in AsyncStorage or client-side storage (easily manipulated)
- **ALWAYS** validate roles on the backend with JWT tokens
- Store role information in a separate `user_roles` table (not in the profile table)

## Backend Implementation (Required)

### 1. Database Schema

Create a separate table for user roles to prevent privilege escalation:

```sql
-- Create enum for roles
CREATE TYPE app_role AS ENUM ('user', 'fact_checker', 'admin');

-- Create user_roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Example RLS policy
CREATE POLICY "Users can view their own role"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### 2. Update Login Endpoint

Modify `/api/auth/login` to return role information:

```javascript
// POST /api/auth/login
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user" // or "fact_checker" or "admin"
  },
  "token": "jwt_token_here"
}
```

**IMPORTANT**: The role MUST be encoded in the JWT token and validated on every backend request.

### 3. JWT Token Structure

Your JWT token should include:

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "user", // or "fact_checker" or "admin"
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 4. Backend Middleware

Add middleware to validate roles on protected routes:

```javascript
// Example middleware (Express.js)
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// Usage
app.get('/api/fact-checker/pending-claims', 
  requireRole(['fact_checker', 'admin']), 
  getPendingClaims
);

app.get('/api/admin/users', 
  requireRole(['admin']), 
  getAllUsers
);
```

## Frontend Implementation (Mobile App)

### 1. Update LoginScreen.tsx

After successful login, store the user role from the backend response:

```typescript
const handleLogin = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store auth data
      await setItem('isAuthenticated', 'true');
      await setItem('userToken', data.token);
      await setItem('userRole', data.user.role); // Store role from backend
      await setItem('userEmail', data.user.email);
      
      // Navigate based on role
      navigateByRole(data.user.role);
    }
  } catch (error) {
    setEmailError('Login failed. Please check your credentials.');
  }
};

const navigateByRole = (role: string) => {
  switch (role) {
    case 'admin':
      navigation.navigate('AdminDashboard');
      break;
    case 'fact_checker':
      navigation.navigate('FactCheckerDashboard');
      break;
    default:
      navigation.navigate('HomeScreen');
  }
};
```

### 2. Update App.tsx Initial Route Logic

```typescript
const checkIfAlreadyOnboarded = async () => {
  const onboarded = await getItem('onboarded');
  const isAuthenticated = await getItem('isAuthenticated');
  const userRole = await getItem('userRole');
  
  if (onboarded === 200) {
    if (isAuthenticated === 'true' && userRole) {
      // User is logged in, redirect based on role
      setInitialRoute(getRouteByRole(userRole));
      setShowOnboarded(false);
    } else {
      // Not logged in, show GetStarted
      setShowOnboarded(false);
    }
  } else {
    setShowOnboarded(true);
  }
};

const getRouteByRole = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'AdminDashboard';
    case 'fact_checker':
      return 'FactCheckerDashboard';
    default:
      return 'HomeScreen';
  }
};
```

### 3. Protect Routes on Frontend

While the backend is the source of truth, you can prevent unnecessary API calls by checking roles on the frontend:

```typescript
// Example in a component
import { getItem } from '../utils/AsyncStorage';

const SomeProtectedComponent = () => {
  const [userRole, setUserRole] = useState<string>('');
  
  useEffect(() => {
    checkRole();
  }, []);
  
  const checkRole = async () => {
    const role = await getItem('userRole');
    setUserRole(role || '');
    
    // Redirect if not authorized
    if (role !== 'admin' && role !== 'fact_checker') {
      navigation.navigate('HomeScreen');
    }
  };
  
  // Render content
};
```

## Testing Checklist

### Backend Tests
- [ ] User with 'user' role cannot access fact-checker endpoints
- [ ] User with 'fact_checker' role cannot access admin endpoints
- [ ] User with 'admin' role can access all endpoints
- [ ] Invalid JWT tokens are rejected
- [ ] JWT tokens without role are rejected
- [ ] Expired JWT tokens are rejected

### Frontend Tests
- [ ] Login redirects to correct screen based on role
- [ ] App startup navigates to correct screen when already logged in
- [ ] Users cannot manually navigate to unauthorized screens
- [ ] Logout clears all stored auth data including role
- [ ] Role changes on backend are reflected after re-login

## Security Warnings

### ❌ DO NOT DO THIS (Insecure)
```typescript
// INSECURE: Hardcoded credentials
if (email === 'admin@example.com' && password === 'admin123') {
  await setItem('userRole', 'admin'); // EASILY BYPASSED
}

// INSECURE: Client-side role storage only
await setItem('userRole', 'admin'); // User can modify AsyncStorage

// INSECURE: Storing role in profile table
// This can lead to privilege escalation if RLS is misconfigured
```

### ✅ DO THIS (Secure)
```typescript
// SECURE: Get role from backend response
const data = await fetch('/api/auth/login', { ... });
await setItem('userRole', data.user.role); // Role validated by backend

// SECURE: Always validate on backend
app.get('/api/admin/users', requireRole(['admin']), ...);

// SECURE: Store roles in separate table
CREATE TABLE user_roles (...)
```

## Common Pitfalls

1. **Trusting client-side role checks**: Always validate on the backend
2. **Storing roles in wrong table**: Use separate `user_roles` table
3. **Not including role in JWT**: Role must be in token for stateless auth
4. **Hardcoded admin credentials**: Always use backend validation
5. **Not clearing role on logout**: Clear all auth data including role

## Endpoints Required

See `BACKEND_API_DOCUMENTATION.md` for all required endpoints. Key additions:

- Login should return `role` field
- Register should assign default 'user' role
- Admin can register fact-checkers and admins with specific roles
- All protected endpoints must validate role from JWT token

## Next Steps

1. Implement the database schema on your backend
2. Update the login endpoint to return role information
3. Add JWT middleware to validate roles on protected routes
4. Update the mobile app login flow to handle roles
5. Test all role-based access controls thoroughly
