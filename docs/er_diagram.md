# Joineazy — ER Diagram

> Rendered with [Mermaid](https://mermaid.js.org/). Paste into GitHub or [mermaid.live](https://mermaid.live) to view.

```mermaid
erDiagram
    users {
        int     id           PK
        varchar name
        varchar email        UK
        text    password_hash
        enum    role
        varchar auth_provider
        varchar google_id    UK
        timestamp created_at
    }

    courses {
        int     id           PK
        varchar title
        text    description
        int     professor_id FK
        timestamp created_at
    }

    enrollments {
        int     id           PK
        int     student_id   FK
        int     course_id    FK
        timestamp enrolled_at
    }

    groups {
        int     id           PK
        varchar name
        int     created_by   FK
        int     leader_id    FK
        timestamp created_at
    }

    group_members {
        int     id           PK
        int     group_id     FK
        int     user_id      FK
        timestamp joined_at
    }

    assignments {
        int     id           PK
        varchar title
        text    description
        timestamp due_date
        text    onedrive_link
        int     created_by   FK
        int     course_id    FK
        varchar target
        varchar submission_type
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
        enum    status
        text    submission_link
        text    admin_remarks
        timestamp confirmed_at
        timestamp created_at
    }

    users        ||--o{ courses           : "teaches (professor)"
    users        ||--o{ enrollments       : "enrolls in"
    courses      ||--o{ enrollments       : "has students"
    courses      ||--o{ assignments       : "contains"
    users        ||--o{ groups            : "creates"
    users        ||--o{ groups            : "leads"
    users        ||--o{ group_members     : "belongs to"
    groups       ||--o{ group_members     : "has"
    users        ||--o{ assignments       : "creates (admin)"
    assignments  ||--o{ assignment_targets : "targets"
    groups       ||--o{ assignment_targets : "targeted by"
    assignments  ||--o{ submissions       : "has"
    groups       ||--o{ submissions       : "submits"
```

---

## Relationships Summary

| Relationship | Type | Description |
|---|---|---|
| `users` → `courses` | 1-to-many | A professor creates/teaches courses |
| `users` ↔ `courses` via `enrollments` | many-to-many | Students enroll in courses |
| `courses` → `assignments` | 1-to-many | A course contains multiple assignments |
| `users` → `groups` | 1-to-many | A user (student) creates a group |
| `users` → `groups` (leader_id) | 1-to-many | A user is designated as group leader |
| `users` ↔ `groups` via `group_members` | many-to-many | Users belong to groups |
| `users` → `assignments` | 1-to-many | An admin creates assignments |
| `assignments` ↔ `groups` via `assignment_targets` | many-to-many | Assignment assigned to specific groups |
| `assignments` ↔ `groups` via `submissions` | many-to-many | One submission record per group per assignment |

---

## Submission Status Flow

```
pending  ──▶  step1_confirmed  ──▶  confirmed  ──▶  accepted
   (default)    (student clicks      (student confirms   (admin reviews
                 "I've submitted")    in the modal)       and accepts)
                                          │
                                          └──▶  rejected
                                               (admin rejects)
```

---

## Assignment Types (Round 2)

| Type | `submission_type` | Acknowledgment Rule |
|---|---|---|
| Group | `'group'` | Only the group **leader** can acknowledge; propagates to all members |
| Individual | `'individual'` | Each student acknowledges their own submission independently |
