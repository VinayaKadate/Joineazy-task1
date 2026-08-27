# Joineazy — Student, Group & Assignment Management System

Joineazy is a comprehensive web application designed to streamline student group formations and assignment tracking. It provides a dual-role interface:
- **Students** can form groups, view assignments targeted to them, and confirm their submissions via a two-step process.
- **Professors (Admins)** can create assignments targeting all or specific groups, track real-time submission progress, and accept/reject student work.

**Stack:** React.js + Tailwind CSS · Node.js + Express · PostgreSQL · Docker · JWT Auth

---

## 🏗 Architecture Overview

The system is built as a modern, decoupled monolith using a standard three-tier architecture:

1. **Frontend (Client):** Single Page Application built with React, Vite, and Tailwind CSS. It communicates with the backend via RESTful APIs and uses Axios with interceptors for global JWT error handling.
2. **Backend (API):** Node.js and Express server. It handles business logic, JWT authentication, and role-based access control.
3. **Database:** PostgreSQL database. Data is queried using the `pg` client directly (raw SQL) to optimize performance and ensure transparent queries.

---

## 🚀 Quick Start (Docker - Recommended)

The entire application (Frontend, Backend, and Database) is containerized and orchestrated using Docker Compose.

```bash
# 1. Clone the repository
git clone <repo-url>
cd Joineazy-task1

# 2. Copy the environment variables template
cp backend/.env.example backend/.env

# 3. Boot the full stack (this will build the frontend and backend images)
docker-compose up --build
```

- **Frontend UI:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **PostgreSQL:** `localhost:5432`

---

## 🛠 Local Development (Without Docker)

If you prefer to run the services directly on your host machine:

