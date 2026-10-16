package com.kinetic.foundation.security;

import com.kinetic.identity.security.KineticUserPrincipal;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class AuthenticatedUser {

    public UUID id() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof KineticUserPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authenticated user is required");
        }
        return principal.userId();
    }
}
