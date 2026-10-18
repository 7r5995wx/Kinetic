package com.kinetic.activity.api;

import com.kinetic.activity.domain.WorkspaceActivity;
import com.kinetic.activity.repository.WorkspaceActivityRepository;
import com.kinetic.activity.service.ActivityService;
import com.kinetic.comment.repository.CommentRepository;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ActivityControllerIntegrationTest {

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
    private CommentRepository comments;

    @Autowired
    private WorkspaceActivityRepository activities;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    @AfterEach
    void cleanup() {
        activities.deleteAll();
        comments.deleteAll();
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

    private Workspace createSampleWorkspace(UserAccount creator) {
        Workspace ws = workspaces.save(Workspace.create("Workspace A", creator.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), creator.id(), WorkspaceRole.OWNER));
        return ws;
    }

    @Test
    void unauthenticatedAccess_rejectedWith401() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = createSampleWorkspace(owner);

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities", ws.id()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities/export/csv", ws.id()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities/export/json", ws.id()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void workspaceIsolation_nonMemberGets404() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = createSampleWorkspace(owner);

        UserAccount outsider = createUser("outsider@example.com", "Outsider");
        MockHttpSession outsiderSession = login(outsider.email());

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities", ws.id())
                        .session(outsiderSession))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities/export/csv", ws.id())
                        .session(outsiderSession))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities/export/json", ws.id())
                        .session(outsiderSession))
                .andExpect(status().isNotFound());
    }

    @Test
    void supportedActions_generateActivityRecords() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Ada Lovelace");
        Workspace ws = createSampleWorkspace(owner);
        MockHttpSession ownerSession = login(owner.email());

        // 1. Project created
        MvcResult projResult = mockMvc.perform(post("/api/v1/workspaces/{workspaceId}/projects", ws.id())
                        .session(ownerSession)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Project Alpha\",\"description\":\"First project\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        String projIdStr = com.jayway.jsonpath.JsonPath.read(projResult.getResponse().getContentAsString(), "$.id");
        UUID projectId = UUID.fromString(projIdStr);

        // Fetch columns
        KanbanColumn column = columns.findAllByProjectIdOrderByPositionAsc(projectId).get(0);

        // 2. Task created
        MvcResult taskResult = mockMvc.perform(post("/api/v1/projects/{projectId}/tasks", projectId)
                        .session(ownerSession)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Design Wireframes\",\"columnId\":\"" + column.id() + "\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        String taskIdStr = com.jayway.jsonpath.JsonPath.read(taskResult.getResponse().getContentAsString(), "$.id");
        UUID taskId = UUID.fromString(taskIdStr);

        // 3. Task updated
        mockMvc.perform(patch("/api/v1/tasks/{id}", taskId)
                        .session(ownerSession)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Design Hi-Fi Wireframes\",\"priority\":\"URGENT\",\"version\":0}"))
                .andExpect(status().isOk());

        // 4. Task moved
        KanbanColumn targetColumn = columns.findAllByProjectIdOrderByPositionAsc(projectId).get(1);
        mockMvc.perform(post("/api/v1/tasks/{id}/move", taskId)
                        .session(ownerSession)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"columnId\":\"" + targetColumn.id() + "\",\"position\":0,\"version\":1}"))
                .andExpect(status().isOk());

        // 5. Task deleted
        mockMvc.perform(delete("/api/v1/tasks/{id}", taskId)
                        .session(ownerSession)
                        .with(csrf().asHeader())
                        .param("version", "2"))
                .andExpect(status().isNoContent());

        // Verify activities list
        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities", ws.id())
                        .session(ownerSession)
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.items[0].type").value("task.deleted"))
                .andExpect(jsonPath("$.items[0].actorName").value("Ada Lovelace"))
                .andExpect(jsonPath("$.items[1].type").value("task.moved"))
                .andExpect(jsonPath("$.items[2].type").value("task.updated"))
                .andExpect(jsonPath("$.items[3].type").value("task.created"))
                .andExpect(jsonPath("$.items[4].type").value("project.created"));
    }

    @Test
    void transactionRollback_noActivityPersisted() {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = createSampleWorkspace(owner);

        long initialCount = activities.count();

        TransactionStatus status = transactionManager.getTransaction(new DefaultTransactionDefinition());
        try {
            activities.save(WorkspaceActivity.create(
                    ws.id(),
                    owner.id(),
                    "task.created",
                    "Simulated failed task",
                    null,
                    null,
                    null
            ));
            // Simulate business transaction rollback
            transactionManager.rollback(status);
        } catch (Exception e) {
            transactionManager.rollback(status);
        }

        assertThat(activities.count()).isEqualTo(initialCount);
    }

    @Test
    void paginationAndDeterministicOrdering() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = createSampleWorkspace(owner);
        MockHttpSession ownerSession = login(owner.email());

        Instant fixedTime = Instant.parse("2026-10-18T10:00:00Z");
        UUID id1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID id2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID id3 = UUID.fromString("00000000-0000-0000-0000-000000000003");

        // Insert identical timestamp, verify tie-breaker (id DESC)
        activities.save(WorkspaceActivity.create(id1, ws.id(), owner.id(), "test.1", "Desc 1", null, null, null, fixedTime));
        activities.save(WorkspaceActivity.create(id3, ws.id(), owner.id(), "test.3", "Desc 3", null, null, null, fixedTime));
        activities.save(WorkspaceActivity.create(id2, ws.id(), owner.id(), "test.2", "Desc 2", null, null, null, fixedTime));

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities", ws.id())
                        .session(ownerSession)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.items[0].id").value(id3.toString()))
                .andExpect(jsonPath("$.items[1].id").value(id2.toString()))
                .andExpect(jsonPath("$.items[2].id").value(id1.toString()));
    }

    @Test
    void csvExport_escapesAndPreventsFormulaInjection() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Admin");
        Workspace ws = createSampleWorkspace(owner);
        MockHttpSession ownerSession = login(owner.email());

        // Dangerous formula payloads: direct prefix, leading spaces, leading tabs, leading newlines, mixed whitespace/control
        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "task.created",
                "=cmd|' /C calc'!A0",
                null,
                null,
                null
        ));

        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "task.updated",
                "   +1234",
                null,
                null,
                null
        ));

        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "task.moved",
                "\t@SUM(A1:A10)",
                null,
                null,
                null
        ));

        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "task.deleted",
                "\n-500",
                null,
                null,
                null
        ));

        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "project.created",
                " \t\r\n =malicious_macro",
                null,
                null,
                null
        ));

        // Ordinary values: quotes & commas, ordinary clean description, ordinary with spaces
        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "project.updated",
                "Regular task with, comma and \"quotes\"",
                null,
                null,
                null
        ));

        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "project.deleted",
                "Ordinary clean description",
                null,
                null,
                null
        ));

        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "comment.created",
                "   Normal description with spaces   ",
                null,
                null,
                null
        ));

        MvcResult result = mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities/export/csv", ws.id())
                        .session(ownerSession))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"workspace-" + ws.id() + "-activity.csv\""))
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        assertThat(csv).startsWith("id,timestamp,type,actor_name,description,project_id,task_id\n");

        // Formula injection neutralized with leading single quote inside quotes
        assertThat(csv).contains("\"'=cmd|' /C calc'!A0\"");
        assertThat(csv).contains("\"'   +1234\"");
        assertThat(csv).contains("\"'\t@SUM(A1:A10)\"");
        assertThat(csv).contains("\"'\n-500\"");
        assertThat(csv).contains("\"' \t\r\n =malicious_macro\"");

        // Ordinary values properly escaped or preserved
        assertThat(csv).contains("\"Regular task with, comma and \"\"quotes\"\"\"");
        assertThat(csv).contains(",Ordinary clean description,");
        assertThat(csv).contains(",   Normal description with spaces   ,");
    }

    @Test
    void escapeCsvCell_neutralizesAllFormulaTriggersAndPreservesOrdinaryValues() {
        // Direct formula prefixes
        assertThat(ActivityService.escapeCsvCell("=1+1")).isEqualTo("\"'=1+1\"");
        assertThat(ActivityService.escapeCsvCell("+1+1")).isEqualTo("\"'+1+1\"");
        assertThat(ActivityService.escapeCsvCell("-1+1")).isEqualTo("\"'-1+1\"");
        assertThat(ActivityService.escapeCsvCell("@SUM")).isEqualTo("\"'@SUM\"");
        assertThat(ActivityService.escapeCsvCell("\t=cmd")).isEqualTo("\"'\t=cmd\"");
        assertThat(ActivityService.escapeCsvCell("\r=cmd")).isEqualTo("\"'\r=cmd\"");

        // Leading spaces before formula triggers
        assertThat(ActivityService.escapeCsvCell(" =1+1")).isEqualTo("\"' =1+1\"");
        assertThat(ActivityService.escapeCsvCell("   +1+1")).isEqualTo("\"'   +1+1\"");
        assertThat(ActivityService.escapeCsvCell("  -1+1")).isEqualTo("\"'  -1+1\"");
        assertThat(ActivityService.escapeCsvCell("   @SUM")).isEqualTo("\"'   @SUM\"");

        // Leading tabs, newlines, and carriage returns before formula triggers
        assertThat(ActivityService.escapeCsvCell("\t@SUM")).isEqualTo("\"'\t@SUM\"");
        assertThat(ActivityService.escapeCsvCell("\n=1+1")).isEqualTo("\"'\n=1+1\"");
        assertThat(ActivityService.escapeCsvCell("\r\n+1+1")).isEqualTo("\"'\r\n+1+1\"");

        // Mixed whitespace and control characters before formula triggers
        assertThat(ActivityService.escapeCsvCell(" \t\n =cmd")).isEqualTo("\"' \t\n =cmd\"");
        assertThat(ActivityService.escapeCsvCell("\u0001=cmd")).isEqualTo("\"'\u0001=cmd\"");
        assertThat(ActivityService.escapeCsvCell("\u001F-cmd")).isEqualTo("\"'\u001F-cmd\"");

        // Ordinary values should not be modified or quoted unnecessarily
        assertThat(ActivityService.escapeCsvCell("Normal title")).isEqualTo("Normal title");
        assertThat(ActivityService.escapeCsvCell("  Normal with spaces  ")).isEqualTo("  Normal with spaces  ");
        assertThat(ActivityService.escapeCsvCell(null)).isEqualTo("");
        assertThat(ActivityService.escapeCsvCell("")).isEqualTo("");
        assertThat(ActivityService.escapeCsvCell("   ")).isEqualTo("   ");

        // Embedded RFC 4180 characters preserved with standard quoting
        assertThat(ActivityService.escapeCsvCell("hello, world")).isEqualTo("\"hello, world\"");
        assertThat(ActivityService.escapeCsvCell("hello \"world\"")).isEqualTo("\"hello \"\"world\"\"\"");
        assertThat(ActivityService.escapeCsvCell("hello\nworld")).isEqualTo("\"hello\nworld\"");
        assertThat(ActivityService.escapeCsvCell("hello\r\nworld")).isEqualTo("\"hello\r\nworld\"");
    }

    @Test
    void jsonExport_correctlySerialized() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = createSampleWorkspace(owner);
        MockHttpSession ownerSession = login(owner.email());

        activities.save(WorkspaceActivity.create(
                ws.id(),
                owner.id(),
                "project.created",
                "Created project Alpha",
                null,
                null,
                "{\"name\":\"Alpha\"}"
        ));

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities/export/json", ws.id())
                        .session(ownerSession))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"workspace-" + ws.id() + "-activity.json\""))
                .andExpect(jsonPath("$[0].type").value("project.created"))
                .andExpect(jsonPath("$[0].actorName").value("Owner"))
                .andExpect(jsonPath("$[0].description").value("Created project Alpha"))
                .andExpect(jsonPath("$[0].payload").value("{\"name\":\"Alpha\"}"));
    }

    @Test
    void deletedEntityAndActorHandling() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Workspace ws = createSampleWorkspace(owner);
        MockHttpSession ownerSession = login(owner.email());

        // Activity with null actor_id (or deleted user)
        activities.save(WorkspaceActivity.create(
                ws.id(),
                null,
                "system.event",
                "Automated system maintenance",
                null,
                null,
                null
        ));

        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/activities", ws.id())
                        .session(ownerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].actorName").value("System"));
    }
}
