-- Ensure notifications table exists with proper schema
-- This migration is idempotent and safe to run multiple times

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS hakikisha.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  related_entity_type VARCHAR(50),
  related_entity_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON hakikisha.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON hakikisha.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON hakikisha.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON hakikisha.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_read ON hakikisha.notifications(user_id, type, is_read);

-- Add comment
COMMENT ON TABLE hakikisha.notifications IS 'Stores all user notifications including verdict notifications';
COMMENT ON COLUMN hakikisha.notifications.type IS 'Type of notification: verdict_ready, claim_assigned, system_alert, etc.';
COMMENT ON COLUMN hakikisha.notifications.related_entity_id IS 'ID of related entity (claim, verdict, etc.) stored as text for flexibility';
