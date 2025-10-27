# Backend Endpoints Documentation

## AI-Powered Claim Verification System

This document details all the backend endpoints for the fact-checking platform with automatic AI processing.

---

## 🤖 Automatic AI Processing

### Overview
When a user submits a claim, the system **automatically**:
1. Processes the claim with Poe AI (Web-Search model)
2. Generates an AI verdict with disclaimer
3. Stores the AI verdict in the database
4. Updates claim status to 'ai_approved'

**Disclaimer**: All AI responses include: *"This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers."*

### Responsibility Tracking
- **AI-only verdicts**: Responsibility = `ai` (CRECO not responsible)
- **Edited by fact-checker**: Responsibility = `creco` (CRECO responsible)

---

## 📋 Claim Endpoints

### 1. Submit Claim (with Auto AI Processing)
**POST** `/api/claims/submit`

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "category": "politics",
  "claimText": "The claim text to verify",
  "videoLink": "optional video URL",
  "sourceLink": "optional source URL",
  "imageUrl": "optional image URL"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Claim submitted successfully",
  "claim": {
    "id": "uuid",
    "category": "politics",
    "status": "ai_approved",
    "submittedDate": "2024-01-01T00:00:00Z"
  },
  "pointsAwarded": 10,
  "isFirstClaim": false
}
```

**What Happens Automatically**:
1. Claim is saved to database
2. AI processes the claim using Poe AI Web-Search
3. AI verdict is saved with disclaimer
4. Claim status updated to 'ai_approved'
5. User receives points

---

### 2. Get My Claims
**GET** `/api/claims/my`

**Authentication**: Required

**Query Parameters**:
- `status` (optional): Filter by status (pending, ai_approved, human_approved, etc.)

**Response**:
```json
{
  "success": true,
  "claims": [
    {
      "id": "uuid",
      "title": "Claim title",
      "category": "politics",
      "status": "ai_approved",
      "submittedDate": "2024-01-01",
      "verdictDate": null,
      "verdict": "needs_context",
      "verdictText": "AI explanation...",
      "sources": [],
      "factCheckerName": "Fact Checker"
    }
  ]
}
```

---

### 3. Get Claim Details
**GET** `/api/claims/:claimId`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "claim": {
    "id": "uuid",
    "title": "Claim title",
    "description": "Full claim description",
    "category": "politics",
    "status": "ai_approved",
    "submittedBy": "user@example.com",
    "submittedDate": "2024-01-01T00:00:00Z",
    "verdictDate": null,
    "verdict": "needs_context",
    "human_verdict": null,
    "ai_verdict": "needs_context",
    "verdictText": "AI explanation...",
    "human_explanation": null,
    "ai_explanation": "AI explanation with sources...",
    "sources": [
      {
        "title": "Source name",
        "url": "https://source.com",
        "type": "ai"
      }
    ],
    "ai_disclaimer": "This is an AI-generated response. CRECO is not responsible...",
    "ai_edited": false,
    "verdict_responsibility": "ai",
    "ai_confidence": 0.75,
    "factChecker": {
      "name": "Fact Checker",
      "email": null,
      "avatar": null
    },
    "imageUrl": null,
    "videoLink": null
  }
}
```

---

## 🔍 Fact Checker Endpoints

### 4. Get Pending Claims (with AI Suggestions)
**GET** `/api/fact-checker/pending-claims`

**Authentication**: Required (Fact Checker role)

**Response**:
```json
{
  "success": true,
  "claims": [
    {
      "id": "uuid",
      "title": "Claim title",
      "description": "Full description",
      "category": "politics",
      "submittedBy": "user@example.com",
      "submittedDate": "2024-01-01",
      "imageUrl": null,
      "videoLink": null,
      "sourceLink": null,
      "ai_suggestion": {
        "verdict": "needs_context",
        "explanation": "AI analysis of the claim...",
        "confidence": 0.75,
        "sources": [],
        "disclaimer": "This is an AI-generated response. CRECO is not responsible...",
        "isEdited": false
      }
    }
  ]
}
```

---

### 5. Submit New Verdict (Manual Fact Check)
**POST** `/api/fact-checker/submit-verdict`

**Authentication**: Required (Fact Checker role)

**Request Body**:
```json
{
  "claimId": "uuid",
  "verdict": "verified",
  "explanation": "Detailed explanation by fact checker",
  "sources": [
    {
      "title": "Source name",
      "url": "https://source.com"
    }
  ],
  "time_spent": 300
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verdict submitted successfully",
  "verdictId": "uuid"
}
```

**Notes**:
- This creates a **new** verdict from scratch (not based on AI)
- Responsibility automatically set to 'creco'
- Claim status updated to 'human_approved'

---

### 6. Approve/Edit AI Verdict
**POST** `/api/fact-checker/approve-ai-verdict`

**Authentication**: Required (Fact Checker role)

**Request Body** (Approve without changes):
```json
{
  "claimId": "uuid",
  "approved": true
}
```

**Request Body** (Edit AI verdict):
```json
{
  "claimId": "uuid",
  "approved": false,
  "editedVerdict": "misleading",
  "editedExplanation": "Updated explanation by fact checker",
  "additionalSources": [
    {
      "title": "Additional source",
      "url": "https://newsource.com"
    }
  ]
}
```

**Response** (Approved without changes):
```json
{
  "success": true,
  "message": "AI verdict approved without changes.",
  "responsibility": "ai"
}
```

**Response** (Edited):
```json
{
  "success": true,
  "message": "Verdict edited and approved. CRECO is now responsible.",
  "responsibility": "creco"
}
```

**What Happens**:
- If approved without changes: Responsibility stays `ai`
- If edited in any way: 
  - AI verdict marked as `is_edited_by_human = true`
  - Responsibility changed to `creco`
  - Fact checker ID recorded as editor
  - Edit timestamp recorded

