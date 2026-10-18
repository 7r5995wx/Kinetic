package com.kinetic.activity.api;

import com.kinetic.activity.service.ActivityService;
import com.kinetic.foundation.api.PageResponse;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@Validated
public class ActivityController {

    private final ActivityService service;

    public ActivityController(ActivityService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/activities")
    public PageResponse<ActivityDtos.View> list(
            @PathVariable UUID workspaceId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) int size
    ) {
        return PageResponse.from(
                service.list(
                        workspaceId,
                        PageRequest.of(page, Math.min(size, 100), Sort.by("createdAt").descending().and(Sort.by("id").descending()))
                ),
                view -> view
        );
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/activities/export/csv")
    public ResponseEntity<byte[]> exportCsv(@PathVariable UUID workspaceId) {
        String csv = service.exportCsv(workspaceId);
        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"workspace-" + workspaceId + "-activity.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(bytes);
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/activities/export/json")
    public ResponseEntity<List<ActivityDtos.View>> exportJson(@PathVariable UUID workspaceId) {
        List<ActivityDtos.View> data = service.exportJson(workspaceId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"workspace-" + workspaceId + "-activity.json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(data);
    }
}
