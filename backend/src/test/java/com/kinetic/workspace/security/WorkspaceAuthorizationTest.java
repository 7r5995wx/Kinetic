package com.kinetic.workspace.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkspaceAuthorizationTest {

    private final WorkspaceAuthorization authorization = new WorkspaceAuthorization();

    @Test
    void permitsOnlyAnExplicitlyAllowedRole() {
        assertThatCode(() -> authorization.requireAnyRole(WorkspaceRole.OWNER, WorkspaceRole.OWNER, WorkspaceRole.ADMIN))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> authorization.requireAnyRole(WorkspaceRole.MEMBER, WorkspaceRole.OWNER, WorkspaceRole.ADMIN))
                .isInstanceOf(AccessDeniedException.class);
    }
}
