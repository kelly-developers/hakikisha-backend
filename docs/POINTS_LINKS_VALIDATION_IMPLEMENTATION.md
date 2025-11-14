# Points, Links, and Validation Implementation Guide

This document provides implementation details for the recent backend updates including points system, video/source links, email/phone validation, and contact email configuration.

## Table of Contents
1. [Points System](#points-system)
2. [Video and Source Links](#video-and-source-links)
3. [Email and Phone Validation](#email-and-phone-validation)
4. [Admin User Sorting](#admin-user-sorting)
5. [Contact Email Configuration](#contact-email-configuration)

---

## 1. Points System

### Backend Changes

**Points are now awarded automatically when users submit claims:**

- **5 points** awarded per claim submission
- Points are tracked in the `user_points` table
- Users sorted by points in admin panel

### API Endpoints

#### Get User Points
```typescript
GET /api/v1/user/points

Response:
{
  success: true,
  data: {
    points: 45,
    recentHistory: [...],
    rank: 12
  }
}
```

#### Get Points History
```typescript
GET /api/v1/user/points/history?limit=50

Response:
{
  success: true,
  data: {
    history: [
      {
        points: 5,
        activity_type: "CLAIM_SUBMISSION",
        description: "Submitted a claim for fact-checking",
        created_at: "2025-11-13T10:30:00Z"
      }
    ],
    total: 10,
    limit: 50,
    offset: 0
  }
}
```

#### Get Leaderboard
```typescript
GET /api/v1/user/points/leaderboard?limit=100

Response:
{
  success: true,
  data: [
    {
      rank: 1,
      username: "john_doe",
      profile_picture: "https://...",
      points: 150,
      current_streak: 7,
      longest_streak: 14
    }
  ]
}
```

### Frontend Implementation

```typescript
// Fetch user points
const fetchUserPoints = async () => {
  try {
    const response = await apiClient.get('/user/points');
    const { points, recentHistory, rank } = response.data.data;
    
    // Update UI
    setUserPoints(points);
    setPointsHistory(recentHistory);
    setUserRank(rank);
  } catch (error) {
    console.error('Failed to fetch points:', error);
  }
};

// Display points in profile
<div className="points-display">
  <h3>Your Points</h3>
  <p className="points-value">{userPoints}</p>
  <p className="rank">Rank: #{userRank}</p>
</div>

// Display points history
<div className="points-history">
  <h4>Recent Activity</h4>
  {pointsHistory.map((entry, index) => (
    <div key={index} className="history-item">
      <span className="points">+{entry.points}</span>
      <span className="activity">{entry.description}</span>
      <span className="date">{new Date(entry.created_at).toLocaleDateString()}</span>
    </div>
  ))}
</div>
```

---

## 2. Video and Source Links

### Backend Changes

**Links are now properly stored and returned:**

- `video_url` - Video link provided by user
- `source_url` - Source link provided by user
- Both fields are included in claim responses for fact checkers

### API Endpoints

#### Submit Claim with Links
```typescript
POST /api/v1/claims

Body:
{
  category: "politics",
  claimText: "Claim about elections",
  videoLink: "https://youtube.com/watch?v=...",
  sourceLink: "https://news.example.com/article",
  imageUrl: "https://..."
}

Response:
{
  success: true,
  message: "Claim submitted successfully",
  claim: {
    id: "uuid",
    videoUrl: "https://youtube.com/watch?v=...",
    sourceUrl: "https://news.example.com/article",
    ...
  },
  pointsAwarded: 5
}
```

#### Get Pending Claims (Fact Checker)
```typescript
GET /api/v1/fact-checker/pending-claims

Response:
{
  success: true,
  claims: [
    {
      id: "uuid",
      title: "Claim title",
      description: "Claim description",
      imageUrl: "https://...",
      videoLink: "https://youtube.com/watch?v=...",
      sourceLink: "https://news.example.com/article",
      videoUrl: "https://youtube.com/watch?v=...",
      sourceUrl: "https://news.example.com/article",
      ai_suggestion: {...}
    }
  ]
}
```

### Frontend Implementation

```typescript
// Display video and source links for fact checkers
const ClaimReviewCard = ({ claim }) => {
  return (
    <div className="claim-review-card">
      <h3>{claim.title}</h3>
      <p>{claim.description}</p>
      
      {/* Display image if available */}
      {claim.imageUrl && (
        <img src={claim.imageUrl} alt="Claim evidence" />
      )}
      
      {/* Display video link if available */}
      {claim.videoUrl && (
        <div className="video-link">
          <label>📹 Video Evidence:</label>
          <a 
            href={claim.videoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="link-clickable"
          >
            {claim.videoUrl}
          </a>
        </div>
      )}
      
      {/* Display source link if available */}
      {claim.sourceUrl && (
        <div className="source-link">
          <label>🔗 Source:</label>
          <a 
            href={claim.sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="link-clickable"
          >
            {claim.sourceUrl}
          </a>
        </div>
      )}
      
      {/* AI Suggestion */}
      <div className="ai-suggestion">
        <h4>AI Analysis</h4>
        <p>{claim.ai_suggestion.explanation}</p>
      </div>
    </div>
  );
};
```

### CSS Styling for Clickable Links

```css
.link-clickable {
  color: #007bff;
  text-decoration: none;
  word-break: break-word;
  display: inline-block;
  margin-top: 0.5rem;
}

.link-clickable:hover {
  text-decoration: underline;
  color: #0056b3;
}

.video-link,
.source-link {
  margin: 1rem 0;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.375rem;
  border-left: 3px solid #007bff;
}

.video-link label,
.source-link label {
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}
```

---

## 3. Email and Phone Validation

### Backend Changes

**Registration now includes strict validation:**

- Email format validated using regex pattern
- Phone number validated to ensure no letters
- Invalid formats return clear error messages

### Validation Rules

**Email:**
- Must match pattern: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- Examples:
  - ✅ `user@example.com`
  - ✅ `john.doe+tag@company.co.ke`
  - ❌ `invalid@email` (missing domain extension)
  - ❌ `@example.com` (missing local part)

**Phone:**
- Must match pattern: `^\+?[\d\s\-()]+$`
- Only allows: digits, spaces, hyphens, parentheses, and optional + prefix
- Examples:
  - ✅ `+254712345678`
  - ✅ `0712 345 678`
  - ✅ `(071) 234-5678`
  - ❌ `071234ABCD` (contains letters)
  - ❌ `phone: 0712345678` (contains text)

### API Response Examples

```typescript
// Invalid email
POST /api/v1/auth/register
Body: { email: "invalid@email", password: "12345678" }

Response: 400
{
  success: false,
  error: "Invalid email format. Please provide a valid email address."
}

// Invalid phone
POST /api/v1/auth/register
Body: { 
  email: "user@example.com", 
  password: "12345678",
  phone: "071234ABCD"
}

Response: 400
{
  success: false,
  error: "Invalid phone number format. Phone number should only contain numbers, spaces, hyphens, and parentheses."
}
```

### Frontend Implementation

```typescript
// Client-side validation (optional but recommended)
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone);
};

// Registration form
const RegistrationForm = () => {
  const [errors, setErrors] = useState({});
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const phone = formData.get('phone');
    
    // Client-side validation
    const newErrors = {};
    
    if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (phone && !validatePhone(phone)) {
      newErrors.phone = 'Phone number should only contain numbers';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Proceed with API call
    try {
      const response = await apiClient.post('/auth/register', {
        email,
        password: formData.get('password'),
        phone,
        username: formData.get('username')
      });
      
      // Handle success
    } catch (error) {
      // Display server-side validation errors
      setErrors({ api: error.response?.data?.error });
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        name="email" 
        placeholder="Email"
        required
      />
      {errors.email && <span className="error">{errors.email}</span>}
      
      <input 
        type="tel" 
        name="phone" 
        placeholder="Phone (e.g., +254712345678)"
      />
      {errors.phone && <span className="error">{errors.phone}</span>}
      
      {/* Other fields */}
      
      <button type="submit">Register</button>
    </form>
  );
};
```

---

## 4. Admin User Sorting

### Backend Changes

Users in admin panel are automatically sorted by highest points first:

```sql
ORDER BY up.total_points DESC NULLS LAST, u.created_at DESC
```

### API Endpoint

```typescript
GET /api/v1/admin/users?page=1&limit=20

Response:
{
  success: true,
  users: [
    {
      id: "uuid",
      username: "top_user",
      email: "user@example.com",
      total_points: 150,
      current_streak: 7,
      longest_streak: 14,
      ...
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    pages: 8
  }
}
```

### Frontend Implementation

```typescript
// Admin users table
const AdminUsersTable = ({ users }) => {
  return (
    <table className="users-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Username</th>
          <th>Email</th>
          <th>Points</th>
          <th>Streak</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user, index) => (
          <tr key={user.id}>
            <td>#{index + 1}</td>
            <td>{user.username}</td>
            <td>{user.email}</td>
            <td className="points-cell">{user.total_points || 0}</td>
            <td>{user.current_streak || 0} days</td>
            <td>
              <button onClick={() => viewUser(user.id)}>View</button>
              <button onClick={() => suspendUser(user.id)}>Suspend</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## 5. Contact Email Configuration

### Configuration Required

For contact us functionality, update your email service to send to:

**Email:** `crecocommunication@gmail.com`

### Implementation Example

```javascript
// In your email service or contact controller
const CONTACT_EMAIL = 'crecocommunication@gmail.com';

async function sendContactEmail(userEmail, message, userName) {
  // Using your email service (e.g., nodemailer, sendgrid)
  await emailService.send({
    from: 'noreply@hakikisha.app',
    to: CONTACT_EMAIL,
    replyTo: userEmail,
    subject: `Contact Form Submission from ${userName}`,
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>From:</strong> ${userName} (${userEmail})</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `
  });
}
```

---

## Testing Checklist

### Points System
- [ ] Submit a claim and verify 5 points are awarded
- [ ] Check points appear in user profile
- [ ] Verify points history shows claim submission
- [ ] Test leaderboard displays users sorted by points

### Links Display
- [ ] Submit claim with video URL and verify it's saved
- [ ] Submit claim with source URL and verify it's saved
- [ ] Login as fact checker and verify links are visible and clickable
- [ ] Verify AI stats display includes user-provided links

### Validation
- [ ] Try registering with invalid email format - should fail
- [ ] Try registering with phone containing letters - should fail
- [ ] Register with valid email and phone - should succeed
- [ ] Verify validation error messages are clear

### Admin Panel
- [ ] View users list in admin panel
- [ ] Verify users are sorted by points (highest first)
- [ ] Verify points display correctly for each user

---

## Common Issues and Solutions

### Issue: Points not showing after claim submission
**Solution:** Ensure `user_points` table is initialized for the user. The backend now automatically initializes this on first claim submission.

### Issue: Links not appearing for fact checkers
**Solution:** Check that the database migration 026 has been run to add `video_url` and `source_url` columns to the claims table.

### Issue: Email validation too strict
**Solution:** The regex pattern can be adjusted in `src/routes/authRoutes.js` if needed for specific use cases.

### Issue: Phone validation rejecting valid numbers
**Solution:** Check that the phone format matches the allowed pattern. Common formats like `+254712345678` or `0712 345 678` are supported.

---

## Database Schema Reference

### user_points table
```sql
CREATE TABLE hakikisha.user_points (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES hakikisha.users(id),
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### claims table (relevant columns)
```sql
ALTER TABLE hakikisha.claims 
ADD COLUMN video_url TEXT,
ADD COLUMN source_url TEXT;
```

---

## API Error Codes Reference

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input format |
| AUTH_ERROR | 401 | Authentication required |
| NOT_FOUND | 404 | Resource not found |
| SERVER_ERROR | 500 | Internal server error |

---

## Support

For issues or questions:
- Backend code: `/src/controllers/`, `/src/services/`
- Database migrations: `/migrations/`
- Documentation: `/docs/`

Last Updated: November 13, 2025
