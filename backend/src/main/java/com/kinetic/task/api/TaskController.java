package com.kinetic.task.api;

import com.kinetic.foundation.api.PageResponse;
import com.kinetic.task.domain.TaskPriority;
import com.kinetic.task.service.TaskService;
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

import java.util.UUID;

@RestController
@Validated
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/projects/{projectId}/tasks")
    public ResponseEntity<TaskDtos.View> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody TaskDtos.Create request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(TaskDtos.View.of(service.create(projectId, request)));
    }

    @GetMapping("/api/v1/projects/{projectId}/tasks")
    public PageResponse<TaskDtos.View> list(
            @PathVariable UUID projectId,
            @RequestParam(required = false) UUID columnId,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) UUID assigneeId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) int size
    ) {
        return PageResponse.from(
                service.list(
                        projectId,
                        columnId,
                        priority,
                        assigneeId,
                        PageRequest.of(page, Math.min(size, 100), Sort.by("position").ascending().and(Sort.by("id")))
                ),
                TaskDtos.View::of
        );
    }

    @GetMapping("/api/v1/tasks/{id}")
    public TaskDtos.View get(@PathVariable UUID id) {
        return TaskDtos.View.of(service.get(id));
    }

    @PatchMapping("/api/v1/tasks/{id}")
    public TaskDtos.View update(
            @PathVariable UUID id,
            @Valid @RequestBody TaskDtos.Update request
    ) {
        return TaskDtos.View.of(service.update(id, request));
    }

    @PostMapping("/api/v1/tasks/{id}/move")
    public TaskDtos.View move(
            @PathVariable UUID id,
            @Valid @RequestBody TaskDtos.Move request
    ) {
        return TaskDtos.View.of(service.move(id, request));
    }

    @DeleteMapping("/api/v1/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID id,
            @RequestParam @Min(0) long version
    ) {
        service.delete(id, version);
    }
}
