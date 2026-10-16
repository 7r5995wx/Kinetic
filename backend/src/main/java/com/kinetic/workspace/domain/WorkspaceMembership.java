package com.kinetic.workspace.domain;

import com.kinetic.workspace.security.WorkspaceRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "workspace_memberships",
        uniqueConstraints = @UniqueConstraint(columnNames = {"workspace_id", "user_id"})
)
public class WorkspaceMembership {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkspaceRole role;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WorkspaceMembership() {
    }

    public static WorkspaceMembership create(UUID workspaceId, UUID userId, WorkspaceRole role) {
        WorkspaceMembership membership = new WorkspaceMembership();
        membership.id = UUID.randomUUID();
        membership.workspaceId = workspaceId;
        membership.userId = userId;
        membership.role = role;
        membership.createdAt = Instant.now();
        return membership;
    }

    public void changeRole(WorkspaceRole role) {
        this.role = role;
    }

    public UUID id() {
        return id;
    }

    public UUID workspaceId() {
        return workspaceId;
    }

    public UUID userId() {
        return userId;
    }

    public WorkspaceRole role() {
        return role;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
