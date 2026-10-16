package com.kinetic.workspace.service;

import com.kinetic.foundation.error.ConflictException;
import com.kinetic.foundation.error.NotFoundException;
import com.kinetic.foundation.security.AuthenticatedUser;
import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.identity.service.EmailNormalizer;
import com.kinetic.workspace.api.WorkspaceDtos;
import com.kinetic.workspace.domain.Workspace;
import com.kinetic.workspace.domain.WorkspaceMembership;
import com.kinetic.workspace.repository.WorkspaceMembershipRepository;
import com.kinetic.workspace.repository.WorkspaceRepository;
import com.kinetic.workspace.security.WorkspaceRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaces;
    private final WorkspaceMembershipRepository memberships;
    private final UserAccountRepository users;
    private final AuthenticatedUser current;
    private final WorkspaceAccess access;

    public WorkspaceService(
            WorkspaceRepository workspaces,
            WorkspaceMembershipRepository memberships,
            UserAccountRepository users,
            AuthenticatedUser current,
            WorkspaceAccess access
    ) {
        this.workspaces = workspaces;
        this.memberships = memberships;
        this.users = users;
        this.current = current;
        this.access = access;
    }

    @Transactional
    public Workspace create(WorkspaceDtos.Create request) {
        UUID userId = current.id();
        Workspace workspace = workspaces.save(Workspace.create(request.name().trim(), userId));
        memberships.save(WorkspaceMembership.create(workspace.id(), userId, WorkspaceRole.OWNER));
        return workspace;
    }

    @Transactional(readOnly = true)
    public List<Workspace> list() {
        return workspaces.findAllByUserId(current.id());
    }

    @Transactional(readOnly = true)
    public Workspace get(UUID id) {
        return workspaces.findById(id).orElseThrow(() -> new NotFoundException("Workspace was not found"));
    }

    @Transactional(readOnly = true)
    public Workspace detail(UUID id) {
        access.member(id, current.id());
        return get(id);
    }

    @Transactional
    public Workspace update(UUID id, WorkspaceDtos.Update request) {
        access.require(id, current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN);
        Workspace workspace = get(id);
        workspace.rename(request.name().trim());
        return workspace;
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMembership> members(UUID id) {
        access.member(id, current.id());
        return memberships.findAllByWorkspaceId(id);
    }

    @Transactional
    public WorkspaceMembership addOrChange(UUID id, WorkspaceDtos.MemberChange request) {
        access.require(id, current.id(), WorkspaceRole.OWNER);

        UUID targetUserId = request.userId();
        if (targetUserId == null && request.email() != null && !request.email().isBlank()) {
            String normalized = EmailNormalizer.normalize(request.email());
            UserAccount targetUser = users.findByEmailNormalized(normalized)
                    .orElseThrow(() -> new NotFoundException("User was not found"));
            targetUserId = targetUser.id();
        }

        if (targetUserId == null || !users.existsById(targetUserId)) {
            throw new NotFoundException("User was not found");
        }

        final UUID finalTargetUserId = targetUserId;
        WorkspaceMembership membership = memberships.findByWorkspaceIdAndUserId(id, finalTargetUserId)
                .orElseGet(() -> WorkspaceMembership.create(id, finalTargetUserId, request.role()));

        if (membership.role() == WorkspaceRole.OWNER
                && request.role() != WorkspaceRole.OWNER
                && memberships.countByWorkspaceIdAndRole(id, WorkspaceRole.OWNER) == 1) {
            throw new ConflictException("Cannot demote the last workspace owner");
        }

        membership.changeRole(request.role());
        return memberships.save(membership);
    }

    @Transactional
    public void remove(UUID id, UUID userId) {
        access.require(id, current.id(), WorkspaceRole.OWNER);
        WorkspaceMembership membership = memberships.findByWorkspaceIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("Member was not found in workspace"));

        if (membership.role() == WorkspaceRole.OWNER && memberships.countByWorkspaceIdAndRole(id, WorkspaceRole.OWNER) == 1) {
            throw new ConflictException("Cannot remove the last workspace owner");
        }

        memberships.delete(membership);
    }
}
