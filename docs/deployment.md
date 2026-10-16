# Deployment

## Target topology

Deploy `frontend/` to Vercel Hobby, `backend/` as a Render Free Web Service, and PostgreSQL on Neon Free. Configure Vercel environment variables for backend target routing (`BACKEND_API_INTERNAL_URL` or `NEXT_PUBLIC_BACKEND_URL`, and `NEXT_PUBLIC_WS_URL` for direct WebSockets); configure Render with the JDBC URL, database user/password, allowed frontend origin, and production cookie settings using provider-managed secrets. Do not commit real values.

In production, Next.js App Router (`frontend/next.config.mjs`) proxies browser REST requests through a same-origin rewrite (`/api/v1/:path*` -> `${BACKEND_URL}/api/v1/:path*`). This establishes a same-origin boundary for browser requests, allowing production session cookies to use `SameSite=Lax`, `Secure=true`, and `HttpOnly=true` rather than relying on cross-site third-party cookies that are blocked by modern browser privacy controls (Safari ITP, Firefox ETP, Chrome 3rd-party cookie deprecation). Authenticated endpoints emit `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` to prevent public proxy or edge caching.

Because Vercel serverless functions cannot hold persistent duplex WebSocket connections, WebSockets connect directly to Render (`wss://<render-backend>/ws`). To avoid cross-site cookie dependencies on WebSocket upgrade, the frontend acquires a short-lived, single-use ticket via `POST /api/v1/auth/ws-ticket` (authenticated via same-origin session + CSRF) and passes it in the STOMP `CONNECT` frame. The backend validates and atomically consumes the ticket during STOMP connection establishment.

## Backend foundation deployment contract

`backend/Dockerfile` produces a Java 21 runtime image and runs the Spring Boot JAR as a non-root user. Render should use `backend/` as the Docker build context and configure `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and `ALLOWED_ORIGINS` in its secret environment settings. The backend reads Render's `PORT` environment variable (falling back to `8080` locally), starts Flyway before JPA validation, and exposes public liveness at `/api/v1/health` and `/actuator/health`. Do not expose any additional Actuator endpoint without an explicit security review.

For local development, `backend/compose.yaml` provides PostgreSQL 17. Copy the placeholder-only `backend/.env.example` to ignored `backend/.env`, set a local-only `DATABASE_PASSWORD`, run `docker compose up -d postgres`, and then run the Maven wrapper. The exact commands are maintained in the repository README.

## Verified free-tier assumptions (checked 2026-10-16)

| Provider | Current constraint | Kinetic implication |
| --- | --- | --- |
| Vercel Hobby | Personal-project plan; 100 deployments/day, 45-minute builds, 100 GB Fast Data Transfer; usage overages can pause Hobby projects. | Suitable for a portfolio frontend, not a production SLA. Avoid using Vercel Functions for the persistent WebSocket backend. |
| Render Free Web Service | 0.1 CPU / 512 MB, one instance only; spins down after 15 minutes without inbound HTTP or WebSocket messages and wakes in about a minute; 750 free instance-hours/workspace/month. | Cold starts and disconnects are normal. Clients need reconnect + REST recovery. No horizontal fan-out or persistent local files. |
| Neon Free | 100 projects, 1 GB Postgres storage/project, 100 CU-hours/project/month, autoscaling to 2 CU, 10 branches/project, 6-hour instant-restore window. | Use connection pooling, close idle JDBC connections, monitor compute/storage, and treat the plan as a portfolio/demo tier rather than a durable production guarantee. |

Provider terms change. Recheck before launch: [Vercel limits](https://vercel.com/docs/limits), [Vercel plans](https://vercel.com/docs/plans), [Render free services](https://render.com/docs/free), [Render compute plans](https://render.com/docs/compute-plans), and [Neon Free-plan update](https://neon.com/blog/neon-free-plan-1-gb-per-project).

## WebSockets, connections, and suspension risk

Render currently treats incoming WebSocket messages as activity, but a new connection after idle still triggers startup and takes roughly a minute. The free service can restart at any time and cannot scale beyond one instance. Keep STOMP heartbeats modest, explicitly surface reconnecting/offline status, use REST as source of truth, and do not use “keep awake” traffic as a reliability mechanism. Render may suspend free services when free hours are exhausted or for unusual service-initiated public traffic; Neon compute can scale to zero and its free compute/storage limits must be monitored. Configure HikariCP conservatively after validating Neon’s current connection guidance and actual service limits; do not claim a fixed connection cap without confirming the chosen Neon endpoint's setting.

## Release checklist

1. Run backend unit/integration tests, Flyway migration validation, frontend tests, CI workflow checks (.github/workflows/ci.yml), and Next.js production build.
2. Apply production environment settings; verify exact CORS origin, secure cookie attributes, CSRF, database TLS, health check, and WebSocket origin.
3. Deploy backend, verify migration and health endpoint, then deploy frontend with its backend URL.
4. Smoke-test registration, login, cross-browser session/CSRF behavior, authorization denial, task conflict response, real-time update, and reconnect after backend restart.
5. Record deployed URLs and monitoring/usage checks in a release note without exposing credentials.
