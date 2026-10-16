package com.kinetic.identity.service;

import com.kinetic.identity.api.LoginRequest;
import com.kinetic.identity.api.RegisterRequest;
import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.identity.security.KineticUserPrincipal;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public UserAccount register(RegisterRequest request) {
        String normalizedEmail = EmailNormalizer.normalize(request.email());
        if (users.findByEmailNormalized(normalizedEmail).isPresent()) {
            throw new DuplicateEmailException();
        }

        UserAccount account = UserAccount.register(
                normalizedEmail,
                normalizedEmail,
                request.displayName().trim(),
                passwordEncoder.encode(request.password())
        );
        try {
            return users.saveAndFlush(account);
        } catch (DataIntegrityViolationException exception) {
            throw new DuplicateEmailException();
        }
    }

    public Authentication authenticate(LoginRequest request) {
        try {
            return authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(EmailNormalizer.normalize(request.email()), request.password())
            );
        } catch (BadCredentialsException exception) {
            throw new InvalidCredentialsException();
        }
    }

    @Transactional(readOnly = true)
    public UserAccount currentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof KineticUserPrincipal principal)) {
            throw new InvalidCredentialsException();
        }
        UUID userId = principal.userId();
        return users.findById(userId).orElseThrow(InvalidCredentialsException::new);
    }

    public Authentication authenticationFor(UserAccount account) {
        KineticUserPrincipal principal = new KineticUserPrincipal(account.id(), account.emailNormalized(), account.passwordHash());
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
    }

    public void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }
}
