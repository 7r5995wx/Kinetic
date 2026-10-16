# Architecture

## Decision

Kinetic starts as a deployable modular monolith: one Next.js frontend and one Spring Boot backend backed by one PostgreSQL database. It is deliberately not a microservice system. The backend is organized by feature (`identity`, `workspace`, `project`, `task`, `comment`, `activity`, `realtime`) with controller, DTO, service, repository, and domain layers within each feature.

```text
Browser ── HTTPS ──> Vercel / Next.js
   │                     │ browser REST + cookie credentials
   └──── WSS + HTTPS ───> Render / Spring Boot ── JDBC ──> Neon PostgreSQL
                               │
                               └── STOMP notifications (single instance)
```

The browser never connects directly to PostgreSQL. PostgreSQL records all authoritative state. A database transaction persists a mutation and an activity event before the backend publishes its best-effort WebSocket notification after commit.

## Modules and boundaries

| Module | Owns | May depend on |
| --- | --- | --- |
| identity | user profile, password credentials, session integration | shared errors/audit |
| workspace | workspaces, membership, roles | identity |
| project | projects, ordered columns | workspace |
| task | tasks, ordering, search/filter, optimistic locking | project, workspace |
| comment | task comments | task, workspace |
| activity | immutable human-readable activity records | identity, workspace, project, task, comment |
| realtime | authenticated STOMP sessions and event fan-out | workspace authorization, published domain events |

No module reads another module's tables through ad-hoc SQL. Cross-module work uses services or domain events inside the same process. This keeps extraction possible later without paying distributed-systems costs now.

## Request and mutation flow

1. The frontend calls `/api/v1` with `credentials: 'include'` and a CSRF header for unsafe methods.
2. Security loads the server-managed session and the service checks the workspace membership/role (`OWNER`, `ADMIN`, or `MEMBER`) for the resource.
3. DTO validation runs; a transactional service performs the mutation and checks `task.version` for task writes.
4. The service writes the activity event in the same transaction. After commit it emits an in-process event consumed by realtime fan-out.
5. The API returns the current resource and version. A websocket event lets other clients refresh the affected projection.

## Ordering and conflicts

Columns and tasks have a numeric `position`. Moving a task uses a single transaction that verifies project/workspace membership, recalculates affected positions, increments the task version, and logs activity. The client sends the version it rendered; a mismatch returns `409 TASK_VERSION_CONFLICT` with the server representation. The client refetches and offers retry/reapply rather than overwriting.

## Realtime and recovery

Spring WebSocket/STOMP is appropriate for a single Render instance and keeps authentication/authorization in the existing backend. It is not an event store. On reconnect, a client marks its view stale, fetches REST snapshots for its active workspace/project, then resumes subscriptions. Events are compact invalidation/change hints with IDs and versions; clients tolerate duplicates, loss, and out-of-order delivery. See [realtime contract](realtime-contract.md).

## Trade-offs and evolution

- Server sessions simplify revocation and avoid browser token storage, but require deliberate CORS, SameSite, CSRF, and cookie-domain configuration.
- A single instance means local WebSocket fan-out only; future horizontal scale requires an external broker or database/outbox-backed relay. Do not add either until measured need exists.
- Numeric positions are understandable for an entry-level portfolio and adequate for small boards. Rebalance positions transactionally; investigate fractional ranks only if reorder contention becomes measurable.
- Postgres full-text/trigram search can meet initial scoped search needs. Add a dedicated search service only when query volume/requirements justify it.
