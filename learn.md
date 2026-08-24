# Joineazy — Development Learning Journal

> This file is a running log of **every change, decision, and addition** made during development.
> It is updated after every execution phase so you can trace exactly how the project was built.

---

## 📅 Session 1 — 2026-08-23

### Phase 0: Project Scaffolding & Data Model

**Goal:** Lock repo structure, tooling, and database schema before writing any feature code.

---

### ✅ Step 1 — Monorepo Layout

Created the following top-level structure:

```
Joineazy-task1/
├── frontend/          # React + Vite + Tailwind
├── backend/           # Node.js + Express
├── docs/              # ER diagrams, phases, notes
├── .gitignore
├── README.md
└── learn.md           ← this file
```

---

### ✅ Step 2 — Root Config Files

**`.gitignore`** — Ignores:
- `node_modules/` (all levels)
- `.env` files (secrets never committed)
- Build outputs (`dist/`, `build/`)
- OS/editor junk (`.DS_Store`, `.idea/`, `.vscode/`)
- Docker volumes

**`README.md`** — Stub with project name, stack, and setup instructions placeholder.

---

### ✅ Step 3 — Backend Scaffold

Initialized Node.js project inside `/backend` with the following structure:

```
backend/
├── src/
│   ├── routes/        # Express route definitions
│   ├── controllers/   # Business logic handlers
│   ├── models/        # DB query functions (raw SQL via pg)
│   ├── middleware/     # Auth (JWT), role checks, error handler
│   └── app.js         # Express app setup (no listen here)
├── migrations/        # Raw SQL migration files
├── .env.example       # Template for required env vars
├── server.js          # Entry point — calls app.listen()
├── package.json
└── Dockerfile
```

**Key decisions:**
- Using `pg` (node-postgres) directly instead of an ORM — keeps SQL transparent and educational.
- `app.js` vs `server.js` separation: makes it easier to test `app` without binding a port.
- `.env.example` committed; actual `.env` gitignored.

**Dependencies installed:**
- `express` — web framework
- `pg` — PostgreSQL client
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT issue/verify
- `dotenv` — env var loading
- `cors` — cross-origin for frontend calls
- `helmet` — security headers

**Dev dependencies:**
- `nodemon` — auto-restart on file change

---

### ✅ Step 4 — Frontend Scaffold

Initialized Vite + React project inside `/frontend` with the following structure:

```
frontend/
├── src/
│   ├── pages/         # Route-level page components
│   ├── components/    # Reusable UI components
│   ├── api/           # Axios instance + API call functions
│   ├── context/       # React Context (AuthContext)
│   ├── hooks/         # Custom React hooks
│   ├── App.jsx        # Root component + React Router setup
│   └── main.jsx       # Vite entry point
├── public/
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── package.json
```

**Key decisions:**
- Tailwind CSS v3 configured with JIT mode.
- React Router v6 for client-side routing.
- Axios for HTTP calls with a base URL pointing to `VITE_API_URL`.
- `AuthContext` will hold JWT token + user role — shared across all pages.

---

### ✅ Step 5 — PostgreSQL Schema Design

Designed the full relational schema. Here are the tables and their purpose:

| Table | Purpose |
|---|---|
| `users` | All registered users (students + admins) |
| `groups` | Student-created groups |
| `group_members` | Many-to-many: users ↔ groups |
| `assignments` | Assignments created by admins |
| `assignment_targets` | Which groups an assignment is assigned to |
| `submissions` | Submission confirmation status per group per assignment |

**Relationships:**
- A `group` is created by a `user` (FK: `created_by → users.id`)
- `group_members` joins `groups` and `users`
- An `assignment` is created by a `user` (admin)
- `assignment_targets` joins `assignments` and `groups`
- `submissions` links `assignments` + `groups` with a status enum

**Status enum for submissions:** `pending` → `step1_confirmed` → `confirmed`

---

### ✅ Step 6 — SQL Migration File

Created `backend/migrations/001_init.sql` with:
- `CREATE TABLE` statements for all 6 tables
- Proper foreign key constraints with `ON DELETE CASCADE`
- `ENUM` type for `user.role` (`student`, `admin`)
- `ENUM` type for `submissions.status`
- Timestamps (`created_at`) on all tables using `DEFAULT NOW()`

