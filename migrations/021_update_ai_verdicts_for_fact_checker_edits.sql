-- Migration to add fact-checker edit tracking to ai_verdicts table

-- Add is_edited_by_human column if it doesn't exist
ALTER TABLE ai_verdicts 
ADD COLUMN IF NOT EXISTS is_edited_by_human BOOLEAN DEFAULT false;

-- Add edited_by_fact_checker_id column if it doesn't exist
ALTER TABLE ai_verdicts 
ADD COLUMN IF NOT EXISTS edited_by_fact_checker_id UUID REFERENCES users(id);

-- Add edited_at column if it doesn't exist
ALTER TABLE ai_verdicts 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

-- Add index for faster queries on edited verdicts
CREATE INDEX IF NOT EXISTS idx_ai_verdicts_edited 
ON ai_verdicts(is_edited_by_human, created_at DESC);

-- Add index for fact checker edits
CREATE INDEX IF NOT EXISTS idx_ai_verdicts_fact_checker 
ON ai_verdicts(edited_by_fact_checker_id) 
WHERE edited_by_fact_checker_id IS NOT NULL;

-- Update existing AI verdicts to have is_edited_by_human = false if NULL
UPDATE ai_verdicts 
SET is_edited_by_human = false 
WHERE is_edited_by_human IS NULL;