---

### 7. Get AI Suggestions
**GET** `/api/fact-checker/ai-suggestions`

**Authentication**: Required (Fact Checker role)

**Response**:
```json
{
  "success": true,
  "claims": [
    {
      "id": "uuid",
      "title": "Claim title",
      "description": "Description",
      "category": "politics",
      "submittedBy": "user-id",
      "submittedDate": "2024-01-01",
      "aiSuggestion": {
        "status": "needs_context",
        "verdict": "AI analysis...",
        "confidence": 0.75,
        "sources": []
      }
    }
  ]
}
```

---

### 8. Get Fact Checker Stats
**GET** `/api/fact-checker/stats`

**Authentication**: Required (Fact Checker role)

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalVerified": 25,
    "pendingReview": 10,
    "timeSpent": "15 minutes avg",
    "accuracy": "92%"
  }
}
```

---

## 🔐 Authentication Endpoints

### 9. Register User
**POST** `/api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "username",
  "phone": "+254712345678",
  "country": "Kenya"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "user"
  }
}
```

---

### 10. Login
**POST** `/api/auth/login`

**Request Body**:
```json
{
  "identifier": "user@example.com OR username",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "user"
  }
}
```

---

### 11. Register Fact Checker
**POST** `/api/admin/register-fact-checker`

**Authentication**: Required (Admin role)

**Request Body**:
```json
{
  "email": "checker@example.com",
  "password": "securepassword",
  "username": "factchecker1",
  "phone": "+254712345678",
  "country": "Kenya",
  "specialization": "politics"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Fact checker registered successfully",
  "factChecker": {
    "id": "uuid",
    "email": "checker@example.com",
    "username": "factchecker1",
    "role": "fact_checker"
  }
}
```

---

## 🤖 AI Service Endpoints

### 12. AI Chat
**POST** `/api/ai/chat`

**Authentication**: Required

**Request Body**:
```json
{
  "prompt": "What is the process for fact-checking?",
  "hasAttachments": false,
  "attachmentTypes": []
}
```

**Response**:
```json
{
  "success": true,
  "response": "AI response text...\n\n⚠️ This response is AI-generated. CRECO is not responsible for any implications. Please verify important information.",
  "model": "Web-Search",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

### 13. AI Fact Check (Direct)
**POST** `/api/ai/fact-check`

**Authentication**: Required

**Request Body**:
```json
{
  "claimText": "The claim to verify",
  "category": "politics",
  "sourceLink": "https://source.com"
}
```

**Response**:
```json
{
  "success": true,
  "aiVerdict": {
    "verdict": "needs_context",
    "explanation": "Detailed AI analysis...",
    "confidence": "medium",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "disclaimer": "This is an AI-generated preliminary verdict. Human fact-checkers will review this claim."
}
```

---

### 14. AI Health Check
**GET** `/api/ai/health`

**Authentication**: Not required

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "message": "AI service is operational",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 📊 Database Schema Updates

### AI Verdicts Table
```sql
CREATE TABLE hakikisha.ai_verdicts (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES hakikisha.claims(id),
  verdict VARCHAR(20),
  confidence_score FLOAT,
  explanation TEXT,
  evidence_sources JSONB,
  ai_model_version VARCHAR(50),
  disclaimer TEXT DEFAULT 'This is an AI-generated response. CRECO is not responsible...',
  is_edited_by_human BOOLEAN DEFAULT false,
  edited_by_fact_checker_id UUID REFERENCES hakikisha.users(id),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Verdicts Table (Human)
```sql
CREATE TABLE hakikisha.verdicts (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES hakikisha.claims(id),
  fact_checker_id UUID REFERENCES hakikisha.users(id),
  verdict VARCHAR(20),
  explanation TEXT,
  evidence_sources JSONB,
  ai_verdict_id UUID REFERENCES hakikisha.ai_verdicts(id),
  based_on_ai_verdict BOOLEAN DEFAULT false,
  responsibility VARCHAR(50) CHECK (responsibility IN ('ai', 'creco')) DEFAULT 'creco',
  time_spent INTEGER,
  is_final BOOLEAN DEFAULT true,
  approval_status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🔄 Workflow Summary

### User Submits Claim
1. User submits claim via mobile app
2. **Backend automatically calls Poe AI**
3. AI verdict saved with disclaimer
4. User can immediately see AI response
5. Claim enters fact-checker queue

### Fact Checker Reviews
1. Fact checker sees claim with AI suggestion
2. Can choose to:
   - **Approve AI verdict** (responsibility stays 'ai')
   - **Edit AI verdict** (responsibility changes to 'creco')
   - **Create new verdict** (responsibility is 'creco')

### User Sees Result
1. AI verdict shown immediately with disclaimer
2. When fact checker edits/approves:
   - If unchanged: Still shows AI disclaimer
   - If edited: Shows CRECO takes responsibility

---

## ⚙️ Configuration

### Environment Variables
```env
POE_API_KEY=ZceEiyLZg4JbvhV8UDpnY0rMT037Pi4QIhdPy4pirRA
AI_MODEL=Web-Search
JWT_SECRET=your-jwt-secret
DATABASE_URL=your-database-url
```

### POE AI Configuration
- **Model**: Web-Search
- **API Base URL**: https://api.poe.com/v1
- **Library**: OpenAI SDK (compatible)

---

## 📝 Notes

- All AI responses include disclaimers
- Responsibility tracking is automatic
- Fact checkers can see AI suggestions immediately
- Users get instant AI feedback
- Human review adds CRECO responsibility
- Phone numbers include country codes automatically
- Country selection from full country list
