-- Fix otp_codes table to use consistent column names
-- Rename 'purpose' to 'type' and 'is_used' to 'used' for consistency

-- Check if columns need renaming
DO $$
BEGIN
  -- Rename 'purpose' to 'type' if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'hakikisha' 
    AND table_name = 'otp_codes' 
    AND column_name = 'purpose'
  ) THEN
    ALTER TABLE hakikisha.otp_codes RENAME COLUMN purpose TO type;
  END IF;

  -- Rename 'is_used' to 'used' if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'hakikisha' 
    AND table_name = 'otp_codes' 
    AND column_name = 'is_used'
  ) THEN
    ALTER TABLE hakikisha.otp_codes RENAME COLUMN is_used TO used;
  END IF;

  -- Add 'type' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'hakikisha' 
    AND table_name = 'otp_codes' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE hakikisha.otp_codes ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT '2fa';
  END IF;

  -- Add 'used' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'hakikisha' 
    AND table_name = 'otp_codes' 
    AND column_name = 'used'
  ) THEN
    ALTER TABLE hakikisha.otp_codes ADD COLUMN used BOOLEAN DEFAULT false;
  END IF;

  -- Add 'used_at' column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'hakikisha' 
    AND table_name = 'otp_codes' 
    AND column_name = 'used_at'
  ) THEN
    ALTER TABLE hakikisha.otp_codes ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Ensure the table has the correct structure
ALTER TABLE hakikisha.otp_codes 
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN used SET DEFAULT false;

COMMENT ON TABLE hakikisha.otp_codes IS 'Stores OTP codes for 2FA and email verification';
COMMENT ON COLUMN hakikisha.otp_codes.type IS 'Type of OTP: 2fa, email_verification, password_reset';
COMMENT ON COLUMN hakikisha.otp_codes.used IS 'Whether the OTP has been used';
COMMENT ON COLUMN hakikisha.otp_codes.used_at IS 'Timestamp when the OTP was used';
