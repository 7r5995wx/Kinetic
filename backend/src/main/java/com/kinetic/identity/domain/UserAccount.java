package com.kinetic.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserAccount {

    @Id
    private UUID id;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(name = "email_normalized", nullable = false, length = 320, unique = true)
    private String emailNormalized;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserAccount() {
    }

    public static UserAccount register(String email, String emailNormalized, String displayName, String passwordHash) {
        UserAccount account = new UserAccount();
        account.id = UUID.randomUUID();
        account.email = email;
        account.emailNormalized = emailNormalized;
        account.displayName = displayName;
        account.passwordHash = passwordHash;
        account.createdAt = Instant.now();
        account.updatedAt = account.createdAt;
        return account;
    }

    public UUID id() {
        return id;
    }

    public String email() {
        return email;
    }

    public String emailNormalized() {
        return emailNormalized;
    }

    public String displayName() {
        return displayName;
    }

    public String passwordHash() {
        return passwordHash;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
