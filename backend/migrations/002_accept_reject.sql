-- =============================================================================
-- Migration: 002_accept_reject.sql
-- Description: Add 'accepted' and 'rejected' to submission_status enum,
--              add submission_link column, drop file_path column.
-- =============================================================================

-- Add new enum values
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'rejected';

-- Add submission_link column for students to provide a link to their work
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_link TEXT;

-- Add admin_remarks column for admin to provide feedback
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS admin_remarks TEXT;

-- Drop file_path column (replaced by submission_link)
ALTER TABLE submissions DROP COLUMN IF EXISTS file_path;
