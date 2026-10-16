package com.kinetic.task.api;

import com.kinetic.task.domain.Task;
import com.kinetic.task.domain.TaskPriority;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class TaskDtos {

    private TaskDtos() {
    }

    public record Create(
            @NotBlank
            @Size(max = 200)
            String title,

            @Size(max = 5000)
            String description,

            @NotNull
            UUID columnId,

            @NotNull
            TaskPriority priority,

            UUID assigneeId,

            LocalDate dueDate
    ) {
    }

    public record Update(
            @NotBlank
            @Size(max = 200)
            String title,

            @Size(max = 5000)
            String description,

            @NotNull
            TaskPriority priority,

            UUID assigneeId,

            LocalDate dueDate,

            @Min(0)
            long version
    ) {
    }

    public record Move(
            @NotNull
            UUID columnId,

            @Min(0)
            int position,

            @Min(0)
            long version
    ) {
    }

    public record View(
            UUID id,
            UUID projectId,
            UUID columnId,
            String title,
            String description,
            TaskPriority priority,
            UUID assigneeId,
            LocalDate dueDate,
            int position,
            UUID createdBy,
            long version,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static View of(Task task) {
            return new View(
                    task.id(),
                    task.projectId(),
                    task.columnId(),
                    task.title(),
                    task.description(),
                    task.priority(),
                    task.assigneeId(),
                    task.dueDate(),
                    task.position(),
                    task.createdBy(),
                    task.version(),
                    task.createdAt(),
                    task.updatedAt()
            );
        }
    }
}
