package com.kinetic.comment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_comments")
public class Comment {

    @Id
    private UUID id;

    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(nullable = false, length = 5000)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Comment() {
    }

    public static Comment create(UUID taskId, UUID authorId, String content) {
        return create(UUID.randomUUID(), taskId, authorId, content, Instant.now());
    }

    public static Comment create(UUID id, UUID taskId, UUID authorId, String content, Instant createdAt) {
        Comment comment = new Comment();
        comment.id = id != null ? id : UUID.randomUUID();
        comment.taskId = taskId;
        comment.authorId = authorId;
        comment.content = content;
        comment.createdAt = createdAt != null ? createdAt : Instant.now();
        comment.updatedAt = comment.createdAt;
        return comment;
    }

    public UUID id() {
        return id;
    }

    public UUID taskId() {
        return taskId;
    }

    public UUID authorId() {
        return authorId;
    }

    public String content() {
        return content;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
