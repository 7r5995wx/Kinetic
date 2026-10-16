package com.kinetic.workspace.api;

import com.kinetic.workspace.domain.Workspace;
import com.kinetic.workspace.domain.WorkspaceMembership;
import com.kinetic.workspace.security.WorkspaceRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class WorkspaceDtos {

    private WorkspaceDtos() {
    }

    public record Create(
            @NotBlank
            @Size(max = 100)
            String name
    ) {
    }

    public record Update(
            @NotBlank
            @Size(max = 100)
            String name
    ) {
    }

    public record MemberChange(
            UUID userId,
            String email,
            @NotNull
            WorkspaceRole role
    ) {
        public MemberChange(UUID userId, WorkspaceRole role) {
            this(userId, null, role);
        }
    }

    public record Member(
            UUID userId,
            WorkspaceRole role
    ) {
        public static Member of(WorkspaceMembership membership) {
            return new Member(membership.userId(), membership.role());
        }
    }

    public record View(
            UUID id,
            String name,
            UUID createdBy,
            Instant createdAt
    ) {
        public static View of(Workspace workspace) {
            return new View(workspace.id(), workspace.name(), workspace.createdBy(), workspace.createdAt());
        }
    }
}
