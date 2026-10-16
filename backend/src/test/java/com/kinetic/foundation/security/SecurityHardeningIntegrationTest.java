package com.kinetic.foundation.security;

import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.project.domain.KanbanColumn;
import com.kinetic.project.domain.Project;
import com.kinetic.project.repository.KanbanColumnRepository;
import com.kinetic.project.repository.ProjectRepository;
import com.kinetic.task.domain.Task;
import com.kinetic.task.domain.TaskPriority;
import com.kinetic.task.repository.TaskRepository;
import com.kinetic.workspace.domain.Workspace;
import com.kinetic.workspace.domain.WorkspaceMembership;
import com.kinetic.workspace.repository.WorkspaceMembershipRepository;
import com.kinetic.workspace.repository.WorkspaceRepository;
import com.kinetic.workspace.security.WorkspaceRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHardeningIntegrationTest {

    private static final String PASSWORD = "super-secret-password-123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private WorkspaceRepository workspaces;

    @Autowired
    private WorkspaceMembershipRepository memberships;

    @Autowired
    private ProjectRepository projects;

    @Autowired
    private KanbanColumnRepository columns;

    @Autowired
    private TaskRepository tasks;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticatedUser authenticatedUser;

    @BeforeEach
    @AfterEach
    void cleanup() {
        tasks.deleteAll();
        columns.deleteAll();
        projects.deleteAll();
        memberships.deleteAll();
        workspaces.deleteAll();
        users.deleteAll();
        SecurityContextHolder.clearContext();
    }

    private UserAccount createUser(String email, String displayName) {
        return users.save(UserAccount.register(email, email.toLowerCase(), displayName, passwordEncoder.encode(PASSWORD)));
    }

    private MockHttpSession login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void securityHeadersArePresentOnResponses() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("X-Request-Id"));
    }

    @Test
    void corsConfigurationPermitsConfiguredOriginAndExposesRequestId() throws Exception {
        mockMvc.perform(options("/api/v1/workspaces")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type,X-CSRF-TOKEN"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().string("Access-Control-Expose-Headers", containsString("X-Request-Id")));

        // Unapproved origin is rejected
        mockMvc.perform(options("/api/v1/workspaces")
                        .header("Origin", "http://malicious-site.com")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousAccessIsRejectedAcrossProtectedEndpoints() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/workspaces"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        mockMvc.perform(get("/api/v1/workspaces/" + randomId))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        mockMvc.perform(get("/api/v1/projects/" + randomId))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        mockMvc.perform(get("/api/v1/tasks/" + randomId))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void csrfProtectionBlocksMutationsWithoutValidToken() throws Exception {
        createUser("user@example.com", "User");
        MockHttpSession session = login("user@example.com");

        // POST without CSRF header is rejected (403)
        mockMvc.perform(post("/api/v1/workspaces")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test WS\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // PATCH without CSRF header is rejected (403)
        mockMvc.perform(patch("/api/v1/workspaces/" + UUID.randomUUID())
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test WS\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // DELETE without CSRF header is rejected (403)
        mockMvc.perform(delete("/api/v1/workspaces/" + UUID.randomUUID() + "/members/" + UUID.randomUUID())
                        .session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void invalidParametersProduceBadRequestNotInternalError() throws Exception {
        createUser("user@example.com", "User");
        MockHttpSession session = login("user@example.com");

        // Non-UUID string in path parameter returns 400 INVALID_PARAMETER
        mockMvc.perform(get("/api/v1/workspaces/not-a-valid-uuid").session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
                .andExpect(jsonPath("$.message").value(containsString("id")));

        mockMvc.perform(get("/api/v1/projects/not-a-valid-uuid").session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));

        mockMvc.perform(get("/api/v1/tasks/not-a-valid-uuid").session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void unknownEndpointsProduceNotFoundNotInternalError() throws Exception {
        createUser("user@example.com", "User");
        MockHttpSession session = login("user@example.com");

        mockMvc.perform(get("/api/v1/unknown-endpoint-path").session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void authenticatedUserContextThrowsWhenUnauthenticated() {
        SecurityContextHolder.clearContext();
        assertThatThrownBy(() -> authenticatedUser.id())
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class)
                .hasMessageContaining("Authenticated user is required");
    }

    @Test
    void sessionInvalidationOnLogoutClearsSessionAndRejectsSubsequentCalls() throws Exception {
        createUser("user@example.com", "User");
        MockHttpSession session = login("user@example.com");

        mockMvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/logout")
                        .session(session)
                        .with(csrf().asHeader()))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString("JSESSIONID=")));

        // Session was invalidated; me returns 401
        mockMvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void safeErrorEnvelopeContainsNoStackTraceOrSensitiveInfo() throws Exception {
        mockMvc.perform(get("/api/v1/tasks/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.requestId").isNotEmpty())
                .andExpect(jsonPath("$.stackTrace").doesNotExist())
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }
}
