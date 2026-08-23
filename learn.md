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
