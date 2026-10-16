"use client";

import * as React from "react";
import { getStompClient, ConnectionStatus, StompFrame } from "./stomp-client";
import { RealtimeEvent } from "@/types/api";
import { authApi } from "@/lib/api/client";

interface UseProjectRealtimeOptions {
  projectId: string | null | undefined;
  onTaskEvent?: (event: RealtimeEvent) => void;
  onReconnect?: () => void;
  enabled?: boolean;
}

export function useProjectRealtime({
  projectId,
  onTaskEvent,
  onReconnect,
  enabled = true,
}: UseProjectRealtimeOptions) {
  const [status, setStatus] = React.useState<ConnectionStatus>("disconnected");
  const processedEventIdsRef = React.useRef<Set<string>>(new Set());

  // Store callbacks in refs to avoid stale closures in subscriptions
  const onTaskEventRef = React.useRef(onTaskEvent);
  onTaskEventRef.current = onTaskEvent;

  const onReconnectRef = React.useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  React.useEffect(() => {
    if (!enabled || !projectId) {
      return;
    }

    const client = getStompClient({
      ticketProvider: async () => {
        try {
          const res = await authApi.getWsTicket();
          return res.ticket;
        } catch {
          return "";
        }
      },
    });

    // Listen to connection status changes
    const unsubStatus = client.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Listen to reconnects to invoke onReconnect
    const unsubReconnect = client.onReconnect(() => {
      if (onReconnectRef.current) {
        onReconnectRef.current();
      }
    });

    // Ensure connection is initiated
    client.connect();

    // Subscribe to project topic
    const destination = `/topic/projects/${projectId}`;
    const subscription = client.subscribe(destination, (frame: StompFrame) => {
      try {
        if (!frame.body) return;
        const event: RealtimeEvent = JSON.parse(frame.body);

        // Deduplicate events by eventId
        if (event.eventId) {
          if (processedEventIdsRef.current.has(event.eventId)) {
            return;
          }
          processedEventIdsRef.current.add(event.eventId);
          // Keep bounded set size to prevent memory leaks
          if (processedEventIdsRef.current.size > 200) {
            const first = processedEventIdsRef.current.values().next().value;
            if (first) processedEventIdsRef.current.delete(first);
          }
        }

        if (onTaskEventRef.current) {
          onTaskEventRef.current(event);
        }
      } catch (err) {
        console.warn("Could not parse incoming realtime event:", err);
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubStatus();
      unsubReconnect();
    };
  }, [projectId, enabled]);

  return {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
  };
}