---

### ✅ Step 7 — ER Diagram

Created `docs/er_diagram.md` with a Mermaid `erDiagram` block showing all tables, columns, and relationships. Can be rendered in GitHub or any Mermaid-compatible viewer.

---

### ✅ Step 8 — Docker Setup

**`backend/Dockerfile`:**
- Base image: `node:20-alpine`
- Copies `package.json`, runs `npm install`, copies source
- Exposes port `5000`
- Runs `npm run start`

**`docker-compose.yml` (root):**
- `db` service: `postgres:16-alpine`, persists data via named volume
- `backend` service: builds from `./backend`, depends on `db`, reads env vars
- `frontend` service: Vite dev server running `npm run dev` on port 5173 with volume mount

**Migration strategy:** `001_init.sql` is mounted into `/docker-entrypoint-initdb.d/` so Postgres runs it automatically on first boot.

---

### 🎉 Phase 0 Complete!
We have successfully set up the Monorepo, Database Schema, Backend scaffolding, Frontend scaffolding with Tailwind CSS, and Docker orchestration.

---

## 📅 Session 2 — 2026-08-23

### Phase 1: Authentication & Roles

**Goal:** JWT-based auth working end-to-end for both student and admin roles.

---

### ✅ Step 1 — Backend Auth Controller
Created `backend/src/controllers/auth.js`:
- `register`: Validates input, hashes password with `bcryptjs`, assigns 'student' or 'admin' role, saves to `users` table via Postgres, and issues a JWT.
- `login`: Verifies email/password against DB, compares hashes, and issues a JWT on success.

### ✅ Step 2 — Backend Routes
- Created `backend/src/routes/auth.js` mapping `/register` and `/login` to the controller.
- Mounted the routes in `backend/src/app.js` under `/auth`.

### ✅ Step 3 — Frontend AuthContext
Created `frontend/src/context/AuthContext.jsx`:
- Manages global state for `user`, `token`, and `loading`.
- Implements `login`, `register`, and `logout` functions.
- Automatically handles redirects based on `user.role` to `/admin-dashboard` or `/student-dashboard`.

