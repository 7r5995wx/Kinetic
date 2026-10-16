package com.kinetic.workspace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workspaces")
public class Workspace {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Workspace() {
    }

    public static Workspace create(String name, UUID creator) {
        Workspace workspace = new Workspace();
        workspace.id = UUID.randomUUID();
        workspace.name = name;
        workspace.createdBy = creator;
        workspace.createdAt = Instant.now();
        workspace.updatedAt = workspace.createdAt;
        return workspace;
    }

    public void rename(String name) {
        this.name = name;
        this.updatedAt = Instant.now();
    }

    public UUID id() {
        return id;
    }

    public String name() {
        return name;
    }

    public UUID createdBy() {
        return createdBy;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
