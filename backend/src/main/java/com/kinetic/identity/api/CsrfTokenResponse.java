package com.kinetic.identity.api;

import org.springframework.security.web.csrf.CsrfToken;

public record CsrfTokenResponse(String headerName, String token) {

    public static CsrfTokenResponse from(CsrfToken token) {
        return new CsrfTokenResponse(token.getHeaderName(), token.getToken());
    }
}
