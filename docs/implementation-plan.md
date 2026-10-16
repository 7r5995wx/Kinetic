# Implementation plan

## Recommended first small milestone: secure vertical slice

Build one local end-to-end path before boards or realtime: Spring Boot and Next.js scaffolds; Docker Compose PostgreSQL; Flyway baseline; registration/login/logout/profile using server sessions and CSRF; workspace creation and membership authorization; and a minimal authenticated dashboard listing the caller's workspaces. Include service/controller tests, Testcontainers migration/auth integration tests where practical, frontend component tests, and one Playwright sign-in-to-dashboard test.

This milestone proves the highest-leverage foundations—repository boundary, database migration, cookie/CORS/CSRF behavior, role authorization, and CI—without prematurely designing drag-and-drop or WebSocket infrastructure.

## Ordered delivery plan

| Milestone | Scope | Exit criteria |
| --- | --- | --- |
| 0. Foundation | Create backend Maven manifest/wrapper, Compose, profiles, security baseline, Flyway, health endpoint, and tests. Frontend tooling remains deferred. | Fresh clone has documented backend startup/tests; PostgreSQL migration and health are verifiable locally. |
| 1. Secure vertical slice | Authentication, profile, workspaces, memberships, guarded dashboard. | Unauthenticated/unauthorized tests pass; session rotation, CSRF, migration, and responsive states are tested. |
| 2. Project boards | Projects, ordered columns, task CRUD, status/priority/assignee/due date, archive states. | All mutations authorize workspace membership and return validated DTOs. |
| 3. Collaboration | Comments, immutable activity feed, search/filter/sort/pagination. | Query scope cannot escape workspace; indexes support demonstrated paths. |
| 4. Accessible movement | Pointer + keyboard movement and task ordering with optimistic locking. | Screen-reader feedback, conflict handling, and ordering transactions are covered by tests. |
| 5. Realtime | STOMP events, auth at handshake/subscription, reconnect/resync. | A second session receives updates; forced reconnect returns to REST-authoritative state. |
| 6. Release hardening | Deployment setup, CI quality gates, accessibility/performance pass, runbook. | Hosted smoke test passes and free-tier limitations are visible in docs/UI. |

## Test strategy

Use JUnit 5 for services and validation; Spring Boot integration tests for controllers/security; Testcontainers PostgreSQL for Flyway/repository paths where practical; and dedicated tests for role checks, transactional ordering, and optimistic-lock conflicts. Frontend tests cover components, keyboard interactions, cache/error states, and API adapters. Playwright covers critical browser journeys including login, authorization denial, task movement, and reconnect recovery. CI should run deterministic lint/type/test/build steps on pull requests, with scheduled dependency checks added once tool selection is complete.

## Deferred decisions and explicit assumptions

- Invitations initially add existing users by email; sending email is deferred. A later email provider can implement invitation delivery without changing membership authorization.
- `OWNER` and `MEMBER` are sufficient for v1; a `VIEWER` role is deliberately deferred.
- PostgreSQL full-text/trigram capabilities are assumed adequate for v1 search; no external index.
- Spring's session storage choice will be finalized in Milestone 0. In a one-instance demo, container-managed session state is acceptable but logout/restart behavior must be documented; a shared session store is required before horizontal scaling.
- The first deployment is a demonstrator, not a production availability commitment. Free-plan changes and limits are revalidated before deployment.
