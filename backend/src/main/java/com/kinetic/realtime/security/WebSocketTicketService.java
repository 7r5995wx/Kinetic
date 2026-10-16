package com.kinetic.realtime.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Service managing cryptographically strong, short-lived, single-use tickets
 * for WebSocket connection authentication.
 *
 * <p>Architectural Scope: This in-memory ticket registry is designed for single-instance
 * modular monolith deployments (such as Render Free Web Service). In a multi-instance
 * horizontally scaled deployment, tickets would be validated via a shared distributed
 * cache or cryptographic signature (e.g. signed ephemeral tokens).
 */
@Service
public class WebSocketTicketService {

    private static final Logger log = LoggerFactory.getLogger(WebSocketTicketService.class);
    private static final Duration DEFAULT_TICKET_TTL = Duration.ofSeconds(60);
    private static final int TICKET_BYTE_LENGTH = 32;

    private final SecureRandom secureRandom = new SecureRandom();
    private final Base64.Encoder base64Encoder = Base64.getUrlEncoder().withoutPadding();
    private final ConcurrentMap<String, WebSocketTicket> tickets = new ConcurrentHashMap<>();

    /**
     * Issues a new single-use WebSocket ticket for the authenticated user.
     *
     * @param userId user identifier
     * @param email  user email
     * @return generated ticket record
     */
    public WebSocketTicket createTicket(UUID userId, String email) {
        return createTicket(userId, email, DEFAULT_TICKET_TTL);
    }

    /**
     * Issues a new single-use WebSocket ticket with specified time-to-live.
     */
    public WebSocketTicket createTicket(UUID userId, String email, Duration ttl) {
        pruneExpiredTickets();

        byte[] randomBytes = new byte[TICKET_BYTE_LENGTH];
        secureRandom.nextBytes(randomBytes);
        String ticketString = base64Encoder.encodeToString(randomBytes);

        Instant now = Instant.now();
        Instant expiresAt = now.plus(ttl);

        WebSocketTicket ticket = new WebSocketTicket(ticketString, userId, email, now, expiresAt);
        tickets.put(ticketString, ticket);

        log.debug("Issued single-use WebSocket ticket for user={}", userId);
        return ticket;
    }

    /**
     * Validates and redeems a single-use ticket.
     * <p>
     * Atomic removal ensures that a ticket can only ever be redeemed once,
     * completely eliminating replay attacks.
     *
     * @param ticketString ticket string provided in STOMP CONNECT frame
     * @return ticket record if valid and unexpired; empty otherwise
     */
    public Optional<WebSocketTicket> redeemTicket(String ticketString) {
        if (ticketString == null || ticketString.isBlank()) {
            return Optional.empty();
        }

        // Atomically remove to guarantee single-use redemption
        WebSocketTicket ticket = tickets.remove(ticketString.trim());
        if (ticket == null) {
            log.warn("WebSocket ticket redemption failed: ticket not found or already redeemed");
            return Optional.empty();
        }

        if (ticket.isExpired()) {
            log.warn("WebSocket ticket redemption failed: ticket expired for user={}", ticket.userId());
            return Optional.empty();
        }

        log.debug("Successfully redeemed WebSocket ticket for user={}", ticket.userId());
        return Optional.of(ticket);
    }

    /**
     * Prunes expired tickets from memory.
     */
    public void pruneExpiredTickets() {
        Instant now = Instant.now();
        tickets.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    /**
     * Package-private helper for testing cache size.
     */
    int activeTicketCount() {
        return tickets.size();
    }
}
