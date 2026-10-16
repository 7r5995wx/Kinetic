# Kinetic

> "Move work forward, together."

Kinetic is a portfolio-quality, full-stack collaborative project management SaaS centered around workspaces, projects, Kanban boards, role-based membership, and real-time collaboration.

The application is built as a clean modular monolith:
- `backend/`: Java 21, Spring Boot 4.1.1, Spring Security (session-based authentication with CSRF protection), Spring Data JPA, Bean Validation, PostgreSQL, Flyway, and STOMP-over-WebSocket (`/ws`).
- `frontend/`: Next.js 14 App Router, React 18, strict TypeScript, Tailwind CSS, shadcn/ui primitives, Lucide icons, Vitest, and a zero-dependency STOMP client over native WebSocket.
- `docs/`: Product architecture, API contract, database schema, security model, real-time contract, deployment guide, and implementation roadmap.
- `.github/workflows/`: GitHub Actions CI pipeline running backend tests with a real PostgreSQL service container, and frontend linting, typechecking, tests, and production build.

---

## 1. Repository Layout

```text
├── .github/workflows/ci.yml       GitHub Actions CI pipeline
├── backend/                       Spring Boot modular monolith
│   ├── src/main/java/com/kinetic/ Domain packages (identity, workspace, project, task, realtime, foundation)
│   ├── src/main/resources/        application.yml, profiles, Flyway migrations (db/migration/)
│   ├── compose.yaml               Local PostgreSQL 17 compose service
│   ├── Dockerfile                 Multi-stage Temurin 21 container definition
│   └── pom.xml                    Maven dependencies (Spring Boot, Security, JPA, WebSocket, Flyway, PostgreSQL)
├── frontend/                      Next.js App Router client
│   ├── src/app/                   App Router pages (landing, login, register, dashboard, workspaces, board, task detail, settings)
│   ├── src/components/            shadcn/ui primitives and app shell layout components
│   ├── src/lib/                   API client, auth context, STOMP realtime client, and custom hooks
│   └── package.json               Next.js, React, Tailwind, Vitest, and Radix UI dependencies
├── docs/                          Architectural and operational documentation
├── .env.example                   Unified environment variable template
└── PROJECT_SPEC.md                Product specification and quality bar
```

---

## 2. Prerequisites

- **Java**: OpenJDK 21 LTS (`java -version`)
- **Maven**: Provided via `backend/mvnw`
- **Node.js**: Node.js 20 LTS or higher (`node -v`)
- **npm**: npm 10+ (`npm -v`)
- **Docker**: Docker Desktop (optional for local PostgreSQL; H2 in-memory mode is used during automated test runs)

---

## 3. Local Development Setup

### Backend Startup

1. Copy the backend environment placeholder:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. For local PostgreSQL via Docker:
   ```bash
   cd backend
   docker compose up -d postgres
   ```
   *(Note: If Docker is unavailable, you can connect to an external PostgreSQL instance or run automated tests which use an in-memory database).*
3. Run the Spring Boot application:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
4. Verify backend health:
   - Public application health: `http://localhost:8080/api/v1/health`
   - Spring Actuator health: `http://localhost:8080/actuator/health`

### Frontend Startup

1. Install dependencies reproducibly:
   ```bash
   cd frontend
   npm ci
   ```
2. Copy the frontend environment placeholder:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
   Default settings:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
   NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
   ```
3. Start the Next.js development server:
   ```bash
   cd frontend
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Environment Variables

