package com.kinetic.project.api;

import com.jayway.jsonpath.JsonPath;
import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.project.domain.Project;
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
class ProjectControllerIntegrationTest {

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
    void createProject_requiresAuthCsrfAndValidation() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = workspaces.save(Workspace.create("Workspace A", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));

        // Unauthenticated
        mockMvc.perform(post("/api/v1/workspaces/" + ws.id() + "/projects")
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Project 1\"}"))
                .andExpect(status().isUnauthorized());

        MockHttpSession session = login("owner@example.com");

        // Missing CSRF
        mockMvc.perform(post("/api/v1/workspaces/" + ws.id() + "/projects")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Project 1\"}"))
                .andExpect(status().isForbidden());

        // Blank name
        mockMvc.perform(post("/api/v1/workspaces/" + ws.id() + "/projects")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void createProject_successAndGeneratesDefaultColumns() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = workspaces.save(Workspace.create("Workspace A", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));

        MockHttpSession session = login("owner@example.com");

        MvcResult result = mockMvc.perform(post("/api/v1/workspaces/" + ws.id() + "/projects")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Core API\",\"description\":\"Backend services\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Core API"))
                .andExpect(jsonPath("$.description").value("Backend services"))
                .andExpect(jsonPath("$.workspaceId").value(ws.id().toString()))
                .andReturn();

        String projectIdStr = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        UUID projectId = UUID.fromString(projectIdStr);

        // Verify default columns
        mockMvc.perform(get("/api/v1/projects/" + projectId + "/columns").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("To do"))
                .andExpect(jsonPath("$[0].position").value(0))
                .andExpect(jsonPath("$[1].name").value("In progress"))
                .andExpect(jsonPath("$[1].position").value(1))
                .andExpect(jsonPath("$[2].name").value("Done"))
                .andExpect(jsonPath("$[2].position").value(2));
    }

    @Test
    void projectCrudAndRoleIsolation() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        UserAccount member = createUser("member@example.com", "Member");
        UserAccount outsider = createUser("outsider@example.com", "Outsider");

        Workspace ws = workspaces.save(Workspace.create("Alpha", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));
        memberships.save(WorkspaceMembership.create(ws.id(), member.id(), WorkspaceRole.MEMBER));

        Project p = projects.save(Project.create(ws.id(), "Website", "Design", owner.id()));

        MockHttpSession sessionOwner = login("owner@example.com");
        MockHttpSession sessionMember = login("member@example.com");
        MockHttpSession sessionOutsider = login("outsider@example.com");

        // Member can read
        mockMvc.perform(get("/api/v1/projects/" + p.id()).session(sessionMember))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Website"));

        // Outsider gets 404
        mockMvc.perform(get("/api/v1/projects/" + p.id()).session(sessionOutsider))
                .andExpect(status().isNotFound());

        // List projects paged
        mockMvc.perform(get("/api/v1/workspaces/" + ws.id() + "/projects").session(sessionMember))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(1));

        // Member cannot delete project (forbidden)
        mockMvc.perform(delete("/api/v1/projects/" + p.id())
                        .session(sessionMember)
                        .with(csrf().asHeader()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // Owner updates project
        mockMvc.perform(patch("/api/v1/projects/" + p.id())
                        .session(sessionOwner)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Website V2\",\"description\":\"Updated description\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Website V2"));

        // Owner deletes project
        mockMvc.perform(delete("/api/v1/projects/" + p.id())
                        .session(sessionOwner)
                        .with(csrf().asHeader()))
                .andExpect(status().isNoContent());

        assertThat(projects.findById(p.id())).isEmpty();
    }
}
