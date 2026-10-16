package com.kinetic.workspace.api;

import com.kinetic.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceService service;

    public WorkspaceController(WorkspaceService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<WorkspaceDtos.View> create(@Valid @RequestBody WorkspaceDtos.Create request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(WorkspaceDtos.View.of(service.create(request)));
    }

    @GetMapping
    public List<WorkspaceDtos.View> list() {
        return service.list().stream().map(WorkspaceDtos.View::of).toList();
    }

    @GetMapping("/{id}")
    public WorkspaceDtos.View get(@PathVariable UUID id) {
        return WorkspaceDtos.View.of(service.detail(id));
    }

    @PatchMapping("/{id}")
    public WorkspaceDtos.View update(@PathVariable UUID id, @Valid @RequestBody WorkspaceDtos.Update request) {
        return WorkspaceDtos.View.of(service.update(id, request));
    }

    @GetMapping("/{id}/members")
    public List<WorkspaceDtos.Member> members(@PathVariable UUID id) {
        return service.members(id).stream().map(WorkspaceDtos.Member::of).toList();
    }

    @PostMapping("/{id}/members")
    public WorkspaceDtos.Member add(@PathVariable UUID id, @Valid @RequestBody WorkspaceDtos.MemberChange request) {
        return WorkspaceDtos.Member.of(service.addOrChange(id, request));
    }

    @PatchMapping("/{id}/members/{userId}")
    public WorkspaceDtos.Member change(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody WorkspaceDtos.MemberChange request
    ) {
        return WorkspaceDtos.Member.of(service.addOrChange(id, new WorkspaceDtos.MemberChange(userId, request.role())));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable UUID id, @PathVariable UUID userId) {
        service.remove(id, userId);
    }
}
