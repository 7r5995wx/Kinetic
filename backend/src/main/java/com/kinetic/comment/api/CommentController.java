package com.kinetic.comment.api;

import com.kinetic.comment.service.CommentService;
import com.kinetic.foundation.api.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@Validated
public class CommentController {

    private final CommentService service;

    public CommentController(CommentService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/tasks/{taskId}/comments")
    public ResponseEntity<CommentDtos.View> create(
            @PathVariable UUID taskId,
            @Valid @RequestBody CommentDtos.Create request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(taskId, request));
    }

    @GetMapping("/api/v1/tasks/{taskId}/comments")
    public PageResponse<CommentDtos.View> list(
            @PathVariable UUID taskId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) int size
    ) {
        return PageResponse.from(
                service.list(
                        taskId,
                        PageRequest.of(page, Math.min(size, 100), Sort.by("createdAt").ascending().and(Sort.by("id").ascending()))
                ),
                view -> view
        );
    }

    @DeleteMapping("/api/v1/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
