package com.kinetic.task.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "column_id", nullable = false)
    private UUID columnId;

    @Column(nullable = false)
    private String title;

    @Column(length = 5000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskPriority priority;

    @Column(name = "assignee_id")
    private UUID assigneeId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Task() {
    }

    public static Task create(
            UUID projectId,
            UUID columnId,
            String title,
            String description,
            TaskPriority priority,
            UUID assigneeId,
            LocalDate dueDate,
            int position,
            UUID createdBy
    ) {
        Task task = new Task();
        task.id = UUID.randomUUID();
        task.projectId = projectId;
        task.columnId = columnId;
        task.title = title;
        task.description = description;
        task.priority = priority;
        task.assigneeId = assigneeId;
        task.dueDate = dueDate;
        task.position = position;
        task.createdBy = createdBy;
        task.createdAt = Instant.now();
        task.updatedAt = task.createdAt;
        return task;
    }

    public void update(
            String title,
            String description,
            TaskPriority priority,
            UUID assigneeId,
            LocalDate dueDate
    ) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.assigneeId = assigneeId;
        this.dueDate = dueDate;
        this.updatedAt = Instant.now();
    }

    public void move(UUID columnId, int position) {
        this.columnId = columnId;
        this.position = position;
        this.updatedAt = Instant.now();
    }

    public void updatePosition(int position) {
        this.position = position;
        this.updatedAt = Instant.now();
    }

    public UUID id() {
        return id;
    }

    public UUID projectId() {
        return projectId;
    }

    public UUID columnId() {
        return columnId;
    }

    public String title() {
        return title;
    }

    public String description() {
        return description;
    }

    public TaskPriority priority() {
        return priority;
    }

    public UUID assigneeId() {
        return assigneeId;
    }

    public LocalDate dueDate() {
        return dueDate;
    }

    public int position() {
        return position;
    }

    public UUID createdBy() {
        return createdBy;
    }

    public long version() {
        return version;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
