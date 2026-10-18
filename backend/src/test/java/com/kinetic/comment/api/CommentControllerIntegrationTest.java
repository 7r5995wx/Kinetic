package com.kinetic.comment.api;

import com.jayway.jsonpath.JsonPath;
import com.kinetic.comment.domain.Comment;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommentControllerIntegrationTest {

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
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    @AfterEach
    void cleanup() {
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

    private Task createSampleTask(UserAccount creator) {
        Workspace ws = workspaces.save(Workspace.create("Workspace A", creator.id()));
        memberships.save(WorkspaceMembership.create(ws.id(), creator.id(), WorkspaceRole.OWNER));
        Project project = projects.save(Project.create(ws.id(), "Project A", "Desc", creator.id()));
        KanbanColumn column = columns.save(KanbanColumn.create(project.id(), "To Do", 0));
        return tasks.save(Task.create(project.id(), column.id(), "Task A", "Desc", TaskPriority.MEDIUM, null, null, 0, creator.id()));
    }

    @Test
    void unauthenticatedAccess_rejectedWith401() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Task task = createSampleTask(owner);

        mockMvc.perform(get("/api/v1/tasks/{taskId}/comments", task.id()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/tasks/{taskId}/comments", task.id())
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hello\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void workspaceIsolation_nonMemberGets404() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Task task = createSampleTask(owner);

        UserAccount outsider = createUser("outsider@example.com", "Outsider");
        MockHttpSession outsiderSession = login(outsider.email());

        mockMvc.perform(get("/api/v1/tasks/{taskId}/comments", task.id())
                        .session(outsiderSession))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/tasks/{taskId}/comments", task.id())
                        .session(outsiderSession)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Intrusion attempt\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createComment_successAndValidation() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Task task = createSampleTask(owner);
        MockHttpSession ownerSession = login(owner.email());

        // Blank content failure
        mockMvc.perform(post("/api/v1/tasks/{taskId}/comments", task.id())
                        .session(ownerSession)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"   \"}"))
                .andExpect(status().isUnprocessableEntity());

        // Success
        mockMvc.perform(post("/api/v1/tasks/{taskId}/comments", task.id())
                        .session(ownerSession)
                        .with(csrf().asHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"First comment with **markdown**\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.taskId").value(task.id().toString()))
                .andExpect(jsonPath("$.content").value("First comment with **markdown**"))
                .andExpect(jsonPath("$.authorId").value(owner.id().toString()))
                .andExpect(jsonPath("$.authorName").value("Owner"))
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    void listComments_returnsDeterministicChronologicalOrder() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Task task = createSampleTask(owner);

        UserAccount member = createUser("member@example.com", "Member");
        Project project = projects.findById(task.projectId()).orElseThrow();
        memberships.save(WorkspaceMembership.create(project.workspaceId(), member.id(), WorkspaceRole.MEMBER));

        comments.save(Comment.create(task.id(), owner.id(), "Comment 1"));
        comments.save(Comment.create(task.id(), member.id(), "Comment 2"));
        comments.save(Comment.create(task.id(), owner.id(), "Comment 3"));

        MockHttpSession memberSession = login(member.email());

        mockMvc.perform(get("/api/v1/tasks/{taskId}/comments", task.id())
                        .session(memberSession)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.items[0].content").value("Comment 1"))
                .andExpect(jsonPath("$.items[0].authorName").value("Owner"))
                .andExpect(jsonPath("$.items[1].content").value("Comment 2"))
                .andExpect(jsonPath("$.items[1].authorName").value("Member"))
                .andExpect(jsonPath("$.items[2].content").value("Comment 3"));
    }

    @Test
    void listComments_identicalTimestamps_deterministicByIdAsc() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Task task = createSampleTask(owner);
        MockHttpSession ownerSession = login(owner.email());

        java.time.Instant fixedTimestamp = java.time.Instant.parse("2026-10-17T12:00:00Z");
        UUID idA = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID idB = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID idC = UUID.fromString("00000000-0000-0000-0000-000000000003");

        // Insert in reverse order (idC, then idA, then idB)
        comments.save(Comment.create(idC, task.id(), owner.id(), "Comment C", fixedTimestamp));
        comments.save(Comment.create(idA, task.id(), owner.id(), "Comment A", fixedTimestamp));
        comments.save(Comment.create(idB, task.id(), owner.id(), "Comment B", fixedTimestamp));

        mockMvc.perform(get("/api/v1/tasks/{taskId}/comments", task.id())
                        .session(ownerSession)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.items[0].id").value(idA.toString()))
                .andExpect(jsonPath("$.items[0].content").value("Comment A"))
                .andExpect(jsonPath("$.items[1].id").value(idB.toString()))
                .andExpect(jsonPath("$.items[1].content").value("Comment B"))
                .andExpect(jsonPath("$.items[2].id").value(idC.toString()))
                .andExpect(jsonPath("$.items[2].content").value("Comment C"));
    }

    @Test
    void deleteComment_permissionsEnforcedServerSide() throws Exception {
        UserAccount owner = createUser("owner@example.com", "Owner");
        Task task = createSampleTask(owner);
        Project project = projects.findById(task.projectId()).orElseThrow();

        UserAccount admin = createUser("admin@example.com", "Admin");
        memberships.save(WorkspaceMembership.create(project.workspaceId(), admin.id(), WorkspaceRole.ADMIN));

        UserAccount memberA = createUser("memberA@example.com", "Member A");
        memberships.save(WorkspaceMembership.create(project.workspaceId(), memberA.id(), WorkspaceRole.MEMBER));

        UserAccount memberB = createUser("memberB@example.com", "Member B");
        memberships.save(WorkspaceMembership.create(project.workspaceId(), memberB.id(), WorkspaceRole.MEMBER));

        Comment comment = comments.save(Comment.create(task.id(), memberA.id(), "Comment by A"));

        MockHttpSession sessionB = login(memberB.email());
        MockHttpSession sessionA = login(memberA.email());
        MockHttpSession sessionAdmin = login(admin.email());
        MockHttpSession sessionOwner = login(owner.email());

        // 1. Member B (unauthorized) tries to delete Member A's comment -> 403 Forbidden
        mockMvc.perform(delete("/api/v1/comments/{id}", comment.id())
                        .session(sessionB)
                        .with(csrf().asHeader()))
                .andExpect(status().isForbidden());

        assertThat(comments.existsById(comment.id())).isTrue();

        // 2. Member A (author) deletes own comment -> 204 No Content
        mockMvc.perform(delete("/api/v1/comments/{id}", comment.id())
                        .session(sessionA)
                        .with(csrf().asHeader()))
                .andExpect(status().isNoContent());

        assertThat(comments.existsById(comment.id())).isFalse();

        // 3. Admin deletes member's comment -> 204 No Content
        Comment comment2 = comments.save(Comment.create(task.id(), memberA.id(), "Comment 2 by A"));
        mockMvc.perform(delete("/api/v1/comments/{id}", comment2.id())
                        .session(sessionAdmin)
                        .with(csrf().asHeader()))
                .andExpect(status().isNoContent());

        // 4. Owner deletes member's comment -> 204 No Content
        Comment comment3 = comments.save(Comment.create(task.id(), memberA.id(), "Comment 3 by A"));
        mockMvc.perform(delete("/api/v1/comments/{id}", comment3.id())
                        .session(sessionOwner)
                        .with(csrf().asHeader()))
                .andExpect(status().isNoContent());
    }
}
