package com.kinetic.foundation.error;

import java.time.Instant;
import java.util.List;

public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        List<FieldError> fieldErrors,
        String requestId
) {
    public static ApiError of(int status, String code, String message, List<FieldError> fieldErrors, String requestId) {
        return new ApiError(Instant.now(), status, code, message, List.copyOf(fieldErrors), requestId);
    }

    public record FieldError(String field, String message) {
    }
}
