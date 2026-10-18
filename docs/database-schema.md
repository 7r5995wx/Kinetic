# Database schema

## Database rules

PostgreSQL is the durable source of truth. Flyway owns schema history under `backend/src/main/resources/db/migration`; Hibernate validates rather than creates schemas outside local experiments. UUID primary keys, `timestamptz` audit fields, foreign keys, and check constraints are used throughout.

## Core relationships

```text
users 1 ── * workspace_memberships * ── 1 workspaces
workspaces 1 ── * projects 1 ── * kanban_columns 1 ── * tasks
users 1 ── * tasks (creator / optional assignee)
tasks 1 ── * comments; users 1 ── * comments
workspaces 1 ── * activity_events
```

## Tables

| Table | Key columns and constraints |
| --- | --- |
| `users` | `id`, `email`, unique case-normalized `email_normalized`, `display_name`, `password_hash`, `created_at`, `updated_at`; password hash never leaves backend. |
| `workspaces` | `id`, `name`, `created_by`, timestamps; non-blank name constraint. |
| `workspace_memberships` | composite unique `(workspace_id,user_id)`, `role` check `OWNER|ADMIN|MEMBER`, timestamps; application ensures at least one owner. |
| `projects` | `id`, `workspace_id`, `name`, optional `description`, `archived_at`, `created_by`, timestamps. |
| `kanban_columns` | `id`, `project_id`, `name`, `position`, `archived_at`; unique active logical ordering per project. |
| `tasks` | `id`, `project_id`, `column_id`, `title`, `description`, `priority`, nullable `assignee_id`, nullable `due_date`, `position`, `version`, `created_by`, `archived_at`, timestamps. |
| `task_comments` | `id`, `task_id` (CASCADE), `author_id` (FK users), `content`, timestamps; deterministic `(task_id, created_at, id)` index. |
| `workspace_activities` | `id`, `workspace_id` (CASCADE), nullable `actor_id` (SET NULL), `type`, `description`, nullable `project_id`, nullable `task_id`, `payload`, `created_at`; deterministic `(workspace_id, created_at DESC, id DESC)` index. |

## Indexes

Create indexes for every foreign key and query path: membership `(user_id, workspace_id)`, projects `(workspace_id, archived_at)`, columns `(project_id, position)`, tasks `(project_id, column_id, position)`, tasks `(project_id, assignee_id, due_date)`, active tasks `(project_id, archived_at)`, comments `(task_id, created_at)`, and activity `(workspace_id, created_at DESC)`. Add a GIN/trigram index only after choosing the exact PostgreSQL text-search query and measuring its need.

## Integrity and retention

Use restrict/soft archival for referenced workspaces, projects, columns, and tasks so activity stays meaningful. Comments can be soft-deleted with author attribution retained. Every move/update locks or version-checks the relevant task; operations affecting ordering execute transactionally. Store no session state in application tables for the initial server-managed Spring Session approach unless the selected session repository requires it.
