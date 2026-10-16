package com.kinetic.realtime.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class RealtimeEventListener {

    private static final Logger log = LoggerFactory.getLogger(RealtimeEventListener.class);

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeEventListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRealtimeEvent(RealtimeEvent event) {
        log.debug("Broadcasting realtime event: type={}, resourceId={}, version={}",
                event.type(), event.resourceId(), event.version());
        messagingTemplate.convertAndSend("/topic/projects/" + event.projectId(), event);
        messagingTemplate.convertAndSend("/topic/workspaces/" + event.workspaceId(), event);
    }
}
