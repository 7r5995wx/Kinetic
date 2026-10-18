# API contract

## Conventions

All endpoints are versioned beneath `/api/v1`, consume and return `application/json`, and require a server session unless marked public. Query pagination uses `page` (zero-based) and `size` (default 25, maximum 100); collection responses contain `items`, `page`, `size`, and `totalElements`. Dates are ISO-8601 UTC instants; due dates are calendar dates. IDs are UUIDs.

Unsafe authenticated requests (`POST`, `PATCH`, `PUT`, `DELETE`) require the CSRF header/token described in [security](security.md). The server ignores client-supplied ownership, role, audit, or version values except task mutation preconditions.

## Endpoint inventory

| Method and path | Purpose | Authorization |
| --- | --- | --- |
| `GET /auth/csrf` | Issue/read the CSRF bootstrap token | Public |
| `POST /auth/register` | Register user and start session | Public |
| `POST /auth/login` | Start session | Public |
| `POST /auth/logout` | End current session | Authenticated |
| `GET /auth/me` | Read current user's profile | Authenticated |
| `PATCH /me` | Update own profile (planned) | Authenticated |
| `GET/POST /workspaces` | List/create workspaces | Authenticated |
| `GET/PATCH /workspaces/{workspaceId}` | Read/update workspace | Member / owner |
| `GET/POST /workspaces/{workspaceId}/members` | List/add member | Member / owner |
| `PATCH/DELETE /workspaces/{workspaceId}/members/{userId}` | Change/remove membership | Owner |
| `GET/POST /workspaces/{workspaceId}/projects` | List/create projects | Member / editor+ |
| `GET/PATCH/DELETE /projects/{projectId}` | Read/update/archive project | Member / editor+ |
| `GET/POST /projects/{projectId}/columns` | List/create columns | Member / editor+ |
| `PATCH/DELETE /columns/{columnId}` | Rename/reorder/archive column | Editor+ |
| `GET/POST /projects/{projectId}/tasks` | Search/list/create tasks | Member / editor+ |
| `GET/PATCH/DELETE /tasks/{taskId}` | Read/update/archive task | Member / editor+ |
| `POST /tasks/{taskId}/move` | Atomically move/reorder task | Editor+ |
| `GET/POST /tasks/{taskId}/comments` | List/create comments | Member / editor+ |
| `PATCH/DELETE /comments/{commentId}` | Edit/delete own comment | Author (owner may delete) |
| `GET /workspaces/{workspaceId}/activities` | Paginated activity feed | Member |
| `GET /workspaces/{workspaceId}/activities/export/csv` | Download activity audit as CSV | Member |
| `GET /workspaces/{workspaceId}/activities/export/json` | Download activity audit as JSON | Member |
| `GET /workspaces/{workspaceId}/sync` | Authoritative changed-resource snapshot | Member |

`editor+` means `OWNER`, `ADMIN`, or `MEMBER` in the initial model. Fine-grained workspace permission checks are applied in the service layer after resolving membership from the resource's workspace; a guessed ID alone never grants access. Deletion is archival where history/references matter.

## Selected shapes

`GET /auth/csrf` returns `{"headerName":"X-CSRF-TOKEN","token":"..."}` and sets a readable `XSRF-TOKEN` cookie. The client sends the returned token in that header for every unsafe request, including anonymous registration and login.

`POST /auth/register`:

```json
{"displayName":"Ada Lovelace","email":"ada@example.com","password":"at-least-12-characters"}
```

Successful registration and login return `id`, `displayName`, `email`, and `createdAt` and establish a server session. Registration validates a nonblank name (maximum 100 characters), email (maximum 320 characters), and password (12–72 characters). Email is trimmed and normalized to lowercase before the uniqueness check. Duplicate email returns `409 EMAIL_ALREADY_REGISTERED`; failed login returns generic `401 INVALID_CREDENTIALS`.

`POST /projects/{projectId}/tasks`:

```json
{"title":"Draft release notes","description":"","columnId":"uuid","priority":"HIGH","assigneeId":"uuid","dueDate":"2026-11-01"}
```

`POST /tasks/{taskId}/move`:

```json
{"columnId":"uuid","position":3,"version":7}
```

Task responses include `id`, `projectId`, `columnId`, `title`, `description`, `priority`, `assignee`, `dueDate`, `position`, `version`, `createdAt`, and `updatedAt`. Never expose password hashes, session data, or membership data beyond the caller's authorization.

## Error envelope

All errors use this shape:

```json
{"timestamp":"2026-10-16T10:15:30Z","status":422,"code":"VALIDATION_FAILED","message":"Request validation failed","fieldErrors":[{"field":"title","message":"must not be blank"}],"requestId":"uuid"}
```

Use `400` malformed request, `401` no/invalid session, `403` authenticated but unauthorized, `404` inaccessible/not found (avoid resource enumeration where appropriate), `409` version/order conflict, `422` valid JSON failing business/field validation, `429` rate limit, and `500` unexpected error. Error messages are safe for clients; detailed causes stay in logs correlated by `requestId`.
