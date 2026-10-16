package com.kinetic.project.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "kanban_columns")
public class KanbanColumn {

    @Id
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected KanbanColumn() {
    }

    public static KanbanColumn create(UUID projectId, String name, int position) {
        KanbanColumn column = new KanbanColumn();
        column.id = UUID.randomUUID();
        column.projectId = projectId;
        column.name = name;
        column.position = position;
        column.createdAt = Instant.now();
        return column;
    }

    public void rename(String name) {
        this.name = name;
    }

    public void updatePosition(int position) {
        this.position = position;
    }

    public UUID id() {
        return id;
    }

    public UUID projectId() {
        return projectId;
    }

    public String name() {
        return name;
    }

    public int position() {
        return position;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
