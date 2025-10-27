# Deployment Instructions

## Critical Database Migration Required

**IMPORTANT**: Before deploying, you MUST run the latest migration to add missing columns.

### Step 1: Run Migration 020

```bash
# Connect to your PostgreSQL database
psql -h your-db-host -U your-db-user -d your-db-name

# Run the migration
node migrations/020_add_missing_columns.js
```

Or if using the migration runner:

```bash
npm run migrate
```

### What This Migration Does

**Migration 020** adds the following critical columns:

1. **ai_verdicts table**:
   - `disclaimer` - AI responsibility disclaimer text
   - `is_edited_by_human` - Tracks if fact-checker edited the AI verdict
   - `edited_by_fact_checker_id` - Which fact-checker edited it
   - `edited_at` - When the edit occurred

2. **verdicts table**:
   - `responsibility` - Who is responsible: 'creco' or 'ai'

### Why These Columns Are Critical

The system now supports:
- **Automatic AI responses** to user claims with disclaimers
- **Fact-checker review and editing** of AI verdicts
- **Responsibility tracking**: 
  - AI verdicts keep disclaimer ("CRECO not responsible")
  - Edited verdicts remove disclaimer ("CRECO responsible")

### Step 2: Verify Migration Success

```sql
-- Check ai_verdicts table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'hakikisha' 
  AND table_name = 'ai_verdicts';

-- Check verdicts table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'hakikisha' 
  AND table_name = 'verdicts';
```

You should see the new columns listed.

### Step 3: Environment Variables

Ensure your `.env` file has:

```bash
# Poe AI Configuration
POE_API_KEY=ZceEiyLZg4JbvhV8UDpnY0rMT037Pi4QIhdPy4pirRA

# Database Configuration
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
```

### Step 4: Deploy Application

```bash
# Install dependencies
npm install

# Build application
npm run build

# Start server
npm start
```

### Step 5: Verify Deployment

1. **Test claim submission**: Submit a claim through the mobile app
2. **Check AI response**: Verify that AI automatically responds with disclaimer
3. **Check fact-checker dashboard**: Ensure fact-checkers can see AI verdicts
4. **Test editing**: Have a fact-checker edit an AI verdict
5. **Verify responsibility**: Check that edited verdicts show "CRECO responsible"

### Common Issues

#### Issue: "column disclaimer does not exist"

**Solution**: Run migration 020

```bash
node migrations/020_add_missing_columns.js
```

#### Issue: "column responsibility does not exist"

**Solution**: Run migration 020 (same as above)

#### Issue: Slow queries

**Solution**: Ensure indexes are created. Run:

```sql
CREATE INDEX IF NOT EXISTS idx_ai_verdicts_claim_id ON hakikisha.ai_verdicts(claim_id);
CREATE INDEX IF NOT EXISTS idx_ai_verdicts_edited ON hakikisha.ai_verdicts(is_edited_by_human);
CREATE INDEX IF NOT EXISTS idx_verdicts_claim_id ON hakikisha.verdicts(claim_id);
CREATE INDEX IF NOT EXISTS idx_verdicts_responsibility ON hakikisha.verdicts(responsibility);
```

### Performance Optimization for 5M Users

After migration, run these optimization commands:

```sql
-- Analyze tables for better query planning
ANALYZE hakikisha.claims;
ANALYZE hakikisha.ai_verdicts;
ANALYZE hakikisha.verdicts;
ANALYZE hakikisha.users;

-- Vacuum to reclaim space
VACUUM ANALYZE hakikisha.claims;
VACUUM ANALYZE hakikisha.ai_verdicts;
VACUUM ANALYZE hakikisha.verdicts;
```

### Rollback (if needed)

If you need to rollback migration 020:

```bash
# This will remove the new columns
node migrations/020_add_missing_columns.js down
```

**WARNING**: This will lose data in the new columns!

## Support

If you encounter any issues during deployment, check the logs:

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View database logs
tail -f /var/log/postgresql/postgresql-*.log
```