| Variable | Scope | Default (Local) | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_BACKEND_URL` | Frontend | `http://localhost:8080` | Production backend origin for Next.js same-origin REST proxy |
| `BACKEND_API_INTERNAL_URL`| Frontend | *(optional)* | Internal/private backend URL for server-side proxy rewrites |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | `http://localhost:8080/api/v1` | Public REST API base URL |
| `NEXT_PUBLIC_WS_URL` | Frontend | `ws://localhost:8080/ws` | Public STOMP WebSocket URL (`wss://` in production) |
| `DATABASE_URL` | Backend | `jdbc:postgresql://localhost:5432/kinetic` | JDBC connection string |
| `DATABASE_USERNAME` | Backend | `kinetic` | PostgreSQL user |
| `DATABASE_PASSWORD` | Backend | *(secret)* | PostgreSQL password |
| `ALLOWED_ORIGINS` | Backend | `http://localhost:3000` | Allowed frontend origin for CORS and WebSocket handshake |
| `SESSION_COOKIE_SECURE` | Backend | `false` (`true` in prod) | Requires HTTPS for session and CSRF cookies |
| `SESSION_COOKIE_SAME_SITE`| Backend | `lax` | SameSite attribute for session and CSRF cookies (same-origin proxy enabled) |
| `SESSION_TIMEOUT` | Backend | `8h` | Server session lifetime |

> [!IMPORTANT]
> Never commit `.env` or production credentials. Use provider-managed secret settings in deployed environments.

---

## 5. Security & Real-Time Collaboration Architecture

- **Same-Origin Proxy & Session Authentication**: In production, Next.js App Router (`frontend/next.config.mjs`) proxies browser REST requests via `/api/v1/*` same-origin rewrites. Session cookies are marked `HttpOnly`, `Secure`, and `SameSite=Lax`. Session IDs are rotated on login/register to prevent session fixation.
- **CSRF Defense**: All unsafe REST requests (`POST`, `PATCH`, `PUT`, `DELETE`) require the `X-CSRF-TOKEN` header obtained from `GET /api/v1/auth/csrf`.
- **Cache-Control**: Sensitive authenticated responses are issued with `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` to prevent CDN or shared proxy caching.
- **Authorization**: Workspace membership and role hierarchy (`OWNER`, `ADMIN`, `MEMBER`) are strictly enforced at the service layer on every query and mutation. Cross-workspace ID tampering is blocked.
- **STOMP WebSocket (`/ws`)**:
  - Direct connection to Render backend (`wss://.../ws`) avoiding edge timeouts.
  - Authenticated via short-lived, single-use WebSocket tickets (`POST /api/v1/auth/ws-ticket` -> `ticket` header in STOMP `CONNECT` frame) to avoid cross-site cookie restrictions.
  - In-memory single-use ticket registry (`WebSocketTicketService`) preventing replays with 60-second TTL (migration path: Redis `GETDEL` for horizontal scaling).
  - Origin strictly verified against `ALLOWED_ORIGINS`.
  - Inbound subscriptions to `/topic/projects/{projectId}` and `/topic/workspaces/{workspaceId}` require active workspace membership.
  - Client publishing (`SEND`) to `/topic/**` is prohibited.
  - Events are emitted **strictly post-commit** (`@TransactionalEventListener(phase = AFTER_COMMIT)`) to prevent premature or rolled-back notifications.
- **Frontend Real-Time Synchronization**:
  - Zero-dependency STOMP 1.2 client over native browser `WebSocket` with heartbeats and exponential backoff with jitter.
  - Automatic single-use ticket acquisition via `ticketProvider` on initial connection and automatic reconnections.
  - Event deduplication by `eventId` and stale version checking against `@Version`.
  - Reconnect triggers automatic REST resynchronization to guarantee consistency.

---

## 6. Testing & Build Commands

### Backend Verification
```bash
cd backend
# Run test suite (63 tests)
./mvnw test

# Package production executable JAR
./mvnw package -DskipTests
```

### Frontend Verification
```bash
cd frontend
# Run ESLint
npm run lint

# Check TypeScript types
npm run typecheck

# Run unit & integration test suite (54 tests)
npm test

# Build production Next.js artifact
npm run build
```

---

## 7. CI Pipeline (`.github/workflows/ci.yml`)

The repository includes a GitHub Actions CI workflow that triggers on every push and pull request to `main`:
1. **Backend Job**: Sets up Java 21 (Temurin), spins up a real **PostgreSQL 17** service container (`postgres:17-alpine`), runs the full test suite against real PostgreSQL, and packages the Spring Boot JAR.
2. **Frontend Job**: Sets up Node.js 20 LTS, installs dependencies via `npm ci`, runs ESLint, verifies TypeScript types, runs Vitest unit/integration tests, and compiles the Next.js production build.

