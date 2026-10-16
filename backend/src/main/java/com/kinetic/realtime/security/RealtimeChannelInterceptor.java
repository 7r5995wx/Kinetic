package com.kinetic.realtime.security;

import com.kinetic.identity.security.KineticUserPrincipal;
import com.kinetic.project.domain.Project;
import com.kinetic.project.repository.ProjectRepository;
import com.kinetic.workspace.security.WorkspaceRole;
import com.kinetic.workspace.service.WorkspaceAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class RealtimeChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RealtimeChannelInterceptor.class);

    private static final Pattern PROJECT_DESTINATION =
            Pattern.compile("^/topic/projects/([0-9a-fA-F\\-]{36})$");
    private static final Pattern WORKSPACE_DESTINATION =
            Pattern.compile("^/topic/workspaces/([0-9a-fA-F\\-]{36})$");

    private final WorkspaceAccess workspaceAccess;
    private final ProjectRepository projectRepository;
    private final WebSocketTicketService ticketService;

    public RealtimeChannelInterceptor(
            WorkspaceAccess workspaceAccess,
            ProjectRepository projectRepository,
            WebSocketTicketService ticketService
    ) {
        this.workspaceAccess = workspaceAccess;
        this.projectRepository = projectRepository;
        this.ticketService = ticketService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            Authentication ticketAuth = validateConnection(accessor);
            if (ticketAuth != null) {
                if (accessor.isMutable()) {
                    accessor.setUser(ticketAuth);
                    return message;
                } else {
                    StompHeaderAccessor mutableAccessor = StompHeaderAccessor.create(command);
                    for (var entry : accessor.toMap().entrySet()) {
                        mutableAccessor.setHeader(entry.getKey(), entry.getValue());
                    }
                    mutableAccessor.setUser(ticketAuth);
                    return MessageBuilder.createMessage(message.getPayload(), mutableAccessor.getMessageHeaders());
                }
            }
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            authorizeSubscription(accessor);
        } else if (StompCommand.SEND.equals(command)) {
            preventClientBroadcast(accessor);
        }

        return message;
    }

    private Authentication validateConnection(StompHeaderAccessor accessor) {
        String ticket = accessor.getFirstNativeHeader("ticket");
        if (ticket == null || ticket.isBlank()) {
            ticket = accessor.getFirstNativeHeader("X-WS-Ticket");
        }
        if (ticket == null || ticket.isBlank()) {
            ticket = accessor.getPasscode();
        }

        if (ticket != null && !ticket.isBlank()) {
            var optTicket = ticketService.redeemTicket(ticket.trim());
            if (optTicket.isEmpty()) {
                log.warn("Rejected STOMP CONNECT: invalid, expired, or replayed ticket");
                throw new AuthenticationCredentialsNotFoundException("Invalid or expired WebSocket ticket");
            }
            var wsTicket = optTicket.get();
            KineticUserPrincipal principal = new KineticUserPrincipal(wsTicket.userId(), wsTicket.email(), "");
            var auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            log.debug("Authenticated STOMP connection via ticket: user={}", wsTicket.userId());
            return auth;
        }

        Principal principal = accessor.getUser();
        if (principal == null) {
            log.warn("Rejected STOMP CONNECT: unauthenticated (no ticket or principal)");
            throw new AuthenticationCredentialsNotFoundException("Authentication required for WebSocket connection");
        }
        extractUserId(principal);
        return null;
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null) {
            log.warn("Rejected STOMP SUBSCRIBE: unauthenticated");
            throw new AuthenticationCredentialsNotFoundException("Authentication required to subscribe");
        }

        UUID userId = extractUserId(principal);
        String destination = accessor.getDestination();
        if (destination == null) {
            throw new AccessDeniedException("Destination required for subscription");
        }

        Matcher projectMatcher = PROJECT_DESTINATION.matcher(destination);
        if (projectMatcher.matches()) {
            UUID projectId = UUID.fromString(projectMatcher.group(1));
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new AccessDeniedException("Project not found: " + projectId));
            workspaceAccess.require(project.workspaceId(), userId,
                    WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);
            log.debug("Authorized subscription to project topic: user={}, project={}", userId, projectId);
            return;
        }

        Matcher workspaceMatcher = WORKSPACE_DESTINATION.matcher(destination);
        if (workspaceMatcher.matches()) {
            UUID workspaceId = UUID.fromString(workspaceMatcher.group(1));
            workspaceAccess.require(workspaceId, userId,
                    WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER);
            log.debug("Authorized subscription to workspace topic: user={}, workspace={}", userId, workspaceId);
            return;
        }

        log.warn("Rejected STOMP SUBSCRIBE: unauthorized destination {}", destination);
        throw new AccessDeniedException("Unauthorized subscription destination: " + destination);
    }

    private void preventClientBroadcast(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination != null && destination.startsWith("/topic/")) {
            log.warn("Rejected STOMP SEND: client attempted direct broadcast to {}", destination);
            throw new AccessDeniedException("Direct client publishing to broadcast topics is forbidden");
        }
    }

    public static UUID extractUserId(Principal principal) {
        if (principal instanceof Authentication auth) {
            if (auth.getPrincipal() instanceof KineticUserPrincipal userPrincipal) {
                return userPrincipal.userId();
            }
        }
        throw new AccessDeniedException("Valid authenticated user principal required");
    }
}
