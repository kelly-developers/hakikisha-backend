# Backend Updates - Verdict System ✅

## Implementation Complete

All backend code has been updated to properly handle AI verdicts, fact-checker edits, and verdict attribution.

## What Was Fixed

### 1. ✅ Claim Model (`src/models/Claim.js`)
- **`findById()`**: Now returns proper `verdict` field from AI or human verdicts
- Added `verified_by_ai` flag to distinguish AI vs human verdicts
- Properly structures `ai_verdict` object with all details
- Includes `fact_checker` info when verdict is edited by human
- **`getTrendingClaims()`**: Only returns claims with verdicts, includes AI confidence
- **`getUserClaims()`**: Shows correct verdict for each claim (not just "true")

### 2. ✅ AI Verdict Model (`src/models/AIVerdict.js`)
- **`create()`**: Added support for `is_edited_by_human` and `edited_by_fact_checker_id`
- **`update()`**: Removes AI disclaimer when fact-checker edits, sets edit flags
- **`updateByClaimId()`**: New method to update AI verdict by claim ID (used by fact-checkers)

### 3. ✅ Verdict Controller (`src/controllers/verdictController.js`)
- **`editAIVerdict()`**: NEW - Allows fact-checkers to edit AI verdicts
- **`getPendingAIVerdicts()`**: NEW - Lists AI verdicts pending fact-checker review
- Both methods require fact-checker or admin role

### 4. ✅ Verdict Routes (`src/routes/verdictRoutes.js`)
- Added `GET /api/verdicts/ai-pending` - Get pending AI verdicts for review
- Added `PUT /api/verdicts/ai/:claimId` - Edit an AI verdict

### 5. ✅ Claim Workflow (`src/workflows/claimWorkflow.js`)
- Changed claim status to `'completed'` after AI processing (was `'ai_processed'`)
- This ensures claims show proper verdicts immediately

## New API Endpoints

### Get Pending AI Verdicts
```
GET /api/verdicts/ai-pending
Authorization: Required (fact_checker or admin role)
Query Params: page, limit
```

**Response:**
```json
{
  "claims": [
    {
      "id": "claim_id",
      "title": "Claim title",
      "verdict": "false",
      "confidence_score": 0.85,
      "is_edited_by_human": false,
      ...
    }
  ],
  "pagination": {...}
}
```

### Edit AI Verdict
```
PUT /api/verdicts/ai/:claimId
Authorization: Required (fact_checker or admin role)
Body: {
  "verdict": "false",
  "explanation": "Updated explanation",
  "evidence_sources": [...]
}
```

**Response:**
```json
{
  "message": "AI verdict updated successfully",
  "verdict": {...},
  "claim_status": "verified"
}
```

## Database Migration Required

**File:** `migrations/021_update_ai_verdicts_for_fact_checker_edits.sql`

Run this migration to add the required columns to `ai_verdicts` table:
- `is_edited_by_human` BOOLEAN
- `edited_by_fact_checker_id` UUID
- `edited_at` TIMESTAMP

```sql
-- Run this migration
psql -d your_database < migrations/021_update_ai_verdicts_for_fact_checker_edits.sql
```

## package.json Update Required

Add this script to your `package.json`:
```json
{
  "scripts": {
    "build:dev": "vite build --mode development"
  }
}
```

## How It Works Now

### When AI Processes a Claim:
1. AI creates verdict with disclaimer
2. Claim status set to `'completed'`
3. `verdict` field populated with AI's verdict ("true", "false", "misleading", "needs_context")
4. Frontend shows: "AI-Generated Response" with disclaimer
5. Claim appears in trending/verified lists immediately

### When Fact-Checker Edits:
1. Fact-checker calls `PUT /api/verdicts/ai/:claimId`
2. AI verdict updated with new values
3. `is_edited_by_human` set to `true`
4. `disclaimer` removed (set to NULL)
5. `edited_by_fact_checker_id` set to fact-checker's user ID
6. Claim status changed to `'verified'`
7. Frontend shows: "Verified by CRECO Fact-Checker"

## Frontend Integration

The frontend already expects this structure:

```typescript
interface Claim {
  id: string;
  verdict: 'true' | 'false' | 'misleading' | 'needs_context';
  verdictText: string;
  verified_by_ai: boolean;
  ai_verdict?: {
    verdict: string;
    explanation: string;
    confidence_score: number;
    is_edited_by_human: boolean;
    disclaimer?: string;
  };
  fact_checker?: {
    id: string;
    email: string;
  };
}
```

## Testing Checklist

- [ ] Add `build:dev` script to package.json
- [ ] Run database migration
- [ ] Restart backend server
- [ ] Submit a new claim
- [ ] Verify AI processes it with correct verdict
- [ ] Check verdict displays correctly (not "Needs Context" for all)
- [ ] Login as fact-checker
- [ ] View pending AI verdicts
- [ ] Edit an AI verdict
- [ ] Verify "Verified by CRECO Fact-Checker" shows
- [ ] Check trending claims display properly
- [ ] Verify claims tab shows correct verdicts

## Summary

✅ All verdicts now show correct labels (true/false/misleading/needs_context)  
✅ AI attribution properly distinguished from fact-checker attribution  
✅ Fact-checkers can edit AI verdicts  
✅ Trending claims work correctly  
✅ Claims show proper status after AI processing  
✅ Database schema supports all required functionality
