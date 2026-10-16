package com.kinetic.project.api;

import com.kinetic.foundation.api.PageResponse;
import com.kinetic.project.service.ProjectService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@Validated
public class ProjectController {

    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/workspaces/{workspaceId}/projects")
    public ResponseEntity<ProjectDtos.View> create(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody ProjectDtos.Create request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ProjectDtos.View.of(service.create(workspaceId, request)));
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/projects")
    public PageResponse<ProjectDtos.View> list(
            @PathVariable UUID workspaceId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) int size
    ) {
        return PageResponse.from(
                service.list(workspaceId, PageRequest.of(page, Math.min(size, 100), Sort.by("createdAt").descending())),
                ProjectDtos.View::of
        );
    }

    @GetMapping("/api/v1/projects/{id}")
    public ProjectDtos.View get(@PathVariable UUID id) {
        return ProjectDtos.View.of(service.get(id));
    }

    @PatchMapping("/api/v1/projects/{id}")
    public ProjectDtos.View update(
            @PathVariable UUID id,
            @Valid @RequestBody ProjectDtos.Update request
    ) {
        return ProjectDtos.View.of(service.update(id, request));
    }

    @DeleteMapping("/api/v1/projects/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/api/v1/projects/{id}/columns")
    public List<ProjectDtos.Column> columns(@PathVariable UUID id) {
        return service.columns(id).stream().map(ProjectDtos.Column::of).toList();
    }
}
