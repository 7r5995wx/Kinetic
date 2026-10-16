# Realtime contract

## Transport and scope

The backend exposes an authenticated Spring WebSocket endpoint at `/ws` and STOMP destinations. It authenticates the HTTP session during handshake, validates origin, and authorizes subscription destinations by workspace membership. Cookies participate in the same site/origin rules; browser clients do not place access tokens in URLs or STOMP headers.

The initial deployment has one backend instance. WebSocket messages are ephemeral notifications, never a queue, audit system, or source of truth. A successful REST mutation is authoritative even if no notification arrives.

## Destinations and events

Clients subscribe only after joining a workspace:

| Destination | Authorized audience | Event kinds |
| --- | --- | --- |
| `/topic/workspaces/{workspaceId}` | Current workspace members | `project.changed`, `member.changed`, `activity.created` |
| `/topic/projects/{projectId}` | Current project workspace members | `column.changed`, `task.changed`, `task.moved`, `comment.created` |

Every payload is a compact hint:

```json
{"eventId":"uuid","type":"task.moved","workspaceId":"uuid","projectId":"uuid","resourceId":"uuid","version":8,"occurredAt":"2026-10-16T10:15:30Z"}
```

Do not send task descriptions, comment bodies, credentials, or permissions as an authorization substitute. The client uses the ID/version to update its normalized cache only when safe, or refetches the relevant REST resource/list.

## Connect, reconnect, and recovery

1. On application start or after authenticated session change, fetch current user/workspaces through REST, then open the socket and subscribe to visible scopes.
2. On an event, deduplicate by `eventId`; ignore older versions; refetch when the event is unknown, gaps are possible, membership changed, or an optimistic local action disagrees.
3. On disconnect, render a non-blocking “Reconnecting” state and retry with bounded exponential backoff plus jitter. Do not retry after deliberate logout or terminal authentication failure.
4. After any reconnect, REST-resynchronize active workspace/project state before marking it live. A `GET /workspaces/{id}/sync?since=<cursor>` optimization may be added later; initial implementation may refetch paginated views and task details.
5. If REST reports a different version after an optimistic UI update, replace local state, show a concise conflict notice, and permit a deliberate retry.

## Security and authorization requirements for WebSocket implementation

1. **Origin Validation at Handshake**:
   - The WebSocket endpoint at `/ws` must register allowed origins matching `KineticProperties.allowedOrigins()` (never wildcard `*` with credentials).
   - Cross-origin requests from unapproved domains are rejected before handshake completion.

2. **Handshake and STOMP Connection Authentication**:
   - The HTTP handshake at `/ws` permits protocol upgrades from allowed origins (`KineticProperties.allowedOrigins()`).
   - Authentication is strictly enforced at the STOMP `CONNECT` level via short-lived, single-use tickets:
     - The authenticated browser client calls `POST /api/v1/auth/ws-ticket` through the same-origin proxy (secured by session cookie + CSRF).
     - The backend generates a cryptographically secure 256-bit URL-safe token with a 60-second expiration (`WebSocketTicket`).
     - The client connects directly to Render (`wss://.../ws`) and includes the ticket in the STOMP `CONNECT` frame header (`ticket`).
     - `RealtimeChannelInterceptor` validates and redeems the ticket atomically via `WebSocketTicketService`. Once redeemed, the ticket is deleted immediately to prevent replay attacks.
     - Valid tickets establish the authenticated `KineticUserPrincipal` for all subsequent STOMP operations. Unauthenticated frames or invalid/expired/replayed tickets are rejected with `AuthenticationCredentialsNotFoundException`.
     - On auto-reconnect, `StompClient` transparently calls its `ticketProvider` to acquire a fresh ticket for the new connection.
     - In the initial single-instance modular monolith, `WebSocketTicketService` operates in-memory (`ConcurrentHashMap`). If scaled horizontally across multiple backend instances in the future, the migration path is to back the registry with Redis (`GETDEL` / Lua atomic redemption).

3. **STOMP Channel Interceptor Authorization**:
   - A `ChannelInterceptor` on the `clientInboundChannel` enforces destination-level authorization on `SUBSCRIBE`:
     - `/topic/workspaces/{workspaceId}`: Extracts `workspaceId`, inspects the authenticated principal in `accessor.getUser()`, and verifies active membership via `WorkspaceAccess.member(workspaceId, userId)`. If not a member, throws an access denied exception and rejects subscription.
     - `/topic/projects/{projectId}`: Extracts `projectId`, resolves its parent workspace, and verifies membership. Non-members are rejected.
   - Any client attempt to `SEND` directly to `/topic/**` or unauthorized destinations is denied (`clientInboundChannel` rejects unsolicited client publications). All events originate strictly from backend domain transactions.

4. **Payload Privacy and Invalidation Discipline**:
   - WebSocket event payloads must never include sensitive data, password hashes, full descriptions, or comments.
   - Payloads contain only resource identifiers, event types, and version numbers. Clients must use authorized REST endpoints to fetch actual resource representations.

## Failure behavior and future scale

The UI must function with polling/refetch behavior if WebSockets are unavailable. Render free services can idle-spin down; existing sockets close during that transition, so cold-start/reconnect is expected. When moving beyond a single instance, replace in-process fan-out with a shared broker or an outbox relay, preserve the event envelope, and continue REST recovery so no durable delivery promise is invented.

