# CI workflows

The GitHub Actions workflow defined in [`ci.yml`](ci.yml) validates both the Spring Boot backend and the Next.js frontend on pushes and pull requests to `main`.

- **Backend CI**: Runs on Ubuntu with a PostgreSQL 17 service container (`postgres:17-alpine`). Sets up Java 21 (Temurin), runs Flyway migrations and unit/integration tests against PostgreSQL, and packages the Spring Boot executable JAR.
- **Frontend CI**: Runs on Ubuntu. Sets up Node.js 20 LTS, performs reproducible installation (`npm ci`), runs ESLint, TypeScript typecheck (`tsc --noEmit`), unit/integration test suites (Vitest), and builds the Next.js production artifact.