### ✅ Step 4 — Frontend UI Pages
Created stunning, modern UI components with Tailwind CSS glassmorphism, glowing gradients, and animated blobs:
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Register.jsx` (includes role selection buttons for testing)
- Updated `frontend/src/App.jsx` to route to these pages and set up protected route placeholders for the dashboards.

---

### 🎉 Phase 1 Complete!
Users can now securely register, log in, and be routed to their respective dashboards based on their role.

### 📝 Next Steps
- Phase 2: Student Groups (creating groups, viewing groups, adding members).

---

## 📅 Session 3 — 2026-08-23

### Phase 2: Student Groups

**Goal:** Students can create and manage their own groups. A student can only belong to one group.

---

### ✅ Step 1 — Database Constraint
Updated `group_members` table: changed `UNIQUE (group_id, user_id)` to `UNIQUE (user_id)` to enforce **one student = one group** at the database level.

### ✅ Step 2 — Backend Groups Controller
Created `backend/src/controllers/groups.js` with five handlers:

| Handler | Endpoint | Purpose |
|---|---|---|
| `createGroup` | `POST /groups` | Creates a group, auto-adds creator as member. Checks if student is already in a group. |
| `getMyGroup` | `GET /groups/mine` | Returns student's group + member list, or `null` if no group. |
| `addMember` | `POST /groups/:id/members` | Adds student by email. Validates: exists, is student, not in any group, requester is creator. |
| `removeMember` | `DELETE /groups/:id/members/:userId` | Creator can remove members. Cannot remove self (use leave). |
| `leaveGroup` | `POST /groups/leave` | Leave group. If creator leaves, transfers ownership or deletes group. |

### ✅ Step 3 — Backend Groups Routes
Updated `backend/src/routes/groups.js`:
- All routes protected by `verifyToken` + `requireRole('student')`.
- `/leave` placed before `/:id` to avoid route parameter conflicts.

Activated route in `backend/src/app.js`: `app.use('/groups', require('./routes/groups'))`.

### ✅ Step 4 — Frontend API Helpers
Created `frontend/src/api/groups.js` with functions: `createGroup`, `getMyGroup`, `addMember`, `removeMember`, `leaveGroup`.

### ✅ Step 5 — Frontend Student Dashboard
Created `frontend/src/pages/StudentDashboard.jsx`:
- Matches the existing glassmorphism design (dark gradient bg, animated blobs, blurred glass cards).
- **No group state**: Shows "Create Group" form with name input.
- **Has group state**: Shows group info card with member list (avatars, badges for Creator/You) and "Add Member" form (email input).
- Creator sees remove buttons (hover-reveal) on other members.
- Leave group button with confirmation.
- Success/error feedback banners with auto-dismiss.

Updated `frontend/src/App.jsx`: replaced inline placeholder with `<StudentDashboard />` component.

---

### 🎉 Phase 2 Complete!
Students can now create groups, add members by email, remove members, and leave groups. The one-student-one-group rule is enforced at both the database and application level.

### 📝 Next Steps
- Phase 3: Admin Assignments (creating assignments, targeting groups).

---

## 📅 Session 4 — 2026-08-24

### Phase 3: Admin — Assignments

**Goal:** Professors can create and manage assignments, assign to all or specific groups.

---

### ✅ Step 1 — Backend Assignments Controller
Created `backend/src/controllers/assignments.js` with six handlers:

| Handler | Endpoint | Purpose |
|---|---|---|
| `createAssignment` | `POST /assignments` | Creates assignment with title, description, due date, OneDrive link, target (all/specific). Inserts `assignment_targets` rows for specific groups. |
| `updateAssignment` | `PUT /assignments/:id` | Updates assignment fields + re-syncs targeted groups. Only owner can edit. |
| `getAllAssignments` | `GET /assignments` | Returns all assignments with targeted groups populated. |
| `getAssignment` | `GET /assignments/:id` | Returns a single assignment with targeted groups. |
| `deleteAssignment` | `DELETE /assignments/:id` | Deletes an assignment. Only owner can delete. Cascades to `assignment_targets`. |
| `getAllGroups` | `GET /assignments/groups` | Returns all groups with member counts (for the admin targeting UI). |

### ✅ Step 2 — Backend Assignments Routes
Updated `backend/src/routes/assignments.js`:
- All routes protected by `verifyToken` + `requireRole('admin')`.
- `/groups` placed before `/:id` to avoid route parameter conflicts.

Activated route in `backend/src/app.js`: `app.use('/assignments', require('./routes/assignments'))`.

### ✅ Step 3 — Frontend API Helpers
Created `frontend/src/api/assignments.js` with functions: `createAssignment`, `updateAssignment`, `getAllAssignments`, `getAssignment`, `deleteAssignment`, `getAllGroups`.

### ✅ Step 4 — Frontend Admin Dashboard
Created `frontend/src/pages/AdminDashboard.jsx`:
- Matches glassmorphism design (slate-indigo gradient bg, animated blobs, blurred glass cards).
- **Empty state**: Shows "No Assignments Yet" with create button.
- **Create/Edit form**: Slide-in form with title, description, due date (datetime-local), OneDrive link, and target selector (All Groups / Specific Groups).
- **Group picker**: When "Specific Groups" is selected, shows a grid of toggleable group buttons with member counts.
- **Assignment cards**: List view with title, description, due date badge (green/red for overdue), target badge, OneDrive link, and hover-reveal edit/delete buttons.
- **Targeted groups** shown as tag chips on specific-target assignments.

Updated `frontend/src/App.jsx`: replaced inline placeholder with `<AdminDashboard />` component.

---

### 🎉 Phase 3 Complete!
Admins can now create, edit, and delete assignments. They can target assignments to all groups or select specific groups from the targeting UI.

### 📝 Next Steps
- Phase 4: Student Assignment Viewing & Two-Step Submission Confirmation.

---

## 📅 Session 5 — 2026-08-24

### Phase 4: Student — Viewing & Submission Confirmation

**Goal:** Students see assigned work and confirm submission with two-step verification.

---

### ✅ Step 1 — Backend Submissions Controller
Created `backend/src/controllers/submissions.js` with three handlers:

| Handler | Endpoint | Purpose |
|---|---|---|
| `getMyAssignments` | `GET /submissions/my-assignments` | Fetches all assignments targeted to the student's group (target='all' OR specific group match), with submission status. |
| `confirmStep1` | `POST /submissions/:assignmentId/confirm-step1` | Upserts submission record, sets status to `step1_confirmed`. Only works if status is `pending`. |
| `confirmFinal` | `POST /submissions/:assignmentId/confirm-final` | Updates status from `step1_confirmed` → `confirmed`, sets `confirmed_at` timestamp. |

### ✅ Step 2 — Backend Submissions Routes
Updated `backend/src/routes/submissions.js`:
- All routes protected by `verifyToken` + `requireRole('student')`.
- Static route `/my-assignments` placed before dynamic `/:assignmentId`.

Activated route in `backend/src/app.js`: `app.use('/submissions', require('./routes/submissions'))`.

### ✅ Step 3 — Frontend API Helpers
Created `frontend/src/api/submissions.js` with functions: `getMyAssignments`, `confirmStep1`, `confirmFinal`.

### ✅ Step 4 — Frontend Student Dashboard Update
Major update to `frontend/src/pages/StudentDashboard.jsx`:
- **Tabbed navigation**: "My Group" and "Assignments" tabs with a pill-style switcher.
- **Group Progress bar**: Shows overall completion percentage with animated fill.
- **Assignment cards**: Each shows title, description, due date badge (green/red for overdue), OneDrive link, creator name, and per-assignment progress bar.
- **Two-step confirmation UI**:
  - Pending → "Yes, I Have Submitted" button (amber gradient)
  - Step 1 confirmed → "Confirm Final Submission" button (emerald gradient)
  - Confirmed → Shows confirmation timestamp with checkmark
- **Confirmation modal**: Glassmorphism modal dialog with cancel/confirm for each step.
- **Status badges**: Color-coded (pending/step1/confirmed) on each assignment card.
- **Badge counter** on the Assignments tab showing confirmed/total.

---

### 🎉 Phase 4 Complete!
Students can now view assignments for their group, confirm submission via two-step verification, and see their group's progress reflected in progress bars and badges.

---

## 📅 Session 6 — 2026-08-25

### Phase 5: Admin — Tracking & Analytics

**Goal:** Professors can monitor submission status and group performance.

---

### ✅ Step 1 — Backend Analytics Controller
Created `backend/src/controllers/analytics.js` with handlers for analytics and status tracking:

| Handler | Endpoint | Purpose |
|---|---|---|
| `getAnalyticsSummary` | `GET /analytics/summary` | Calculates overall platform stats: total assignments, groups, students, and overall completion rate across all expected submissions. |
| `getAssignmentStatus` | `GET /assignments/:id/status` | Fetches group-wise and student-wise breakdown of submissions for a specific assignment. |
| `acceptSubmission` | `POST /assignments/:id/groups/:groupId/accept` | Updates a submission's status to `accepted`. |
| `rejectSubmission` | `POST /assignments/:id/groups/:groupId/reject` | Updates a submission's status to `rejected`. |

### ✅ Step 2 — Backend Analytics Routes
Updated routing to include `/analytics` and linked it in `app.js`. Secured all routes under the `admin` role using `verifyToken` and `requireRole('admin')`.

### ✅ Step 3 — Frontend API Helpers
Created `frontend/src/api/analytics.js` with functions for `getAnalyticsSummary`, `getAssignmentStatus`, `acceptSubmission`, and `rejectSubmission`.

### ✅ Step 4 — Frontend Admin Dashboard & Analytics UI
Updated `AdminDashboard.jsx` and related components:
- **Summary Cards**: Display total assignments, total groups, total students, and the overall completion rate.
- **Assignment Status View**: A detailed table view for a selected assignment showing each targeted group, their members, and their current submission status (e.g., pending, confirmed).
- **Review Actions**: Added buttons in the status table for admins to "Accept" or "Reject" a confirmed submission.
- Maintained the overall glassmorphism design language across the new analytics widgets and tables.

---

### 🎉 Phase 5 Complete!
Admins can now effectively monitor platform usage, view detailed submission statuses for specific assignments, and accept or reject submissions from groups.

### 📝 Next Steps
- Phase 7: Documentation.

---

## 📅 Session 7 — 2026-08-25

### Phase 6: Polish, Docker Integration, Responsiveness

**Goal:** Everything runs together cleanly with one-command startup and looks presentable on all screen sizes.

---

### ✅ Step 1 — Frontend Dockerfile (Multi-Stage)
Created `frontend/Dockerfile`:
- **Stage 1 (Build):** `node:20-alpine` — installs deps, copies source, runs `npm run build`. Accepts `VITE_API_URL` as a build arg.
- **Stage 2 (Serve):** `nginx:alpine` — copies the built `dist/` into nginx's html root. Serves on port 80.

### ✅ Step 2 — Nginx Configuration
Created `frontend/nginx.conf`:
- **SPA fallback:** All routes → `index.html` (so React Router works on refresh).
- **Gzip compression:** Enabled for text, CSS, JS, SVG, JSON.
- **Static asset caching:** 1-year immutable cache for hashed assets.
- **API reverse proxy:** `/api/` routes proxied to `http://backend:5000/`.

