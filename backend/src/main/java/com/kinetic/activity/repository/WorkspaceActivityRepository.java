package com.kinetic.activity.repository;

import com.kinetic.activity.domain.WorkspaceActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkspaceActivityRepository extends JpaRepository<WorkspaceActivity, UUID> {

    Page<WorkspaceActivity> findAllByWorkspaceIdOrderByCreatedAtDescIdDesc(UUID workspaceId, Pageable pageable);

    long countByWorkspaceId(UUID workspaceId);
}
