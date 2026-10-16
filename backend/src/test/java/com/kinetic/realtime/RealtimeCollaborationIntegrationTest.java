package com.kinetic.realtime;

import com.kinetic.foundation.error.ConflictException;
import com.kinetic.foundation.error.NotFoundException;
import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.identity.security.KineticUserPrincipal;
import com.kinetic.project.api.ProjectDtos;
import com.kinetic.project.domain.KanbanColumn;
import com.kinetic.project.domain.Project;
import com.kinetic.project.repository.KanbanColumnRepository;
import com.kinetic.project.repository.ProjectRepository;
import com.kinetic.project.service.ProjectService;
import com.kinetic.realtime.event.RealtimeEvent;
import com.kinetic.realtime.security.RealtimeChannelInterceptor;
import com.kinetic.realtime.security.WebSocketTicket;
import com.kinetic.realtime.security.WebSocketTicketService;
import com.kinetic.task.api.TaskDtos;
import com.kinetic.task.domain.Task;
import com.kinetic.task.domain.TaskPriority;
import com.kinetic.task.repository.TaskRepository;
import java.time.Duration;
import com.kinetic.task.service.TaskService;
import com.kinetic.workspace.api.WorkspaceDtos;
import com.kinetic.workspace.domain.Workspace;
import com.kinetic.workspace.repository.WorkspaceMembershipRepository;
import com.kinetic.workspace.repository.WorkspaceRepository;
import com.kinetic.workspace.security.WorkspaceRole;
import com.kinetic.workspace.service.WorkspaceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.AbstractSubscribableChannel;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class RealtimeCollaborationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RealtimeChannelInterceptor channelInterceptor;

    @Autowired
    private WebSocketTicketService ticketService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private ProjectService projectService;

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
    @Qualifier("brokerChannel")
    private MessageChannel brokerChannel;

    private final List<Message<?>> publishedMessages = new CopyOnWriteArrayList<>();

    private UserAccount owner;
    private UserAccount member;
    private UserAccount outsider;
    private Workspace workspaceA;
    private Project projectA;
    private KanbanColumn columnA;

    @BeforeEach
    void setUp() {
        publishedMessages.clear();
        if (brokerChannel instanceof AbstractSubscribableChannel subChannel) {
            subChannel.addInterceptor(new ChannelInterceptor() {
                @Override
                public Message<?> preSend(Message<?> message, MessageChannel channel) {
                    publishedMessages.add(message);
                    return message;
                }
            });
        }

        owner = users.save(UserAccount.register("owner@example.com", "owner@example.com", "Owner User", "hash"));
        member = users.save(UserAccount.register("member@example.com", "member@example.com", "Member User", "hash"));
        outsider = users.save(UserAccount.register("outsider@example.com", "outsider@example.com", "Outsider User", "hash"));

        authenticate(owner);
        workspaceA = workspaceService.create(new WorkspaceDtos.Create("Alpha Workspace"));
        projectA = projectService.create(workspaceA.id(), new ProjectDtos.Create("Project Alpha", "Description"));
        columnA = columns.findAllByProjectIdOrderByPositionAsc(projectA.id()).getFirst();

        workspaceService.addOrChange(workspaceA.id(), new WorkspaceDtos.MemberChange(member.id(), member.email(), WorkspaceRole.MEMBER));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        tasks.deleteAll();
        columns.deleteAll();
        projects.deleteAll();
        memberships.deleteAll();
        workspaces.deleteAll();
        users.deleteAll();
        publishedMessages.clear();
    }

    private void authenticate(UserAccount user) {
        KineticUserPrincipal principal = new KineticUserPrincipal(user.id(), user.email(), user.passwordHash());
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(token);
    }

    private Message<?> createStompMessage(StompCommand command, String destination, UserAccount user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setLeaveMutable(true);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (user != null) {
            KineticUserPrincipal principal = new KineticUserPrincipal(user.id(), user.email(), user.passwordHash());
            accessor.setUser(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private Message<?> createStompMessageWithTicket(StompCommand command, String destination, String ticket) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setLeaveMutable(true);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (ticket != null) {
            accessor.setNativeHeader("ticket", ticket);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void handshakeEndpointPermitsCrossOriginUpgradeAndEnforcesStompAuthentication() throws Exception {
        int status = mockMvc.perform(get("/ws")).andReturn().getResponse().getStatus();
        assertThat(status).isNotEqualTo(401);

        Message<?> connectMessage = createStompMessage(StompCommand.CONNECT, null, null);
        assertThatThrownBy(() -> channelInterceptor.preSend(connectMessage, null))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class)
                .hasMessageContaining("Authentication required");
    }

    @Test
    void connectWithValidTicketEstablishesPrincipalAndSucceeds() {
        WebSocketTicket ticket = ticketService.createTicket(member.id(), member.email());
        Message<?> connectMessage = createStompMessageWithTicket(StompCommand.CONNECT, null, ticket.ticket());

        Message<?> result = channelInterceptor.preSend(connectMessage, null);
        assertThat(result).isNotNull();

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertThat(accessor.getUser()).isNotNull();
        assertThat(RealtimeChannelInterceptor.extractUserId(accessor.getUser())).isEqualTo(member.id());
    }

    @Test
    void connectWithReplayedTicketIsDenied() {
        WebSocketTicket ticket = ticketService.createTicket(member.id(), member.email());
        Message<?> connectMessage1 = createStompMessageWithTicket(StompCommand.CONNECT, null, ticket.ticket());
        assertThatCode(() -> channelInterceptor.preSend(connectMessage1, null)).doesNotThrowAnyException();

        Message<?> connectMessage2 = createStompMessageWithTicket(StompCommand.CONNECT, null, ticket.ticket());
        assertThatThrownBy(() -> channelInterceptor.preSend(connectMessage2, null))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class)
                .hasMessageContaining("Invalid or expired WebSocket ticket");
    }

    @Test
    void connectWithExpiredTicketIsDenied() {
        WebSocketTicket ticket = ticketService.createTicket(member.id(), member.email(), Duration.ZERO);
        Message<?> connectMessage = createStompMessageWithTicket(StompCommand.CONNECT, null, ticket.ticket());

        assertThatThrownBy(() -> channelInterceptor.preSend(connectMessage, null))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class)
                .hasMessageContaining("Invalid or expired WebSocket ticket");
    }

    @Test
    void connectWithInvalidTicketIsDenied() {
        Message<?> connectMessage = createStompMessageWithTicket(StompCommand.CONNECT, null, "invalid-random-token-xyz");

        assertThatThrownBy(() -> channelInterceptor.preSend(connectMessage, null))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class)
                .hasMessageContaining("Invalid or expired WebSocket ticket");
    }

    @Test
    void ticketAuthenticatedClientCanSubscribeToAuthorizedProjectTopic() {
        WebSocketTicket ticket = ticketService.createTicket(member.id(), member.email());
        Message<?> connectMessage = createStompMessageWithTicket(StompCommand.CONNECT, null, ticket.ticket());
        Message<?> connected = channelInterceptor.preSend(connectMessage, null);

        StompHeaderAccessor connectedAccessor = StompHeaderAccessor.wrap(connected);

        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setDestination("/topic/projects/" + projectA.id());
        subAccessor.setUser(connectedAccessor.getUser());
        Message<?> subMessage = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        assertThatCode(() -> channelInterceptor.preSend(subMessage, null))
                .doesNotThrowAnyException();
    }

    @Test
    void ticketAuthenticatedClientCannotSubscribeToUnauthorizedProjectTopic() {
        WebSocketTicket ticket = ticketService.createTicket(outsider.id(), outsider.email());
        Message<?> connectMessage = createStompMessageWithTicket(StompCommand.CONNECT, null, ticket.ticket());
        Message<?> connected = channelInterceptor.preSend(connectMessage, null);

        StompHeaderAccessor connectedAccessor = StompHeaderAccessor.wrap(connected);

        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setDestination("/topic/projects/" + projectA.id());
        subAccessor.setUser(connectedAccessor.getUser());
        Message<?> subMessage = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        assertThatThrownBy(() -> channelInterceptor.preSend(subMessage, null))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void authenticatedHandshakePassesSecurityFilter() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {"displayName":"Handshake User","email":"handshake@example.com","password":"Password123456"}
                                """))
                .andExpect(status().isCreated());

        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {"email":"handshake@example.com","password":"Password123456"}
                                """))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);
        assertThat(session).isNotNull();

        int status = mockMvc.perform(get("/ws").session(session))
                .andReturn().getResponse().getStatus();
        assertThat(status).isNotEqualTo(401);
    }

    @Test
    void connectWithValidPrincipalSucceeds() {
        Message<?> connectMessage = createStompMessage(StompCommand.CONNECT, null, owner);
        assertThatCode(() -> channelInterceptor.preSend(connectMessage, null))
                .doesNotThrowAnyException();
    }

    @Test
    void connectWithoutPrincipalThrowsAuthenticationRequired() {
        Message<?> connectMessage = createStompMessage(StompCommand.CONNECT, null, null);
        assertThatThrownBy(() -> channelInterceptor.preSend(connectMessage, null))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class)
                .hasMessageContaining("Authentication required");
    }

    @Test
    void authorizedMemberCanSubscribeToProjectTopic() {
        Message<?> subscribeMessage = createStompMessage(
                StompCommand.SUBSCRIBE,
                "/topic/projects/" + projectA.id(),
                member
        );
        assertThatCode(() -> channelInterceptor.preSend(subscribeMessage, null))
                .doesNotThrowAnyException();
    }

    @Test
    void authorizedOwnerCanSubscribeToWorkspaceTopic() {
        Message<?> subscribeMessage = createStompMessage(
                StompCommand.SUBSCRIBE,
                "/topic/workspaces/" + workspaceA.id(),
                owner
        );
        assertThatCode(() -> channelInterceptor.preSend(subscribeMessage, null))
                .doesNotThrowAnyException();
    }

    @Test
    void nonMemberCannotSubscribeToProjectTopic() {
        Message<?> subscribeMessage = createStompMessage(
                StompCommand.SUBSCRIBE,
                "/topic/projects/" + projectA.id(),
                outsider
        );
        assertThatThrownBy(() -> channelInterceptor.preSend(subscribeMessage, null))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void nonMemberCannotSubscribeToWorkspaceTopic() {
        Message<?> subscribeMessage = createStompMessage(
                StompCommand.SUBSCRIBE,
                "/topic/workspaces/" + workspaceA.id(),
                outsider
        );
        assertThatThrownBy(() -> channelInterceptor.preSend(subscribeMessage, null))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void directClientSendToTopicIsDenied() {
        Message<?> sendMessage = createStompMessage(
                StompCommand.SEND,
                "/topic/projects/" + projectA.id(),
                owner
        );
        assertThatThrownBy(() -> channelInterceptor.preSend(sendMessage, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Direct client publishing");
    }

    @Test
    void taskCrudPublishesRealtimeEventsToProjectAndWorkspaceTopics() {
        authenticate(owner);
        publishedMessages.clear();

        // 1. Task Create
        Task created = taskService.create(projectA.id(), new TaskDtos.Create(
                "Task 1",
                "Desc",
                columnA.id(),
                TaskPriority.HIGH,
                null,
                LocalDate.now()
        ));
        assertThat(created).isNotNull();

        // Verify broadcast messages sent to brokerChannel
        assertThat(publishedMessages).anyMatch(m ->
                ("/topic/projects/" + projectA.id()).equals(m.getHeaders().get("simpDestination")));
        assertThat(publishedMessages).anyMatch(m ->
                ("/topic/workspaces/" + workspaceA.id()).equals(m.getHeaders().get("simpDestination")));

        // 2. Task Update
        publishedMessages.clear();
        Task updated = taskService.update(created.id(), new TaskDtos.Update(
                "Task 1 Updated",
                "New Desc",
                TaskPriority.URGENT,
                null,
                LocalDate.now(),
                created.version()
        ));
        assertThat(updated.version()).isGreaterThan(created.version());
        assertThat(publishedMessages).anyMatch(m ->
                ("/topic/projects/" + projectA.id()).equals(m.getHeaders().get("simpDestination")));

        // 3. Task Move
        publishedMessages.clear();
        Task moved = taskService.move(updated.id(), new TaskDtos.Move(
                columnA.id(),
                0,
                updated.version()
        ));
        assertThat(moved.version()).isGreaterThan(updated.version());
        assertThat(publishedMessages).anyMatch(m ->
                ("/topic/projects/" + projectA.id()).equals(m.getHeaders().get("simpDestination")));

        // 4. Task Delete
        publishedMessages.clear();
        taskService.delete(moved.id(), moved.version());
        assertThat(publishedMessages).anyMatch(m ->
                ("/topic/projects/" + projectA.id()).equals(m.getHeaders().get("simpDestination")));
    }

    @Test
    void failedTransactionDoesNotPublishRealtimeEvents() {
        authenticate(owner);
        publishedMessages.clear();

        UUID nonExistentColumnId = UUID.randomUUID();
        assertThatThrownBy(() -> taskService.create(projectA.id(), new TaskDtos.Create(
                "Failed Task",
                "Desc",
                nonExistentColumnId,
                TaskPriority.HIGH,
                null,
                LocalDate.now()
        ))).isInstanceOf(NotFoundException.class);

        assertThat(publishedMessages).isEmpty();
    }

    @Test
    void conflictExceptionDoesNotPublishRealtimeEvents() {
        authenticate(owner);
        Task created = taskService.create(projectA.id(), new TaskDtos.Create(
                "Task Valid",
                "Desc",
                columnA.id(),
                TaskPriority.HIGH,
                null,
                LocalDate.now()
        ));
        publishedMessages.clear();

        assertThatThrownBy(() -> taskService.update(created.id(), new TaskDtos.Update(
                "Conflicting Update",
                "Desc",
                TaskPriority.LOW,
                null,
                LocalDate.now(),
                999L
        ))).isInstanceOf(ConflictException.class);

        assertThat(publishedMessages).isEmpty();
    }
}
