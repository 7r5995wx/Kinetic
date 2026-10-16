package com.kinetic.task.repository;

import com.kinetic.task.domain.Task;
import com.kinetic.task.domain.TaskPriority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    @Query("select t from Task t where t.projectId = :projectId " +
            "and (:columnId is null or t.columnId = :columnId) " +
            "and (:priority is null or t.priority = :priority) " +
            "and (:assigneeId is null or t.assigneeId = :assigneeId)")
    Page<Task> search(
            @Param("projectId") UUID projectId,
            @Param("columnId") UUID columnId,
            @Param("priority") TaskPriority priority,
            @Param("assigneeId") UUID assigneeId,
            Pageable pageable
    );

    long countByColumnId(UUID columnId);

    List<Task> findAllByColumnIdOrderByPositionAsc(UUID columnId);

    void deleteAllByProjectId(UUID projectId);

    void deleteAllByColumnId(UUID columnId);
}
