package com.kinetic.activity.service;

import com.kinetic.activity.api.ActivityDtos;
import com.kinetic.activity.domain.WorkspaceActivity;
import com.kinetic.activity.repository.WorkspaceActivityRepository;
import com.kinetic.foundation.security.AuthenticatedUser;
import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.realtime.event.RealtimeEvent;
import com.kinetic.realtime.event.RealtimeEventPublisher;
import com.kinetic.workspace.service.WorkspaceAccess;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ActivityService {

    private static final int MAX_EXPORT_LIMIT = 1000;

    private final WorkspaceActivityRepository activities;
    private final WorkspaceAccess access;
    private final UserAccountRepository users;
    private final AuthenticatedUser current;
    private final RealtimeEventPublisher eventPublisher;

    public ActivityService(
            WorkspaceActivityRepository activities,
            WorkspaceAccess access,
            UserAccountRepository users,
            AuthenticatedUser current,
            RealtimeEventPublisher eventPublisher
    ) {
        this.activities = activities;
        this.access = access;
        this.users = users;
        this.current = current;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public WorkspaceActivity record(
            UUID workspaceId,
            UUID actorId,
            String type,
            String description,
            UUID projectId,
            UUID taskId,
            String payload
    ) {
        WorkspaceActivity activity = WorkspaceActivity.create(
                workspaceId,
                actorId,
                type,
                description,
                projectId,
                taskId,
                payload
        );
        WorkspaceActivity saved = activities.saveAndFlush(activity);
        eventPublisher.publish(RealtimeEvent.of("activity.created", workspaceId, projectId, saved.id(), null));
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<ActivityDtos.View> list(UUID workspaceId, Pageable pageable) {
        access.member(workspaceId, current.id());

        Page<WorkspaceActivity> page = activities.findAllByWorkspaceIdOrderByCreatedAtDescIdDesc(workspaceId, pageable);
        Map<UUID, String> actorNames = resolveActorNames(page.getContent());

        return page.map(a -> ActivityDtos.View.of(a, getActorDisplayName(a.actorId(), actorNames)));
    }

    @Transactional(readOnly = true)
    public List<ActivityDtos.View> exportJson(UUID workspaceId) {
        access.member(workspaceId, current.id());

        Pageable pageable = PageRequest.of(0, MAX_EXPORT_LIMIT, Sort.by("createdAt").descending().and(Sort.by("id").descending()));
        List<WorkspaceActivity> list = activities.findAllByWorkspaceIdOrderByCreatedAtDescIdDesc(workspaceId, pageable).getContent();
        Map<UUID, String> actorNames = resolveActorNames(list);

        return list.stream()
                .map(a -> ActivityDtos.View.of(a, getActorDisplayName(a.actorId(), actorNames)))
                .toList();
    }

    @Transactional(readOnly = true)
    public String exportCsv(UUID workspaceId) {
        List<ActivityDtos.View> records = exportJson(workspaceId);

        StringBuilder sb = new StringBuilder();
        sb.append("id,timestamp,type,actor_name,description,project_id,task_id\n");

        for (ActivityDtos.View r : records) {
            sb.append(escapeCsvCell(r.id() != null ? r.id().toString() : "")).append(",");
            sb.append(escapeCsvCell(r.createdAt() != null ? r.createdAt().toString() : "")).append(",");
            sb.append(escapeCsvCell(r.type())).append(",");
            sb.append(escapeCsvCell(r.actorName())).append(",");
            sb.append(escapeCsvCell(r.description())).append(",");
            sb.append(escapeCsvCell(r.projectId() != null ? r.projectId().toString() : "")).append(",");
            sb.append(escapeCsvCell(r.taskId() != null ? r.taskId().toString() : "")).append("\n");
        }

        return sb.toString();
    }

    public static String escapeCsvCell(String value) {
        if (value == null) {
            return "";
        }
        String clean = value;
        boolean formulaPrefixed = false;
        if (!clean.isEmpty()) {
            int idx = 0;
            while (idx < clean.length() && (clean.charAt(idx) <= ' ' || Character.isWhitespace(clean.charAt(idx)) || Character.isISOControl(clean.charAt(idx)))) {
                idx++;
            }
            char first = clean.charAt(0);
            boolean isDirectTrigger = (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r');
            boolean isFormula = (idx < clean.length() && (clean.charAt(idx) == '=' || clean.charAt(idx) == '+' || clean.charAt(idx) == '-' || clean.charAt(idx) == '@'));

            if (isDirectTrigger || isFormula) {
                clean = "'" + clean;
                formulaPrefixed = true;
            }
        }
        boolean needsQuotes = formulaPrefixed
                || clean.contains(",")
                || clean.contains("\"")
                || clean.contains("\n")
                || clean.contains("\r");

        if (needsQuotes) {
            return "\"" + clean.replace("\"", "\"\"") + "\"";
        }
        return clean;
    }

    private Map<UUID, String> resolveActorNames(List<WorkspaceActivity> list) {
        Set<UUID> actorIds = list.stream()
                .map(WorkspaceActivity::actorId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        return users.findAllById(actorIds).stream()
                .collect(Collectors.toMap(UserAccount::id, UserAccount::displayName));
    }

    private String getActorDisplayName(UUID actorId, Map<UUID, String> actorNames) {
        if (actorId == null) {
            return "System";
        }
        return actorNames.getOrDefault(actorId, "Former Member");
    }
}
