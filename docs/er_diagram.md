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
        timestamp created_at
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
        int     id           PK
        varchar title
        text    description
        timestamp due_date
        text    onedrive_link
        int     created_by   FK
        varchar target
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
        timestamp confirmed_at
        timestamp created_at
    }

    users        ||--o{ groups            : "creates"
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
| `users` → `groups` | 1-to-many | A user (student) creates a group |
| `users` ↔ `groups` via `group_members` | many-to-many | Users belong to groups |
| `users` → `assignments` | 1-to-many | An admin creates assignments |
| `assignments` ↔ `groups` via `assignment_targets` | many-to-many | Assignment assigned to specific groups |
| `assignments` ↔ `groups` via `submissions` | many-to-many | One submission record per group per assignment |

---

## Submission Status Flow

```
pending  ──▶  step1_confirmed  ──▶  confirmed
   (default)    (student clicks      (student confirms
                 "I've submitted")    in the modal)
```
