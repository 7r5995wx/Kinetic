package com.kinetic.realtime.event;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class RealtimeEventPublisher {

    private final ApplicationEventPublisher publisher;

    public RealtimeEventPublisher(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    public void publish(RealtimeEvent event) {
        publisher.publishEvent(event);
    }
}
