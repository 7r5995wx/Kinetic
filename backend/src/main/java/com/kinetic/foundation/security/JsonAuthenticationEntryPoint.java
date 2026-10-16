package com.kinetic.foundation.security;

import com.kinetic.foundation.error.ApiError;
import com.kinetic.foundation.error.RequestIds;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final JsonAccessDeniedHandler responseWriter;

    public JsonAuthenticationEntryPoint(JsonAccessDeniedHandler responseWriter) {
        this.responseWriter = responseWriter;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException {
        responseWriter.write(response, ApiError.of(401, "UNAUTHENTICATED", "Authentication is required", List.of(), RequestIds.from(request)));
    }
}
