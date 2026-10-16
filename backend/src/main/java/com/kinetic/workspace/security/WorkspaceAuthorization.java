package com.kinetic.workspace.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class WorkspaceAuthorization {

    public void requireAnyRole(WorkspaceRole grantedRole, WorkspaceRole... allowedRoles) {
        boolean allowed = Arrays.stream(allowedRoles).anyMatch(role -> role == grantedRole);
        if (!allowed) {
            throw new AccessDeniedException("Workspace permission is required");
        }
    }
}
