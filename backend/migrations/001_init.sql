-- =============================================================================
-- Migration: 001_init.sql
-- Description: Initial schema for Joineazy — users, groups, assignments,
--              submissions, and linking tables.
-- =============================================================================

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('student', 'admin');

CREATE TYPE submission_status AS ENUM ('pending', 'step1_confirmed', 'confirmed');

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)        NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT                NOT NULL,
  role          user_role           NOT NULL DEFAULT 'student',
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ── Groups ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  created_by  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Group Members (many-to-many: users ↔ groups) ─────────────────────────────

CREATE TABLE IF NOT EXISTS group_members (
  id         SERIAL PRIMARY KEY,
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)                    -- one student can only be in one group
);

-- ── Assignments ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assignments (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(200) NOT NULL,
  description    TEXT,
  due_date       TIMESTAMPTZ  NOT NULL,
  onedrive_link  TEXT,
  created_by     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target         VARCHAR(20)  NOT NULL DEFAULT 'all'
                   CHECK (target IN ('all', 'specific')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Assignment Targets (for target = 'specific') ──────────────────────────────

CREATE TABLE IF NOT EXISTS assignment_targets (
  id             SERIAL PRIMARY KEY,
  assignment_id  INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  group_id       INTEGER NOT NULL REFERENCES groups(id)      ON DELETE CASCADE,
  UNIQUE (assignment_id, group_id)
);

-- ── Submissions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS submissions (
  id             SERIAL PRIMARY KEY,
  assignment_id  INTEGER           NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  group_id       INTEGER           NOT NULL REFERENCES groups(id)      ON DELETE CASCADE,
  status         submission_status NOT NULL DEFAULT 'pending',
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, group_id)   -- one submission record per group per assignment
);

-- ── Indexes for common query patterns ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_group_members_user_id   ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id  ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment  ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_group       ON submissions(group_id);
CREATE INDEX IF NOT EXISTS idx_assignment_targets_aid  ON assignment_targets(assignment_id);
