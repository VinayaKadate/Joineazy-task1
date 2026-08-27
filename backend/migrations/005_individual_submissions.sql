-- =============================================================================
-- Migration: 005_individual_submissions.sql
-- Description: Update submissions table to properly handle individual submissions
--              by adding user_id, making group_id nullable, and splitting the
--              unique constraint into two partial indexes.
-- =============================================================================

-- Make group_id nullable (individual submissions don't strictly need a group_id)
ALTER TABLE submissions ALTER COLUMN group_id DROP NOT NULL;

-- Add user_id column
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Drop the old unique constraint that enforced 1 submission per assignment+group
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_assignment_id_group_id_key;

-- Create partial unique indexes for the two submission types
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique_group 
  ON submissions (assignment_id, group_id) 
  WHERE group_id IS NOT NULL AND user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique_user 
  ON submissions (assignment_id, user_id) 
  WHERE user_id IS NOT NULL;
