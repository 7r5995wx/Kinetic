package com.kinetic.workspace.service;

import com.kinetic.foundation.error.NotFoundException;
import com.kinetic.workspace.domain.WorkspaceMembership;
import com.kinetic.workspace.repository.WorkspaceMembershipRepository;
import com.kinetic.workspace.security.WorkspaceAuthorization;
import com.kinetic.workspace.security.WorkspaceRole;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class WorkspaceAccess {

    private final WorkspaceMembershipRepository memberships;
    private final WorkspaceAuthorization authorization;

    public WorkspaceAccess(WorkspaceMembershipRepository memberships, WorkspaceAuthorization authorization) {
        this.memberships = memberships;
        this.authorization = authorization;
    }

    public WorkspaceMembership member(UUID workspaceId, UUID userId) {
        return memberships.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new NotFoundException("Workspace was not found"));
    }

    public void require(UUID workspaceId, UUID userId, WorkspaceRole... roles) {
        WorkspaceMembership membership = member(workspaceId, userId);
        authorization.requireAnyRole(membership.role(), roles);
    }
}
