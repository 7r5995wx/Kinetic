package com.kinetic.realtime.event;

import java.time.Instant;
import java.util.UUID;

public record RealtimeEvent(
        UUID eventId,
        String type,
        UUID workspaceId,
        UUID projectId,
        UUID resourceId,
        Long version,
        Instant occurredAt
) {
    public static RealtimeEvent of(
            String type,
            UUID workspaceId,
            UUID projectId,
            UUID resourceId,
            Long version
    ) {
        return new RealtimeEvent(
                UUID.randomUUID(),
                type,
                workspaceId,
                projectId,
                resourceId,
                version,
                Instant.now()
        );
    }
}
