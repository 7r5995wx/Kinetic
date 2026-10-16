package com.kinetic.task.api;

import com.jayway.jsonpath.JsonPath;
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
class TaskControllerIntegrationTest {

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
    void createTask_requiresAuthCsrfValidationAndValidColumn() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = workspaces.save(Workspace.create("Workspace A", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));
        Project p = projects.save(Project.create(ws.id(), "Project 1", null, owner.id()));
        KanbanColumn col = columns.save(KanbanColumn.create(p.id(), "To do", 0));

        // Unauthenticated
        mockMvc.perform(post("/api/v1/projects/" + p.id() + "/tasks")
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Task 1\",\"columnId\":\"" + col.id() + "\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isUnauthorized());

        MockHttpSession session = login("owner@example.com");

        // Missing CSRF
        mockMvc.perform(post("/api/v1/projects/" + p.id() + "/tasks")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Task 1\",\"columnId\":\"" + col.id() + "\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isForbidden());

        // Blank title
        mockMvc.perform(post("/api/v1/projects/" + p.id() + "/tasks")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"  \",\"columnId\":\"" + col.id() + "\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        // Invalid column
        UUID randomColId = UUID.randomUUID();
        mockMvc.perform(post("/api/v1/projects/" + p.id() + "/tasks")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Task 1\",\"columnId\":\"" + randomColId + "\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // Invalid assignee (not in workspace)
        UUID randomUserId = UUID.randomUUID();
        mockMvc.perform(post("/api/v1/projects/" + p.id() + "/tasks")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Task 1\",\"columnId\":\"" + col.id() + "\",\"priority\":\"HIGH\",\"assigneeId\":\"" + randomUserId + "\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void createTask_successAndListFiltered() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = workspaces.save(Workspace.create("Workspace A", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));
        Project p = projects.save(Project.create(ws.id(), "Project 1", null, owner.id()));
        KanbanColumn colTodo = columns.save(KanbanColumn.create(p.id(), "To do", 0));
        KanbanColumn colDone = columns.save(KanbanColumn.create(p.id(), "Done", 1));

        MockHttpSession session = login("owner@example.com");

        MvcResult result = mockMvc.perform(post("/api/v1/projects/" + p.id() + "/tasks")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Release 1.0\",\"description\":\"Ship MVP\",\"columnId\":\"" + colTodo.id() + "\",\"priority\":\"HIGH\",\"dueDate\":\"2026-11-01\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Release 1.0"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.position").value(0))
                .andExpect(jsonPath("$.version").value(0))
                .andReturn();

        String taskIdStr = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        UUID taskId = UUID.fromString(taskIdStr);

        // List tasks in project with priority filter
        mockMvc.perform(get("/api/v1/projects/" + p.id() + "/tasks?priority=HIGH").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(taskId.toString()));

        // Filter by different column returns 0 items
        mockMvc.perform(get("/api/v1/projects/" + p.id() + "/tasks?columnId=" + colDone.id()).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void taskUpdateAndMove_enforcesOptimisticLocking() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = workspaces.save(Workspace.create("Workspace A", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));
        Project p = projects.save(Project.create(ws.id(), "Project 1", null, owner.id()));
        KanbanColumn colA = columns.save(KanbanColumn.create(p.id(), "Col A", 0));
        KanbanColumn colB = columns.save(KanbanColumn.create(p.id(), "Col B", 1));

        Task task = tasks.save(Task.create(p.id(), colA.id(), "Original", null, TaskPriority.LOW, null, null, 0, owner.id()));

        MockHttpSession session = login("owner@example.com");

        // Stale version update fails (409)
        mockMvc.perform(patch("/api/v1/tasks/" + task.id())
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Updated\",\"priority\":\"MEDIUM\",\"version\":999}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));

        // Correct version update succeeds
        MvcResult updateResult = mockMvc.perform(patch("/api/v1/tasks/" + task.id())
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Updated Title\",\"priority\":\"MEDIUM\",\"version\":" + task.version() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Title"))
                .andExpect(jsonPath("$.priority").value("MEDIUM"))
                .andReturn();

        Number newVersionNum = JsonPath.read(updateResult.getResponse().getContentAsString(), "$.version");
        long newVersion = newVersionNum.longValue();
        assertThat(newVersion).isGreaterThan(task.version());

        // Stale version move fails (409)
        mockMvc.perform(post("/api/v1/tasks/" + task.id() + "/move")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"columnId\":\"" + colB.id() + "\",\"position\":0,\"version\":" + task.version() + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));

        // Correct version move succeeds
        mockMvc.perform(post("/api/v1/tasks/" + task.id() + "/move")
                        .session(session)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"columnId\":\"" + colB.id() + "\",\"position\":0,\"version\":" + newVersion + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.columnId").value(colB.id().toString()))
                .andExpect(jsonPath("$.position").value(0));
    }

    @Test
    void deleteTask_enforcesOptimisticLockingAndSuccess() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = workspaces.save(Workspace.create("Workspace A", owner.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), owner.id(), WorkspaceRole.OWNER));
        Project p = projects.save(Project.create(ws.id(), "Project 1", null, owner.id()));
        KanbanColumn col = columns.save(KanbanColumn.create(p.id(), "Col", 0));

        Task task = tasks.save(Task.create(p.id(), col.id(), "To Delete", null, TaskPriority.LOW, null, null, 0, owner.id()));

        MockHttpSession session = login("owner@example.com");

        // Stale version delete fails (409)
        mockMvc.perform(delete("/api/v1/tasks/" + task.id() + "?version=999")
                        .session(session)
                        .with(csrf().asHeader()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));

        // Correct version delete succeeds (204)
        mockMvc.perform(delete("/api/v1/tasks/" + task.id() + "?version=" + task.version())
                        .session(session)
                        .with(csrf().asHeader()))
                .andExpect(status().isNoContent());

        assertThat(tasks.findById(task.id())).isEmpty();
    }

    @Test
    void crossWorkspaceIsolation_deniesOutsiderOnAllTaskEndpoints() throws Exception {
        UserAccount ownerA = createUser("ownerA@example.com", "Owner A");
        UserAccount outsider = createUser("outsider@example.com", "Outsider");

        Workspace wsA = workspaces.save(Workspace.create("Workspace A", ownerA.id()));
        memberships.save(WorkspaceMembership.create(wsA.id(), ownerA.id(), WorkspaceRole.OWNER));
        Project pA = projects.save(Project.create(wsA.id(), "Project A", null, ownerA.id()));
        KanbanColumn colA = columns.save(KanbanColumn.create(pA.id(), "Col A", 0));
        Task taskA = tasks.save(Task.create(pA.id(), colA.id(), "Secret Task", null, TaskPriority.HIGH, null, null, 0, ownerA.id()));

        MockHttpSession sessionOutsider = login("outsider@example.com");

        // Outsider cannot GET task (404)
        mockMvc.perform(get("/api/v1/tasks/" + taskA.id()).session(sessionOutsider))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // Outsider cannot list tasks (404)
        mockMvc.perform(get("/api/v1/projects/" + pA.id() + "/tasks").session(sessionOutsider))
                .andExpect(status().isNotFound());

        // Outsider cannot update task (404)
        mockMvc.perform(patch("/api/v1/tasks/" + taskA.id())
                        .session(sessionOutsider)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Compromised\",\"priority\":\"LOW\",\"version\":0}"))
                .andExpect(status().isNotFound());

        // Outsider cannot delete task (404)
        mockMvc.perform(delete("/api/v1/tasks/" + taskA.id() + "?version=0")
                        .session(sessionOutsider)
                        .with(csrf().asHeader()))
                .andExpect(status().isNotFound());
    }
}
