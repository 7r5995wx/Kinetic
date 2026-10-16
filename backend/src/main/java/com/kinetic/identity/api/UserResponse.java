package com.kinetic.identity.api;

import com.kinetic.identity.domain.UserAccount;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(UUID id, String displayName, String email, Instant createdAt) {

    public static UserResponse from(UserAccount account) {
        return new UserResponse(account.id(), account.displayName(), account.email(), account.createdAt());
    }
}
