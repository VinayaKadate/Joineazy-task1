# Joineazy — Student, Group & Assignment Management System

**Stack:** React.js + Tailwind CSS · Node.js + Express · PostgreSQL · Docker · JWT Auth

---

## 🚀 Quick Start (Docker)

```bash
# Clone the repo
git clone <repo-url>
cd Joineazy-task1

# Copy env template and fill in your values
cp backend/.env.example backend/.env

# Boot the full stack
docker-compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **PostgreSQL:** localhost:5432

---

## 🛠 Local Development (without Docker)

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in DB credentials
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
Joineazy-task1/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Node.js + Express API
├── docs/              # ER diagram, phases plan
├── docker-compose.yml
└── README.md
```

---

## 📖 Documentation

- [Build Phases](./docs/phases.md)
- [ER Diagram](./docs/er_diagram.md)
- [Development Journal](./learn.md)

---

## 📡 API Endpoints

> Full API reference will be added in Phase 7.

---

## 🧱 Database Schema

See [ER Diagram](./docs/er_diagram.md) for the full relational schema.

---

## ⚖️ Key Design Decisions

- **Raw SQL over ORM** — `pg` client used directly for full transparency
- **JWT Auth** — stateless, role-based (`student` / `admin`)
- **PostgreSQL** — strong relational integrity for group/submission tracking
- **Docker-first** — one command spins up the entire stack