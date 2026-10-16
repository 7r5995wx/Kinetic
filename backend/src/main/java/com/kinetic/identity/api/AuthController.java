package com.kinetic.identity.api;

import com.kinetic.foundation.config.KineticProperties;
import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final SecurityContextRepository securityContextRepository;
    private final KineticProperties properties;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final com.kinetic.realtime.security.WebSocketTicketService ticketService;
    private final CsrfTokenRepository csrfTokenRepository;

    public AuthController(
            AuthService authService,
            SecurityContextRepository securityContextRepository,
            KineticProperties properties,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            com.kinetic.realtime.security.WebSocketTicketService ticketService,
            CsrfTokenRepository csrfTokenRepository
    ) {
        this.authService = authService;
        this.securityContextRepository = securityContextRepository;
        this.properties = properties;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.ticketService = ticketService;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @GetMapping("/csrf")
    public CsrfTokenResponse csrf(HttpServletRequest request, HttpServletResponse response) {
        Object attr = request.getAttribute(CsrfToken.class.getName());
        CsrfToken token;
        if (attr instanceof CsrfToken ct) {
            token = ct;
        } else if (attr instanceof java.util.function.Supplier<?> s && s.get() instanceof CsrfToken ct) {
            token = ct;
        } else {
            token = csrfTokenRepository.generateToken(request);
        }
        csrfTokenRepository.saveToken(token, request, response);
        return CsrfTokenResponse.from(token);
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        UserAccount account = authService.register(request);
        establishSession(authService.authenticationFor(account), servletRequest, servletResponse);
        return ResponseEntity.status(201).body(UserResponse.from(account));
    }

    @PostMapping("/login")
    public UserResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        Authentication authentication = authService.authenticate(request);
        establishSession(authentication, servletRequest, servletResponse);
        return UserResponse.from(authService.currentUser(authentication));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        if (servletRequest.getSession(false) != null) {
            servletRequest.getSession(false).invalidate();
        }
        authService.clearAuthentication();
        servletResponse.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from("JSESSIONID", "")
                .httpOnly(true)
                .secure(properties.sessionCookieSecure())
                .sameSite(properties.sessionCookieSameSite())
                .path("/")
                .maxAge(Duration.ZERO)
                .build()
                .toString());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return UserResponse.from(authService.currentUser(authentication));
    }

    @PostMapping("/ws-ticket")
    public WsTicketResponse wsTicket(Authentication authentication) {
        UserAccount current = authService.currentUser(authentication);
        com.kinetic.realtime.security.WebSocketTicket ticket = ticketService.createTicket(current.id(), current.email());
        return new WsTicketResponse(ticket.ticket(), ticket.expiresInSeconds());
    }

    private void establishSession(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        sessionAuthenticationStrategy.onAuthentication(authentication, request, response);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }
}
