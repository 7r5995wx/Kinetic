package com.kinetic.identity.api;

public record WsTicketResponse(
        String ticket,
        long expiresInSeconds
) {
}
