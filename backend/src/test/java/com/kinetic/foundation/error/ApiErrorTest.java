package com.kinetic.foundation.error;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ApiErrorTest {

    @Test
    void createsAnImmutableErrorEnvelope() {
        ApiError error = ApiError.of(
                422,
                "VALIDATION_FAILED",
                "Request validation failed",
                List.of(new ApiError.FieldError("title", "must not be blank")),
                "request-123"
        );

        assertThat(error.status()).isEqualTo(422);
        assertThat(error.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(error.fieldErrors()).containsExactly(new ApiError.FieldError("title", "must not be blank"));
        assertThat(error.requestId()).isEqualTo("request-123");
        assertThat(error.timestamp()).isNotNull();
    }
}
