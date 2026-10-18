package com.kinetic.activity.api;

import com.kinetic.activity.domain.WorkspaceActivity;

import java.time.Instant;
import java.util.UUID;

public final class ActivityDtos {

    private ActivityDtos() {
    }

    public record View(
            UUID id,
            UUID workspaceId,
            UUID actorId,
            String actorName,
            String type,
            String description,
            UUID projectId,
            UUID taskId,
            String payload,
            Instant createdAt
    ) {
        public static View of(WorkspaceActivity activity, String actorName) {
            return new View(
                    activity.id(),
                    activity.workspaceId(),
                    activity.actorId(),
                    actorName,
                    activity.type(),
                    activity.description(),
                    activity.projectId(),
                    activity.taskId(),
                    activity.payload(),
                    activity.createdAt()
            );
        }
    }
}
