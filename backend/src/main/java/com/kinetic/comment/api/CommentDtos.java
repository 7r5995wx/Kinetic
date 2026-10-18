package com.kinetic.comment.api;

import com.kinetic.comment.domain.Comment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class CommentDtos {

    private CommentDtos() {
    }

    public record Create(
            @NotBlank
            @Size(max = 5000)
            String content
    ) {
    }

    public record View(
            UUID id,
            UUID taskId,
            String content,
            UUID authorId,
            String authorName,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static View of(Comment comment, String authorName) {
            return new View(
                    comment.id(),
                    comment.taskId(),
                    comment.content(),
                    comment.authorId(),
                    authorName,
                    comment.createdAt(),
                    comment.updatedAt()
            );
        }
    }
}