### ✅ Step 3 — Backend Dockerfile Improvements
Updated `backend/Dockerfile`:
- Set `NODE_ENV=production`.
- Uses `npm install --omit=dev` for smaller image (no devDependencies like nodemon).
- Added `HEALTHCHECK` instruction using `wget --spider` against `/health`.
- Changed `CMD` from `npm run start` to `node server.js` (avoids npm overhead).

### ✅ Step 4 — Docker Compose Overhaul
Updated `docker-compose.yml`:
- **db:** Added `healthcheck` using `pg_isready` — backend now uses `depends_on: condition: service_healthy` so it won't crash on startup when Postgres isn't ready.
- **backend:** Uses `restart: unless-stopped`. `FRONTEND_URL` updated to `http://localhost:3000`.
- **frontend:** Builds from `frontend/Dockerfile` (nginx). Exposed on port `3000:80`. Depends on backend.
- One-command startup: `docker-compose up --build` boots all three services.

### ✅ Step 5 — Responsive UI Pass
Applied mobile/tablet fixes across both dashboards:
- **Touch-friendly buttons:** Remove/Edit/Delete buttons that were hover-only (`opacity-0 group-hover:opacity-100`) now use `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` — always visible on touch devices, hover-reveal on desktop.
- **Modal safety:** Confirmation modal in StudentDashboard now has `max-h-[90vh] overflow-y-auto` and `p-4` on the overlay to prevent content from being cut off on small screens.
- Login and Register pages were already responsive — no changes needed.

