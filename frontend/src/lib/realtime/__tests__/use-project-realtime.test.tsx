import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectRealtime } from "../use-project-realtime";
import { getStompClient, StompFrame } from "../stomp-client";
import { RealtimeEvent } from "@/types/api";

vi.mock("../stomp-client", () => {
  let statusListener: ((status: string) => void) | null = null;
  let reconnectListener: (() => void) | null = null;
  let subscribeCallback: ((frame: StompFrame) => void) | null = null;
  let subscribedDestination = "";

  const mockClient = {
    connect: vi.fn(),
    getStatus: vi.fn(() => "connected"),
    onStatusChange: vi.fn((listener) => {
      statusListener = listener;
      listener("connected");
      return () => {
        statusListener = null;
      };
    }),
    onReconnect: vi.fn((listener) => {
      reconnectListener = listener;
      return () => {
        reconnectListener = null;
      };
    }),
    subscribe: vi.fn((dest, cb) => {
      subscribedDestination = dest;
      subscribeCallback = cb;
      return {
        id: "sub-1",
        destination: dest,
        unsubscribe: vi.fn(() => {
          subscribedDestination = "";
          subscribeCallback = null;
        }),
      };
    }),
    simulateMessage: (event: RealtimeEvent) => {
      if (subscribeCallback) {
        subscribeCallback({
          command: "MESSAGE",
          headers: { destination: subscribedDestination, subscription: "sub-1" },
          body: JSON.stringify(event),
        });
      }
    },
    simulateReconnect: () => {
      if (reconnectListener) {
        reconnectListener();
      }
    },
    simulateStatus: (status: string) => {
      if (statusListener) {
        statusListener(status);
      }
    },
  };

  return {
    getStompClient: () => mockClient,
  };
});

describe("useProjectRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to project topic and provides connection status", () => {
    const onTaskEvent = vi.fn();
    const { result, unmount } = renderHook(() =>
      useProjectRealtime({
        projectId: "proj-123",
        onTaskEvent,
      })
    );

    const client = getStompClient() as any;
    expect(client.connect).toHaveBeenCalled();
    expect(client.subscribe).toHaveBeenCalledWith(
      "/topic/projects/proj-123",
      expect.any(Function)
    );
    expect(result.current.isConnected).toBe(true);
    expect(result.current.status).toBe("connected");

    unmount();
  });

  it("deduplicates events with identical eventId", () => {
    const onTaskEvent = vi.fn();
    renderHook(() =>
      useProjectRealtime({
        projectId: "proj-123",
        onTaskEvent,
      })
    );

    const client = getStompClient() as any;
    const event: RealtimeEvent = {
      eventId: "evt-dup-1",
      type: "task.created",
      workspaceId: "ws-1",
      projectId: "proj-123",
      resourceId: "task-1",
      version: 1,
      occurredAt: "2026-10-16T10:00:00Z",
    };

    act(() => {
      client.simulateMessage(event);
      client.simulateMessage(event); // Duplicate
    });

    expect(onTaskEvent).toHaveBeenCalledTimes(1);
    expect(onTaskEvent).toHaveBeenCalledWith(event);
  });

  it("triggers onReconnect callback when client reconnects", () => {
    const onReconnect = vi.fn();
    renderHook(() =>
      useProjectRealtime({
        projectId: "proj-123",
        onReconnect,
      })
    );

    const client = getStompClient() as any;
    act(() => {
      client.simulateReconnect();
    });

    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});
