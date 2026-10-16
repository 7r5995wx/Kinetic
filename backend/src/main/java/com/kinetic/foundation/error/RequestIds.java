package com.kinetic.foundation.error;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

public final class RequestIds {

    public static final String ATTRIBUTE = RequestIds.class.getName() + ".requestId";

    private RequestIds() {
    }

    public static String from(HttpServletRequest request) {
        Object requestId = request.getAttribute(ATTRIBUTE);
        return requestId instanceof String value ? value : UUID.randomUUID().toString();
    }
}
