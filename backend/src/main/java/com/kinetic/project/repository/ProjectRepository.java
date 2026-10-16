package com.kinetic.project.repository;

import com.kinetic.project.domain.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    Page<Project> findAllByWorkspaceId(UUID workspaceId, Pageable pageable);
}
