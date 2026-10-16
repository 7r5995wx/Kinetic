package com.kinetic.workspace.api;

import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.project.repository.KanbanColumnRepository;
import com.kinetic.project.repository.ProjectRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkspaceControllerIntegrationTest {

    private static final String PASSWORD = "secure-password-123";

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

    @BeforeEach
    @AfterEach
    void cleanup() {
        tasks.deleteAll();
        columns.deleteAll();
        projects.deleteAll();
        memberships.deleteAll();
        workspaces.deleteAll();
        users.deleteAll();
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
    void createWorkspace_requiresAuthenticationAndCsrf() throws Exception {
        mockMvc.perform(post("/api/v1/workspaces")
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test WS\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        UserAccount user = createUser("user@example.com", "User");
        MockHttpSession session = login("user@example.com");

        mockMvc.perform(post("/api/v1/workspaces")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test WS\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void createWorkspace_validatesInput() throws Exception {
        createUser("user@example.com", "User");
        MockHttpSession session = login("user@example.com");

        mockMvc.perform(post("/api/v1/workspaces")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
    }

    @Test
    void createWorkspace_successAndListCallerWorkspacesOnly() throws Exception {
        UserAccount userA = createUser("alice@example.com", "Alice");
        UserAccount userB = createUser("bob@example.com", "Bob");

        MockHttpSession sessionA = login("alice@example.com");
        MockHttpSession sessionB = login("bob@example.com");

        mockMvc.perform(post("/api/v1/workspaces")
                        .session(sessionA)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Alice Workspace\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Alice Workspace"))
                .andExpect(jsonPath("$.createdBy").value(userA.id().toString()))
                .andExpect(jsonPath("$.id").isNotEmpty());

        mockMvc.perform(post("/api/v1/workspaces")
                        .session(sessionB)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Bob Workspace\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Bob Workspace"))
                .andExpect(jsonPath("$.createdBy").value(userB.id().toString()));

        mockMvc.perform(get("/api/v1/workspaces").session(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Alice Workspace"));

        mockMvc.perform(get("/api/v1/workspaces").session(sessionB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Bob Workspace"));
    }

    @Test
    void getAndUpdateWorkspace_enforcesRoleAndIsolation() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        UserAccount member = createUser("member@example.com", "Member");
        UserAccount outsider = createUser("outsider@example.com", "Outsider");

        Workspace ws = workspaces.save(Workspace.create("Alpha", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));
        memberships.save(WorkspaceMembership.create(ws.id(), member.id(), WorkspaceRole.MEMBER));

        MockHttpSession sessionOwner = login("owner@example.com");
        MockHttpSession sessionMember = login("member@example.com");
        MockHttpSession sessionOutsider = login("outsider@example.com");

        // Member and Owner can get
        mockMvc.perform(get("/api/v1/workspaces/" + ws.id()).session(sessionMember))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alpha"));

        // Outsider gets 404
        mockMvc.perform(get("/api/v1/workspaces/" + ws.id()).session(sessionOutsider))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // Member cannot update (forbidden)
        mockMvc.perform(patch("/api/v1/workspaces/" + ws.id())
                        .session(sessionMember)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed Alpha\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // Owner can update
        mockMvc.perform(patch("/api/v1/workspaces/" + ws.id())
                        .session(sessionOwner)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed Alpha\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed Alpha"));
    }

    @Test
    void membershipManagement_enforcesOwnerOnlyAndSoleOwnerProtection() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        UserAccount dev = createUser("dev@example.com", "Developer");

        Workspace ws = workspaces.save(Workspace.create("Beta", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));

        MockHttpSession sessionOwner = login("owner@example.com");
        MockHttpSession sessionDev = login("dev@example.com");

        // Add dev by email
        mockMvc.perform(post("/api/v1/workspaces/" + ws.id() + "/members")
                        .session(sessionOwner)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"dev@example.com\",\"role\":\"MEMBER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(dev.id().toString()))
                .andExpect(jsonPath("$.role").value("MEMBER"));

        // Dev cannot add members
        mockMvc.perform(post("/api/v1/workspaces/" + ws.id() + "/members")
                        .session(sessionDev)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"unknown@example.com\",\"role\":\"MEMBER\"}"))
                .andExpect(status().isForbidden());

        // Change dev to ADMIN
        mockMvc.perform(patch("/api/v1/workspaces/" + ws.id() + "/members/" + dev.id())
                        .session(sessionOwner)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + dev.id() + "\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        // Demoting sole owner returns 409 CONFLICT
        mockMvc.perform(patch("/api/v1/workspaces/" + ws.id() + "/members/" + owner.id())
                        .session(sessionOwner)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + owner.id() + "\",\"role\":\"MEMBER\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));

        // Removing sole owner returns 409 CONFLICT
        mockMvc.perform(delete("/api/v1/workspaces/" + ws.id() + "/members/" + owner.id())
                        .session(sessionOwner)
                        .with(csrf().asHeader()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));

        // Removing dev succeeds (204)
        mockMvc.perform(delete("/api/v1/workspaces/" + ws.id() + "/members/" + dev.id())
                        .session(sessionOwner)
                        .with(csrf().asHeader()))
                .andExpect(status().isNoContent());

        assertThat(memberships.findByWorkspaceIdAndUserId(ws.id(), dev.id())).isEmpty();
    }
}
