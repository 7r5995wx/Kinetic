package com.kinetic.realtime.security;

import java.time.Instant;
import java.util.UUID;

/**
 * Short-lived, single-use ticket for authenticating direct WebSocket connections
 * across different origin domains where browser session cookies are not sent.
 */
public record WebSocketTicket(
        String ticket,
        UUID userId,
        String email,
        Instant createdAt,
        Instant expiresAt
) {
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public long expiresInSeconds() {
        long remaining = expiresAt.getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, remaining);
    }
}
