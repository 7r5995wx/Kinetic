package com.kinetic.project.repository;

import com.kinetic.project.domain.KanbanColumn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface KanbanColumnRepository extends JpaRepository<KanbanColumn, UUID> {

    List<KanbanColumn> findAllByProjectIdOrderByPositionAsc(UUID projectId);

    Optional<KanbanColumn> findByIdAndProjectId(UUID id, UUID projectId);

    void deleteAllByProjectId(UUID projectId);
}