### ✅ Step 6 — Global Error Handling (401 Interceptor)
Updated `frontend/src/api/axios.js`:
- Added an Axios **response interceptor** that catches 401/403 errors.
- If the user had a token (was logged in), it auto-clears `localStorage` and redirects to `/login`.
- Prevents cryptic error messages when the JWT expires mid-session.

### ✅ Step 7 — Seed Script
Created `backend/seed.js`:
- Truncates all tables, then inserts demo data in a single transaction.
- **2 admins:** `prof.smith@university.edu`, `prof.jones@university.edu`
- **6 students:** `alice@`, `bob@`, `charlie@`, `diana@`, `eve@`, `frank@`
- **3 groups:** Alpha Squad (Alice, Bob), Beta Team (Charlie, Diana), Gamma Force (Eve, Frank)
- **3 assignments:** 1 all-groups, 1 specific (Alpha+Beta), 1 specific (Gamma, overdue)
- **4 submissions:** Mix of confirmed, step1_confirmed, accepted, rejected states.
- All passwords: `password123`
- Added `"seed": "node seed.js"` to `backend/package.json`.

**Verified:** Seed script runs successfully, frontend builds cleanly (337KB gzip: 102KB).

---

### 🎉 Phase 6 Complete!
The app now has production-ready Docker orchestration (one-command startup), responsive UI across all screen sizes, global auth error handling, and a comprehensive seed script for demos.

### 📝 Next Steps
- Phase 7: Documentation (README, API reference, ER diagram, architecture).

