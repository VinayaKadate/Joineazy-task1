-- =============================================================================
-- Migration: 003_add_google_auth.sql
-- Description: Add Google OAuth support — make password_hash nullable and add
--              auth_provider + google_id columns to users.
-- =============================================================================

-- Allow password_hash to be NULL for users who only sign in via Google
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Track how the user originally signed up
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';

-- Store the unique Google subject-ID for fast lookup
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
