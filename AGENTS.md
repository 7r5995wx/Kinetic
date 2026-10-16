# Kinetic contributor guide

## Scope and structure

Kinetic is a modular monolith. Keep the Next.js application in `frontend/`, the Spring Boot application in `backend/`, product and engineering decisions in `docs/`, and CI workflows in `.github/workflows/`. Do not introduce microservices, Redis, credentials, generated build output, or a real environment file without an explicit design decision.

## Backend conventions

- Use Java 21, Spring Boot, Spring Security, Spring Data JPA, Bean Validation, PostgreSQL, and Flyway.
- Expose JSON only beneath `/api/v1`; controllers accept/request DTOs and delegate to services. Do not expose JPA entities directly.
- Put authorization in the service layer as well as route protection. Apply transactions at service boundaries.
- Add migrations for every schema change; do not rely on Hibernate DDL in shared environments.
- Use `@Version` for task conflict detection and return the documented conflict response.
- Convert expected failures in centralized exception handling; preserve correlation IDs in logs and errors.

## Frontend conventions

- Use Next.js App Router, strict TypeScript, Tailwind, shadcn/ui, and Lucide icons.
- Keep server/client boundaries deliberate. Browser requests must include credentials; do not store session tokens in localStorage.
- Make keyboard drag-and-drop, focus management, loading, empty, error, and mobile states first-class requirements.
- Treat WebSocket messages as hints and resynchronize through REST after reconnect or an unknown version.

## Security and quality

- Never commit `.env`, cookies, access tokens, connection strings, or production exports. Update only `*.example` placeholders.
- Validate input on the server; authorize every protected resource based on workspace membership.
- Run focused tests for changed code. Add unit tests for services and integration tests for authorization, migrations, and concurrency-sensitive flows.
- Preserve unrelated changes. Inspect Git status before modifying an existing repository; do not force-reset, rewrite history, push, or change repository visibility without explicit approval.

## Documentation discipline

When changing behavior, update the relevant documents in `docs/` and keep `PROJECT_SPEC.md`, `README.md`, API, schema, security, realtime, and deployment descriptions consistent. State any implementation deviation and its migration path.
