package com.kinetic.task.service;

import com.kinetic.foundation.error.ConflictException;
import com.kinetic.foundation.error.NotFoundException;
import com.kinetic.foundation.security.AuthenticatedUser;
import com.kinetic.project.domain.Project;
import com.kinetic.project.service.ProjectService;
import com.kinetic.task.api.TaskDtos;
import com.kinetic.task.domain.Task;
import com.kinetic.task.domain.TaskPriority;
import com.kinetic.task.repository.TaskRepository;
import com.kinetic.workspace.repository.WorkspaceMembershipRepository;
import com.kinetic.workspace.security.WorkspaceRole;
import com.kinetic.workspace.service.WorkspaceAccess;
import com.kinetic.realtime.event.RealtimeEvent;
import com.kinetic.realtime.event.RealtimeEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class TaskService {

    private final TaskRepository tasks;
    private final ProjectService projects;
    private final WorkspaceMembershipRepository memberships;
    private final WorkspaceAccess access;
    private final AuthenticatedUser current;
    private final RealtimeEventPublisher eventPublisher;

    public TaskService(
            TaskRepository tasks,
            ProjectService projects,
            WorkspaceMembershipRepository memberships,
            WorkspaceAccess access,
            AuthenticatedUser current,
            RealtimeEventPublisher eventPublisher
    ) {
        this.tasks = tasks;
        this.projects = projects;
        this.memberships = memberships;
        this.access = access;
        this.current = current;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Task create(UUID projectId, TaskDtos.Create request) {
        Project project = projects.get(projectId);
        access.require(project.workspaceId(), current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);
        projects.column(projectId, request.columnId());
        validateAssignee(project.workspaceId(), request.assigneeId());

        int position = Math.toIntExact(tasks.countByColumnId(request.columnId()));
        Task task = Task.create(
                projectId,
                request.columnId(),
                request.title().trim(),
                request.description(),
                request.priority(),
                request.assigneeId(),
                request.dueDate(),
                position,
                current.id()
        );
        Task saved = tasks.saveAndFlush(task);
        eventPublisher.publish(RealtimeEvent.of("task.created", project.workspaceId(), projectId, saved.id(), saved.version()));
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<Task> list(UUID projectId, UUID columnId, TaskPriority priority, UUID assigneeId, Pageable pageable) {
        projects.get(projectId);
        if (columnId != null) {
            projects.column(projectId, columnId);
        }
        return tasks.search(projectId, columnId, priority, assigneeId, pageable);
    }

    @Transactional(readOnly = true)
    public Task get(UUID id) {
        Task task = tasks.findById(id).orElseThrow(() -> new NotFoundException("Task was not found"));
        projects.get(task.projectId());
        return task;
    }

    @Transactional
    public Task update(UUID id, TaskDtos.Update request) {
        Task task = get(id);
        if (task.version() != request.version()) {
            throw new ConflictException("The task was modified by another request; refresh and retry");
        }
        Project project = projects.get(task.projectId());
        access.require(project.workspaceId(), current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);
        validateAssignee(project.workspaceId(), request.assigneeId());

        task.update(
                request.title().trim(),
                request.description(),
                request.priority(),
                request.assigneeId(),
                request.dueDate()
        );
        Task saved = tasks.saveAndFlush(task);
        eventPublisher.publish(RealtimeEvent.of("task.updated", project.workspaceId(), project.id(), saved.id(), saved.version()));
        return saved;
    }

    @Transactional
    public Task move(UUID id, TaskDtos.Move request) {
        Task task = get(id);
        if (task.version() != request.version()) {
            throw new ConflictException("The task was modified by another request; refresh and retry");
        }
        Project project = projects.get(task.projectId());
        access.require(project.workspaceId(), current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);
        projects.column(task.projectId(), request.columnId());

        UUID sourceColumnId = task.columnId();
        UUID targetColumnId = request.columnId();
        int requestedPosition = request.position();

        if (sourceColumnId.equals(targetColumnId)) {
            List<Task> columnTasks = new ArrayList<>(tasks.findAllByColumnIdOrderByPositionAsc(sourceColumnId));
            columnTasks.removeIf(t -> t.id().equals(task.id()));
            int targetIndex = Math.max(0, Math.min(requestedPosition, columnTasks.size()));
            columnTasks.add(targetIndex, task);
            for (int i = 0; i < columnTasks.size(); i++) {
                columnTasks.get(i).updatePosition(i);
            }
            task.move(targetColumnId, targetIndex);
            tasks.saveAll(columnTasks);
        } else {
            List<Task> sourceTasks = new ArrayList<>(tasks.findAllByColumnIdOrderByPositionAsc(sourceColumnId));
            sourceTasks.removeIf(t -> t.id().equals(task.id()));
            for (int i = 0; i < sourceTasks.size(); i++) {
                sourceTasks.get(i).updatePosition(i);
            }
            tasks.saveAll(sourceTasks);

            List<Task> targetTasks = new ArrayList<>(tasks.findAllByColumnIdOrderByPositionAsc(targetColumnId));
            targetTasks.removeIf(t -> t.id().equals(task.id()));
            int targetIndex = Math.max(0, Math.min(requestedPosition, targetTasks.size()));
            targetTasks.add(targetIndex, task);
            for (int i = 0; i < targetTasks.size(); i++) {
                targetTasks.get(i).updatePosition(i);
            }
            task.move(targetColumnId, targetIndex);
            tasks.saveAll(targetTasks);
        }

        Task saved = tasks.saveAndFlush(task);
        eventPublisher.publish(RealtimeEvent.of("task.moved", project.workspaceId(), project.id(), saved.id(), saved.version()));
        return saved;
    }

    @Transactional
    public void delete(UUID id, long version) {
        Task task = get(id);
        if (task.version() != version) {
            throw new ConflictException("The task was modified by another request; refresh and retry");
        }
        Project project = projects.get(task.projectId());
        access.require(project.workspaceId(), current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);

        UUID columnId = task.columnId();
        tasks.delete(task);
        tasks.flush();

        List<Task> remaining = new ArrayList<>(tasks.findAllByColumnIdOrderByPositionAsc(columnId));
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).updatePosition(i);
        }
        tasks.saveAllAndFlush(remaining);
        eventPublisher.publish(RealtimeEvent.of("task.deleted", project.workspaceId(), project.id(), task.id(), null));
    }

    private void validateAssignee(UUID workspaceId, UUID assigneeId) {
        if (assigneeId != null) {
            memberships.findByWorkspaceIdAndUserId(workspaceId, assigneeId)
                    .orElseThrow(() -> new NotFoundException("Assignee is not a member of the workspace"));
        }
    }
}
