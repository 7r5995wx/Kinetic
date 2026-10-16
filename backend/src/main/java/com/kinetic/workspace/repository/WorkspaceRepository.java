package com.kinetic.workspace.repository;

import com.kinetic.workspace.domain.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    @Query("select w from Workspace w join WorkspaceMembership m on m.workspaceId = w.id where m.userId = :userId order by w.createdAt desc")
    List<Workspace> findAllByUserId(@Param("userId") UUID userId);
}
