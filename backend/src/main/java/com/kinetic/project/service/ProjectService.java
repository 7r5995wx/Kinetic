package com.kinetic.project.service;

import com.kinetic.foundation.error.NotFoundException;
import com.kinetic.foundation.security.AuthenticatedUser;
import com.kinetic.project.api.ProjectDtos;
import com.kinetic.project.domain.KanbanColumn;
import com.kinetic.project.domain.Project;
import com.kinetic.project.repository.KanbanColumnRepository;
import com.kinetic.project.repository.ProjectRepository;
import com.kinetic.task.repository.TaskRepository;
import com.kinetic.workspace.security.WorkspaceRole;
import com.kinetic.workspace.service.WorkspaceAccess;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projects;
    private final KanbanColumnRepository columns;
    private final TaskRepository tasks;
    private final WorkspaceAccess access;
    private final AuthenticatedUser current;

    public ProjectService(
            ProjectRepository projects,
            KanbanColumnRepository columns,
            TaskRepository tasks,
            WorkspaceAccess access,
            AuthenticatedUser current
    ) {
        this.projects = projects;
        this.columns = columns;
        this.tasks = tasks;
        this.access = access;
        this.current = current;
    }

    @Transactional
    public Project create(UUID workspaceId, ProjectDtos.Create request) {
        access.require(workspaceId, current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);
        Project project = projects.save(Project.create(
                workspaceId,
                request.name().trim(),
                request.description(),
                current.id()
        ));
        columns.saveAll(List.of(
                KanbanColumn.create(project.id(), "To do", 0),
                KanbanColumn.create(project.id(), "In progress", 1),
                KanbanColumn.create(project.id(), "Done", 2)
        ));
        return project;
    }

    @Transactional(readOnly = true)
    public Page<Project> list(UUID workspaceId, Pageable pageable) {
        access.member(workspaceId, current.id());
        return projects.findAllByWorkspaceId(workspaceId, pageable);
    }

    @Transactional(readOnly = true)
    public Project get(UUID id) {
        Project project = projects.findById(id).orElseThrow(() -> new NotFoundException("Project was not found"));
        access.member(project.workspaceId(), current.id());
        return project;
    }

    @Transactional
    public Project update(UUID id, ProjectDtos.Update request) {
        Project project = get(id);
        access.require(project.workspaceId(), current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN);
        project.update(request.name().trim(), request.description());
        return project;
    }

    @Transactional
    public void delete(UUID id) {
        Project project = get(id);
        access.require(project.workspaceId(), current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN);
        tasks.deleteAllByProjectId(id);
        columns.deleteAllByProjectId(id);
        projects.delete(project);
    }

    @Transactional(readOnly = true)
    public List<KanbanColumn> columns(UUID projectId) {
        get(projectId);
        return columns.findAllByProjectIdOrderByPositionAsc(projectId);
    }

    @Transactional(readOnly = true)
    public KanbanColumn column(UUID projectId, UUID columnId) {
        get(projectId);
        return columns.findByIdAndProjectId(columnId, projectId)
                .orElseThrow(() -> new NotFoundException("Kanban column was not found in project"));
    }
}
