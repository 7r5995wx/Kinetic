# Security

## Authentication and sessions

Use Spring Security with server-managed sessions. Kinetic currently uses BCrypt strength 12; raw passwords, password hashes, and session identifiers never appear in API responses or logs. The session cookie is `HttpOnly`, `Secure` in deployed environments, path-scoped, and defaults to `SameSite=Lax`. Registration and login rotate the session ID; logout invalidates the server session and clears the cookie. The default server session timeout is eight hours and is configurable through `SESSION_TIMEOUT`.

In production (Vercel + Render), the Next.js App Router proxies browser REST requests through a same-origin rewrite (`/api/v1/*`), making browser API requests same-origin. This enables strict `SameSite=Lax; Secure; HttpOnly` session cookies and eliminates browser third-party cookie blocking issues (Safari ITP, Chrome Privacy Sandbox, Firefox ETP). Direct cross-origin WebSocket connections to Render bypass cookie limitations via a short-lived single-use ticket mechanism.

## CSRF, CORS, and browser boundaries

State-changing cookie-authenticated REST requests require a CSRF token/header verified by Spring Security. The browser first calls `GET /api/v1/auth/csrf`, which returns a token and sets the readable `XSRF-TOKEN` CSRF cookie. The CSRF cookie's `secure` flag is synchronized with `kinetic.session-cookie-secure` (`KINETIC_SESSION_COOKIE_SECURE`). The client sends that value in `X-CSRF-TOKEN` on every `POST`, `PATCH`, `PUT`, or `DELETE`, including public registration and login. Browser requests use `credentials: 'include'`; application session data and CSRF values never go into localStorage. Permit only exact configured frontend origins, methods, headers, and credentials. Exposed headers explicitly allow `X-Request-Id` for end-to-end tracing. Standard security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`) are enforced on all responses. Apply equivalent origin checks at WebSocket handshake and do not trust a STOMP destination supplied by the client.

## Authorization model

Every protected service resolves the target resource to its workspace and verifies membership before reading or writing. The reusable authenticated-principal and workspace-role checks support `OWNER`, `ADMIN`, and `MEMBER`; workspace services load membership scoped to the resource before invoking role checks. In nested resources (projects, columns, tasks), all parent-child hierarchies are strictly validated (e.g. confirming a column belongs to the specified project before task assignment or listing). This prevents an attacker from supplying mismatched or guessed workspace, project, column, or task IDs. Owners manage workspace settings and membership; admins support administration; members perform day-to-day project/task/comment work in v1. Comment editing is author-only, except owners may remove comments for moderation. APIs return `404` where necessary to avoid revealing inaccessible resource existence. UI visibility is helpful but never authorization.

## Data protection and operations

- Validate DTOs with Bean Validation and query/path parameters with `@Validated` (e.g. `@Min(0)` pagination parameters), enforcing business constraints/lengths server-side.
- Global exception handling intercepts `MethodArgumentTypeMismatchException` (converting to 400 `INVALID_PARAMETER` instead of 500) and `NoResourceFoundException` (converting to 404 `NOT_FOUND` instead of 500) to avoid disclosing internal stack frames or routing exceptions.
- Use parameterized JPA queries, output escaping by React, and a restrictive content-security policy planned with deployed assets.
- Rate-limit login/registration at the edge or application once hosting permits; no per-instance limiter is enabled yet because it would be inconsistent across future replicas. Use generic failed-login responses to reduce account enumeration.
- Log request IDs, actor/resource IDs, security-relevant outcomes, and safe error summaries. Never log secrets, cookies, Authorization values, passwords, or full sensitive payloads.
- Keep dependencies updated, enable TLS, set security headers, and run dependency/security scans in CI when tooling is selected.
- Back up/export deployment data before material production migrations. Free plans are not a production backup strategy.

## Concurrency and audit

Task mutations require the client-rendered optimistic-lock version. On a conflict return `409 TASK_VERSION_CONFLICT` and the current representation or a refetch location. Activity events record actor, action, target, and time in the same transaction as the mutation; they are not a replacement for security audit retention requirements.
