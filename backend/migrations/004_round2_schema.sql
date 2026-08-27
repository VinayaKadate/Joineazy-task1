-- =============================================================================
-- Migration: 004_round2_schema.sql
-- Description: Round 2 schema changes — courses, enrollments, group leaders,
--              and course-scoped assignments with individual/group types.
-- =============================================================================

-- ── Courses ───────────────────────────────────────────────────────────────────
-- Each course is taught by a professor (admin) and contains assignments.

CREATE TABLE IF NOT EXISTS courses (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  professor_id  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Enrollments (many-to-many: students ↔ courses) ───────────────────────────
-- A student can enroll in multiple courses; a course has many students.

CREATE TABLE IF NOT EXISTS enrollments (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER     NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id    INTEGER     NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);

-- ── Extend Groups: add leader_id ──────────────────────────────────────────────
-- The group leader is the only member who can acknowledge group submissions.

ALTER TABLE groups ADD COLUMN IF NOT EXISTS leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Backfill: set leader_id = created_by for all existing groups
UPDATE groups SET leader_id = created_by WHERE leader_id IS NULL;

-- ── Extend Assignments: add course_id and submission_type ─────────────────────
-- course_id scopes an assignment to a course (nullable for backward compat).
-- submission_type controls whether it's individual or group-based.

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) NOT NULL DEFAULT 'group'
  CHECK (submission_type IN ('individual', 'group'));

-- ── Indexes for new query patterns ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_enrollments_student   ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course    ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course    ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_professor     ON courses(professor_id);