---

## 8. Free-Tier Deployment Readiness

The architecture is prepared for zero-cost deployment on leading free-tier platforms:
- **Frontend**: Vercel Hobby
- **Backend**: Render Free Web Service (Docker or native Java runtime)
- **Database**: Neon Serverless PostgreSQL Free Tier

### Free-Tier Operational Characteristics & Limitations:
- **Render Free Spin-Down**: Render spins down inactive web services after 15 minutes of idle time. The Next.js frontend handles this gracefully: when the backend sleeps, the UI shows a non-blocking `Reconnecting...` status with exponential backoff and automatically resynchronizes via REST upon waking.
- **Neon Serverless Pooling**: Neon compute scales down when idle. The backend is configured with HikariCP connection limits (`maximum-pool-size: 5`) to stay well within free tier limits.
- **Same-Origin REST Proxy & Cookie Architecture**: In production, Next.js App Router (`frontend/next.config.mjs`) proxies browser REST requests via `/api/v1/*` rewrites to Render, creating a same-origin boundary for browser requests. This allows session and CSRF cookies to use strict `SameSite=Lax` and `Secure=true`, completely eliminating third-party cookie blocking on Safari ITP, Firefox ETP, and Chrome. WebSockets connect directly to Render (`wss://.../ws`) using single-use tickets acquired over the same-origin REST proxy.

---

## 9. Deployment Checklist

Follow these steps when ready to deploy:

1. **Database Setup (Neon Free)**:
   - Create a project on Neon.
   - Copy the pooled connection string (with SSL mode `sslmode=require`).
2. **Backend Deployment (Render Free Web Service)**:
   - Create a Web Service connected to your repository, using `backend` as the root directory.
   - Select Docker runtime (uses `backend/Dockerfile`) or Java 21.
   - Set environment variables in Render dashboard:
     - `SPRING_PROFILES_ACTIVE`: `prod`
     - `DATABASE_URL`: `jdbc:postgresql://<neon-host>/<db-name>?sslmode=require`
     - `DATABASE_USERNAME`: `<neon-user>`
     - `DATABASE_PASSWORD`: `<neon-password>`
     - `ALLOWED_ORIGINS`: `https://<your-vercel-app>.vercel.app`
     - `SESSION_COOKIE_SECURE`: `true`
     - `SESSION_COOKIE_SAME_SITE`: `lax`
   - Set health check path to `/api/v1/health`.
   - Deploy and verify startup: Flyway migrations execute automatically.
3. **Frontend Deployment (Vercel Hobby)**:
   - Import repository on Vercel, setting Root Directory to `frontend`.
   - Configure Environment Variables:
     - `BACKEND_API_INTERNAL_URL` (or `NEXT_PUBLIC_BACKEND_URL`): `https://<your-render-app>.onrender.com`
     - `NEXT_PUBLIC_WS_URL`: `wss://<your-render-app>.onrender.com/ws`
   - Deploy and verify end-to-end functionality (registration, login, project board, real-time sync).

---

## 10. Current Verification Status & Gaps

- **Automated Tests**:
  - Backend: **63 tests passing** (0 failures, 0 errors). Tests run against H2 locally because Docker is not available on the current machine; CI is configured with a PostgreSQL 17 service container.
  - Frontend: **54 tests passing** (0 failures, 0 errors across 16 test files).
  - TypeScript: **0 errors**.
  - ESLint: **0 errors, 0 warnings**.
  - Production Build: Successfully compiled (7/7 static routes).
- **Verification Gaps**:
  - Docker daemon is not running in the current local environment, preventing local containerized PostgreSQL tests (CI workflow `.github/workflows/ci.yml` is configured to run tests against a live PostgreSQL 17 service container).
  - Remote deployment has not been executed; all deployment preparation is ready for manual review.
