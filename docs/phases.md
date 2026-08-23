# Joineazy Task 1 — Student, Group & Assignment Management System
## Phased Build Plan

**Deadline:** Tuesday, 25th August 2026, 11:30 AM sharp
**Stack:** React.js + Tailwind CSS · Node.js + Express · PostgreSQL · Docker · JWT Auth

---

## Phase 0 — Project Scaffolding & Data Model

**Goal:** Repo structure, tooling, and schema locked before any feature code.

- [ ] Initialize monorepo: `/frontend` (React + Vite + Tailwind), `/backend` (Node + Express)
- [ ] Set up `.gitignore`, root `README.md` stub, commit conventions
- [ ] Backend: Express app skeleton, env config (`.env`), folder structure (`routes/`, `controllers/`, `models/`, `middleware/`)
- [ ] Frontend: Vite + React skeleton, Tailwind configured, basic routing (React Router), folder structure (`pages/`, `components/`, `api/`)
- [ ] Design PostgreSQL schema:
  - `users` (id, name, email, password_hash, role: student/admin)
  - `groups` (id, name, created_by)
  - `group_members` (id, group_id, user_id)
  - `assignments` (id, title, description, due_date, onedrive_link, created_by, target: all/specific groups)
  - `assignment_targets` (id, assignment_id, group_id) — for "specific groups" assignment
  - `submissions` (id, assignment_id, group_id, status: pending/step1_confirmed/confirmed, confirmed_at)
- [ ] Write SQL migration files or set up Prisma schema
- [ ] Draft ER diagram (Mermaid or draw.io export) — save into `/docs`
- [ ] Docker: `Dockerfile` for backend, `docker-compose.yml` with Postgres service; verify `docker-compose up` boots a clean DB

**Exit criteria:** `docker-compose up` gives a running Postgres with migrated schema; frontend and backend both run locally with placeholder pages.

---

## Phase 1 — Authentication & Roles

**Goal:** JWT-based auth working end-to-end for both roles.

- [ ] Backend: `/auth/register`, `/auth/login` endpoints (bcrypt password hashing)
- [ ] JWT issuing + verification middleware
- [ ] Role-based middleware (`requireRole('student')`, `requireRole('admin')`)
- [ ] Frontend: Register/Login pages, auth context/store, protected route wrapper
- [ ] Role-based redirect after login (student dashboard vs admin dashboard)

**Exit criteria:** Can register as student or admin, log in, get a valid JWT, and hit a protected test route that respects role.

---

## Phase 2 — Student: Groups

**Goal:** Students can create and manage their own groups.

- [ ] Backend: `POST /groups`, `GET /groups/mine`, `POST /groups/:id/members` (add by email/ID)
- [ ] Validation: can't add non-existent students, no duplicate members
- [ ] Frontend: "Create Group" form, "My Group" view, "Add Member" flow
- [ ] Basic group member list UI

**Exit criteria:** A logged-in student can create a group and add other students to it by email/ID.

---

## Phase 3 — Admin: Assignments

**Goal:** Professors can create and manage assignments, assign to groups.

- [ ] Backend: `POST /assignments`, `PUT /assignments/:id`, `GET /assignments` (title, description, due date, OneDrive link)
- [ ] Assign to all groups vs specific groups (`assignment_targets`)
- [ ] Frontend: Admin "Create/Edit Assignment" form, assignment list view
- [ ] Group-targeting UI (select all / select specific groups)

**Exit criteria:** Admin can create an assignment, edit it, and target it to all or specific groups.

---

## Phase 4 — Student: Viewing & Submission Confirmation

**Goal:** Students see assigned work and confirm submission with two-step verification.

- [ ] Backend: `GET /assignments/for-my-group`, `POST /submissions/:assignmentId/confirm-step1`, `POST /submissions/:assignmentId/confirm-final`
- [ ] Frontend: Assignment list with OneDrive link, due date
- [ ] Two-step confirm UI ("Yes, I have submitted" → confirm modal/step)
- [ ] Group progress bar / completion badge component (based on submission status)

**Exit criteria:** Student can view assignments for their group, click through two-step confirmation, and see it reflected in the group's progress indicator.

---

## Phase 5 — Admin: Tracking & Analytics

**Goal:** Professors can monitor submission status and group performance.

- [ ] Backend: `GET /assignments/:id/status` (group-wise and student-wise breakdown), `GET /analytics/summary` (completion counts)
- [ ] Frontend: Admin dashboard — table of groups x assignments with status
- [ ] Simple summary counts / basic chart (e.g. completion % per assignment)

**Exit criteria:** Admin dashboard shows, per assignment, which groups/students have confirmed submission, plus a summary view.

---

## Phase 6 — Polish, Docker Integration, Responsiveness

**Goal:** Everything runs together cleanly and looks presentable.

- [ ] Full docker-compose: frontend + backend + Postgres all wired, one-command startup
- [ ] Tailwind responsive pass (mobile/tablet breakpoints for key screens)
- [ ] Error handling & loading states across frontend
- [ ] Seed script for demo data (a few students, groups, assignments) — makes demo recording easier

**Exit criteria:** Fresh clone → `docker-compose up` → working app with no manual setup steps.

---

## Phase 7 — Documentation

**Goal:** README meets every documentation requirement in the brief.

- [ ] Overview of implementation
- [ ] Setup & run instructions (local + Docker)
- [ ] API endpoint reference (method, path, auth required, payload/response)
- [ ] Database schema & relationships (embed ER diagram)
- [ ] Architecture overview (frontend + backend + DB flow diagram)
- [ ] Key design and deployment decisions (why Postgres, why JWT, tradeoffs made under time pressure)

**Exit criteria:** README is a standalone document someone unfamiliar with the project could set up and understand from.

---

## Phase 8 — Deployment (optional, time-permitting)

- [ ] Deploy frontend to Vercel
- [ ] Deploy backend + Postgres to Render/Railway
- [ ] Verify deployed version works end-to-end
- [ ] Skip entirely if it threatens the deadline — platform link is optional

---

## Phase 9 — Demo Video & Submission

- [ ] Record 5–7 min demo: student flow (register → group → confirm submission) then admin flow (create assignment → track progress)
- [ ] Clean up commit history (meaningful messages, no giant single commit)
- [ ] Push final code to GitHub, confirm repo is public/accessible
- [ ] Fill submission PDF: GitHub link, demo video link, platform link (optional)
- [ ] Name file exactly per convention: `FullName-Task1.pdf`
- [ ] Submit via Google Form **before** 11:30 AM Tuesday, 25th August 2026

---

## Fallback Cuts (if running out of time)

If Phase 5/6 crunch time hits, cut in this order:
1. Analytics charts → replace with plain count text
2. Email-style member invites → plain add-by-ID/email, no notifications
3. Deployment (Phase 8) → skip, rely on local Docker + demo video
4. Responsiveness polish → desktop-first only, note as a "next steps" in README
