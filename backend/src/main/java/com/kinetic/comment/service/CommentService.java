package com.kinetic.comment.service;

import com.kinetic.comment.api.CommentDtos;
import com.kinetic.comment.domain.Comment;
import com.kinetic.comment.repository.CommentRepository;
import com.kinetic.foundation.error.NotFoundException;
import com.kinetic.foundation.security.AuthenticatedUser;
import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.project.domain.Project;
import com.kinetic.project.service.ProjectService;
import com.kinetic.realtime.event.RealtimeEvent;
import com.kinetic.realtime.event.RealtimeEventPublisher;
import com.kinetic.task.domain.Task;
import com.kinetic.task.repository.TaskRepository;
import com.kinetic.workspace.domain.WorkspaceMembership;
import com.kinetic.workspace.security.WorkspaceRole;
import com.kinetic.workspace.service.WorkspaceAccess;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.kinetic.activity.service.ActivityService;

@Service
public class CommentService {

    private final CommentRepository comments;
    private final TaskRepository tasks;
    private final ProjectService projects;
    private final WorkspaceAccess access;
    private final UserAccountRepository users;
    private final AuthenticatedUser current;
    private final RealtimeEventPublisher eventPublisher;
    private final ActivityService activityService;

    public CommentService(
            CommentRepository comments,
            TaskRepository tasks,
            ProjectService projects,
            WorkspaceAccess access,
            UserAccountRepository users,
            AuthenticatedUser current,
            RealtimeEventPublisher eventPublisher,
            ActivityService activityService
    ) {
        this.comments = comments;
        this.tasks = tasks;
        this.projects = projects;
        this.access = access;
        this.users = users;
        this.current = current;
        this.eventPublisher = eventPublisher;
        this.activityService = activityService;
    }

    @Transactional
    public CommentDtos.View create(UUID taskId, CommentDtos.Create request) {
        Task task = tasks.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task was not found"));
        Project project = projects.get(task.projectId());
        access.require(project.workspaceId(), current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);

        Comment comment = Comment.create(taskId, current.id(), request.content().trim());
        Comment saved = comments.saveAndFlush(comment);

        eventPublisher.publish(RealtimeEvent.of("comment.created", project.workspaceId(), project.id(), saved.id(), null));
        activityService.record(
                project.workspaceId(),
                current.id(),
                "comment.created",
                "Commented on task \"" + task.title() + "\"",
                project.id(),
                task.id(),
                "{\"taskTitle\":\"" + escapeJson(task.title()) + "\"}"
        );

        String authorName = users.findById(current.id())
                .map(UserAccount::displayName)
                .orElse("Member");

        return CommentDtos.View.of(saved, authorName);
    }

    private String escapeJson(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    @Transactional(readOnly = true)
    public Page<CommentDtos.View> list(UUID taskId, Pageable pageable) {
        Task task = tasks.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task was not found"));
        Project project = projects.get(task.projectId());
        access.require(project.workspaceId(), current.id(), WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);

        Page<Comment> page = comments.findAllByTaskIdOrderByCreatedAtAscIdAsc(taskId, pageable);

        Set<UUID> authorIds = page.getContent().stream()
                .map(Comment::authorId)
                .collect(Collectors.toSet());

        Map<UUID, String> authorNames = users.findAllById(authorIds).stream()
                .collect(Collectors.toMap(UserAccount::id, UserAccount::displayName));

        return page.map(c -> CommentDtos.View.of(c, authorNames.getOrDefault(c.authorId(), "Member")));
    }

    @Transactional
    public void delete(UUID commentId) {
        Comment comment = comments.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment was not found"));
        Task task = tasks.findById(comment.taskId())
                .orElseThrow(() -> new NotFoundException("Task was not found"));
        Project project = projects.get(task.projectId());

        WorkspaceMembership membership = access.member(project.workspaceId(), current.id());

        boolean isAuthor = comment.authorId().equals(current.id());
        boolean isModerator = membership.role() == WorkspaceRole.OWNER || membership.role() == WorkspaceRole.ADMIN;

        if (!isAuthor && !isModerator) {
            throw new AccessDeniedException("You do not have permission to delete this comment");
        }

        comments.delete(comment);
        comments.flush();

        eventPublisher.publish(RealtimeEvent.of("comment.deleted", project.workspaceId(), project.id(), comment.id(), null));
    }
}
