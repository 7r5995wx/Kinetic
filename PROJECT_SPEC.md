# Kinetic product specification

## Purpose

Kinetic is a portfolio-quality, real-time collaborative project-management SaaS. A user can sign in, work in one or more workspaces, organize projects as configurable Kanban boards, manage tasks, discuss work, and see timely changes from collaborators.

## Users and stories

| User story | Acceptance criteria |
| --- | --- |
| As a visitor, I can register, sign in, sign out, and view or update my profile. | Invalid input produces field errors; a successful sign-in establishes an HttpOnly server session; sign-out invalidates it. |
| As an owner, I can create a workspace and invite or manage members. | Only workspace owners can change membership or roles; members have only the documented permissions. |
| As a member, I can create projects and arrange their Kanban columns. | The project opens with ordered columns; authorized users can rename, reorder, add, and archive columns. |
| As a collaborator, I can create and update tasks. | A task has title, optional description/due date/assignee, priority, column, ordering key, timestamps, creator, and version. |
| As a keyboard or pointer user, I can move a task. | Movement works with pointer and keyboard, announces its result, persists order, and reports a concurrent-edit conflict without silently overwriting. |
| As a collaborator, I can comment and understand changes. | Comments are visible to authorized members; task-changing actions create an activity event. |
| As a member, I can find relevant work. | Scoped search, filters, sort, and cursor/page pagination return only authorized workspace data. |
| As an active collaborator, I see changes made by others. | WebSocket hints update the UI; reconnect always fetches authoritative REST state before claiming synchronization. |

## Non-goals for the first release

File uploads, email delivery, public sharing links, time tracking, billing, notifications outside the app, automation rules, mobile-native clients, and multi-region/high-availability deployments are out of scope. Redis is intentionally deferred.

## Product quality bar

The dashboard is responsive; every screen has useful loading, empty, permission-denied, offline/reconnecting, and recoverable error states. The API remains the source of truth. Accessibility includes semantic controls, visible focus, labels, contrast, keyboard operation, and screen-reader feedback for movement and live updates.

See [architecture](docs/architecture.md), [API contract](docs/api-contract.md), [schema](docs/database-schema.md), [security](docs/security.md), and [implementation plan](docs/implementation-plan.md).
