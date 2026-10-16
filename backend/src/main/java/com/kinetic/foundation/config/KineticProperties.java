package com.kinetic.foundation.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "kinetic")
public record KineticProperties(
        List<String> allowedOrigins,
        boolean sessionCookieSecure,
        String sessionCookieSameSite
) {

    public KineticProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
        sessionCookieSameSite = sessionCookieSameSite == null ? "lax" : sessionCookieSameSite;
    }
}
