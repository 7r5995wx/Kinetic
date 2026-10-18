package com.kinetic.activity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workspace_activities")
public class WorkspaceActivity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(nullable = false, length = 60)
    private String type;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "task_id")
    private UUID taskId;

    @Column(length = 2000)
    private String payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected WorkspaceActivity() {
    }

    public static WorkspaceActivity create(
            UUID workspaceId,
            UUID actorId,
            String type,
            String description,
            UUID projectId,
            UUID taskId,
            String payload
    ) {
        return create(UUID.randomUUID(), workspaceId, actorId, type, description, projectId, taskId, payload, Instant.now());
    }

    public static WorkspaceActivity create(
            UUID id,
            UUID workspaceId,
            UUID actorId,
            String type,
            String description,
            UUID projectId,
            UUID taskId,
            String payload,
            Instant createdAt
    ) {
        WorkspaceActivity activity = new WorkspaceActivity();
        activity.id = id != null ? id : UUID.randomUUID();
        activity.workspaceId = workspaceId;
        activity.actorId = actorId;
        activity.type = type;
        activity.description = description;
        activity.projectId = projectId;
        activity.taskId = taskId;
        activity.payload = payload;
        activity.createdAt = createdAt != null ? createdAt : Instant.now();
        return activity;
    }

    public UUID id() {
        return id;
    }

    public UUID workspaceId() {
        return workspaceId;
    }

    public UUID actorId() {
        return actorId;
    }

    public String type() {
        return type;
    }

    public String description() {
        return description;
    }

    public UUID projectId() {
        return projectId;
    }

    public UUID taskId() {
        return taskId;
    }

    public String payload() {
        return payload;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
