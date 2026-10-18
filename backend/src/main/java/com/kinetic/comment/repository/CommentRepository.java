package com.kinetic.comment.repository;

import com.kinetic.comment.domain.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    Page<Comment> findAllByTaskIdOrderByCreatedAtAscIdAsc(UUID taskId, Pageable pageable);

    long countByTaskId(UUID taskId);
}