### 1. Database Setup
Ensure you have a PostgreSQL instance running locally. Create a database (e.g., `joineazy_db`) and update the `backend/.env` file with your credentials.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # Fill in DB credentials and JWT secret
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will run at [http://localhost:5173](http://localhost:5173).

---

## 🌱 Seeding Demo Data

To populate the database with demo users, groups, assignments, and submissions, run the seed script from the `backend` directory (ensure the database is running):

```bash
cd backend
npm run seed
```

**Demo Accounts Created (Password for all is `password123`):**
- **Admins:** `prof.smith@university.edu`, `prof.jones@university.edu`
- **Students:** `alice@university.edu`, `bob@university.edu`, `charlie@university.edu`, `diana@university.edu`, `eve@university.edu`, `frank@university.edu`

---

## 🧱 Database Schema

```mermaid
erDiagram
    users {
        int     id           PK
        varchar name
        varchar email        UK
        text    password_hash
        enum    role
        timestamp created_at
    }

    courses {
        int     id           PK
        varchar title
        text    description
        int     created_by   FK
        timestamp created_at
    }

    enrollments {
        int     id           PK
        int     course_id    FK
        int     user_id      FK
        timestamp joined_at
    }

    groups {
        int     id           PK
        varchar name
        int     created_by   FK
        timestamp created_at
    }

    group_members {
        int     id           PK
        int     group_id     FK
        int     user_id      FK
        timestamp joined_at
    }

    assignments {
        int     id              PK
        int     course_id       FK
        varchar title
        text    description
        timestamp due_date
        text    onedrive_link
        int     created_by      FK
        varchar target
        enum    submission_type
        timestamp created_at
    }

    assignment_targets {
        int     id            PK
        int     assignment_id FK
        int     group_id      FK
    }

    submissions {
        int     id            PK
        int     assignment_id FK
        int     group_id      FK
        int     user_id       FK
        enum    status
        text    submission_link
        timestamp confirmed_at
        timestamp created_at
    }

    users        ||--o{ courses           : "creates (admin)"
    courses      ||--o{ enrollments       : "has students"
    users        ||--o{ enrollments       : "enrolls in"
    users        ||--o{ groups            : "creates"
    users        ||--o{ group_members     : "belongs to"
    groups       ||--o{ group_members     : "has"
    courses      ||--o{ assignments       : "contains"
    assignments  ||--o{ assignment_targets : "targets"
    groups       ||--o{ assignment_targets : "targeted by"
    assignments  ||--o{ submissions       : "has"
    groups       ||--o{ submissions       : "submits (group)"
    users        ||--o{ submissions       : "submits (individual)"
```


---

## 📡 API Endpoint Reference

All protected routes require a JWT token in the `Authorization` header (`Bearer <token>`).

### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new student or admin |
| POST | `/login` | Public | Login with email and password |
| POST | `/google` | Public | Login via Google OAuth |

### Groups (`/groups`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Student | Create a new group |
| GET | `/mine` | Student | Get current student's group and members |
| POST | `/leave` | Student | Leave the current group |
| POST | `/:id/members` | Student | Add a member to the group by email |
| DELETE | `/:id/members/:userId` | Student | Remove a member from the group |

### Assignments (`/assignments`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/groups` | Admin | List all groups (used for targeting) |
| POST | `/` | Admin | Create a new assignment |
| GET | `/` | Admin | Get all assignments |
| GET | `/:id` | Admin | Get a single assignment |
| PUT | `/:id` | Admin | Update an assignment |
| DELETE | `/:id` | Admin | Delete an assignment |

### Submissions (`/submissions`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/my-assignments` | Student | Get assignments assigned to the student's group |
| POST | `/:assignmentId/confirm-step1` | Student | Step 1 confirmation (submit link) |
| POST | `/:assignmentId/confirm-final` | Student | Final confirmation |

### Analytics (`/analytics`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/summary` | Admin | Get overall platform statistics |
| GET | `/assignments/:id/status` | Admin | Get group submission status for a specific assignment |
| PUT | `/assignments/:id/groups/:groupId/accept` | Admin | Accept a group's submission |
| PUT | `/assignments/:id/groups/:groupId/reject` | Admin | Reject a group's submission |

---

## 📸 Screenshots

*(To be added by user: Drop your screenshots into a `docs/screenshots/` folder)*

- **Login Screen:** `![Login Page](./docs/screenshots/login.png)`
- **Student Dashboard:** `![Student Dashboard](./docs/screenshots/student_dashboard.png)`
- **Professor Dashboard:** `![Professor Dashboard](./docs/screenshots/professor_dashboard.png)`
- **Assignment View:** `![Assignment Detail](./docs/screenshots/assignment_detail.png)`

---

## ⚖️ Key Design & Deployment Decisions

1. **"Fieldnotes" UI/UX Design System:** The application strictly adheres to a ledger-style "Fieldnotes" aesthetic. This means no heavy shadows, no rounded UI pills, and reliance on hairline borders (`border-rule`) with a structured, data-heavy grid. We chose this because it ensures high information density for academic settings while feeling crisp, professional, and distinct from typical "bubbly" SaaS apps. Monospace fonts are used for IDs/Metadata, and Serifs for headers, giving it an editorial feel.
2. **Course-Based Grouping:** Assignments are scoped by `course_id`. We introduced an "All Courses" discovery mechanism so students can actively browse and self-enroll in courses created by professors, avoiding the overhead of professors manually adding students.
3. **Text-Based Status Indicators:** Rather than relying on colored background pills for statuses, we rely on bold, mono-spaced text indicators. This aligns with the Fieldnotes aesthetic, improving accessibility and maintaining a clean, document-like presentation.
4. **Raw SQL over ORM:** Used `pg` directly to allow for maximum transparency and control over complex JOINs (especially for analytics and group targeting).
5. **Stateless JWT Auth:** Chosen over session-based auth to decouple the frontend from the backend, making the API truly RESTful and easier to scale.
6. **Multi-stage Docker Builds:** The frontend uses a multi-stage Dockerfile that builds the Vite application and serves the static assets using an optimized Nginx server, resulting in a tiny, production-ready image.

---

## 📖 Additional Documentation
- [Build Phases](./phases.md)