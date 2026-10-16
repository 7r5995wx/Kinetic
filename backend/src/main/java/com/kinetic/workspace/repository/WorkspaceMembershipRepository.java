package com.kinetic.workspace.repository;

import com.kinetic.workspace.domain.WorkspaceMembership;
import com.kinetic.workspace.security.WorkspaceRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkspaceMembershipRepository extends JpaRepository<WorkspaceMembership, UUID> {

    Optional<WorkspaceMembership> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    List<WorkspaceMembership> findAllByWorkspaceId(UUID workspaceId);

    List<WorkspaceMembership> findAllByUserId(UUID userId);

    long countByWorkspaceIdAndRole(UUID workspaceId, WorkspaceRole role);
}
