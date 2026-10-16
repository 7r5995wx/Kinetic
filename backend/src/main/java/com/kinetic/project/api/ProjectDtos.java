package com.kinetic.project.api;

import com.kinetic.project.domain.KanbanColumn;
import com.kinetic.project.domain.Project;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class ProjectDtos {

    private ProjectDtos() {
    }

    public record Create(
            @NotBlank
            @Size(max = 120)
            String name,

            @Size(max = 2000)
            String description
    ) {
    }

    public record Update(
            @NotBlank
            @Size(max = 120)
            String name,

            @Size(max = 2000)
            String description
    ) {
    }

    public record View(
            UUID id,
            UUID workspaceId,
            String name,
            String description,
            Instant createdAt
    ) {
        public static View of(Project project) {
            return new View(
                    project.id(),
                    project.workspaceId(),
                    project.name(),
                    project.description(),
                    project.createdAt()
            );
        }
    }

    public record Column(
            UUID id,
            String name,
            int position
    ) {
        public static Column of(KanbanColumn column) {
            return new Column(column.id(), column.name(), column.position());
        }
    }
}
