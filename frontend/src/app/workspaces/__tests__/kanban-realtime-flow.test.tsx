import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import KanbanBoardPage from "../[workspaceId]/projects/[projectId]/board/page";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { projectApi, taskApi, authApi, workspaceApi } from "@/lib/api/client";
import { getStompClient, StompFrame } from "@/lib/realtime/stomp-client";
import { RealtimeEvent } from "@/types/api";

vi.mock("@/lib/api/client", () => {
  return {
    authApi: {
      csrf: vi.fn(),
      me: vi.fn().mockResolvedValue({
        id: "u-1",
        displayName: "Ada Lovelace",
        email: "ada@example.com",
        createdAt: "2026-10-16T10:00:00Z",
      }),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    },
    workspaceApi: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      members: vi.fn().mockResolvedValue([]),
    },
    projectApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      columns: vi.fn(),
    },
    taskApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      move: vi.fn(),
      delete: vi.fn(),
    },
    clearCsrfTokenCache: vi.fn(),
  };
});

let messageCallback: ((frame: StompFrame) => void) | null = null;
let statusCallback: ((status: string) => void) | null = null;
let reconnectCallback: (() => void) | null = null;

vi.mock("@/lib/realtime/stomp-client", () => {
  const mockClient = {
    connect: vi.fn(),
    getStatus: vi.fn(() => "connected"),
    onStatusChange: vi.fn((listener) => {
      statusCallback = listener;
      listener("connected");
      return () => {
        statusCallback = null;
      };
    }),
    onReconnect: vi.fn((listener) => {
      reconnectCallback = listener;
      return () => {
        reconnectCallback = null;
      };
    }),
    subscribe: vi.fn((dest, cb) => {
      messageCallback = cb;
      return {
        id: "sub-1",
        destination: dest,
        unsubscribe: vi.fn(() => {
          messageCallback = null;
        }),
      };
    }),
  };

  return {
    getStompClient: () => mockClient,
  };
});

describe("KanbanBoardPage Real-time Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProject = {
    id: "proj-1",
    workspaceId: "ws-1",
    name: "Core Development",
    description: "Main sprint",
    createdAt: "2026-10-16T10:00:00Z",
  };

  const mockColumns = [
    { id: "col-1", name: "Backlog", position: 0 },
    { id: "col-2", name: "Done", position: 1 },
  ];

  const initialTasks = [
    {
      id: "task-1",
      projectId: "proj-1",
      columnId: "col-1",
      title: "Existing Task",
      description: "Existing task desc",
      priority: "HIGH" as const,
      assigneeId: "u-1",
      dueDate: "2026-11-01",
      position: 0,
      createdBy: "u-1",
      version: 1,
      createdAt: "2026-10-16T10:00:00Z",
      updatedAt: "2026-10-16T10:00:00Z",
    },
  ];

  it("renders Live connection badge when connected", async () => {
    vi.mocked(projectApi.get).mockResolvedValue(mockProject);
    vi.mocked(projectApi.columns).mockResolvedValue(mockColumns);
    vi.mocked(taskApi.list).mockResolvedValue({
      items: initialTasks,
      page: 0,
      size: 100,
      totalElements: 1,
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <KanbanBoardPage params={{ workspaceId: "ws-1", projectId: "proj-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByText("Existing Task")).toBeInTheDocument();
    });
  });

  it("adds newly created task on remote task.created event", async () => {
    vi.mocked(projectApi.get).mockResolvedValue(mockProject);
    vi.mocked(projectApi.columns).mockResolvedValue(mockColumns);
    vi.mocked(taskApi.list).mockResolvedValue({
      items: initialTasks,
      page: 0,
      size: 100,
      totalElements: 1,
    });

    const newTask = {
      id: "task-2",
      projectId: "proj-1",
      columnId: "col-1",
      title: "Remote Collab Task",
      description: "Created by teammate",
      priority: "URGENT" as const,
      assigneeId: null,
      dueDate: null,
      position: 1,
      createdBy: "u-2",
      version: 1,
      createdAt: "2026-10-16T10:10:00Z",
      updatedAt: "2026-10-16T10:10:00Z",
    };
    vi.mocked(taskApi.get).mockResolvedValue(newTask);

    render(
      <AuthProvider>
        <ToastProvider>
          <KanbanBoardPage params={{ workspaceId: "ws-1", projectId: "proj-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Existing Task")).toBeInTheDocument();
    });

    // Simulate incoming STOMP message
    const event: RealtimeEvent = {
      eventId: "evt-create-1",
      type: "task.created",
      workspaceId: "ws-1",
      projectId: "proj-1",
      resourceId: "task-2",
      version: 1,
      occurredAt: "2026-10-16T10:10:00Z",
    };

    act(() => {
      if (messageCallback) {
        messageCallback({
          command: "MESSAGE",
          headers: { destination: "/topic/projects/proj-1" },
          body: JSON.stringify(event),
        });
      }
    });

    await waitFor(() => {
      expect(taskApi.get).toHaveBeenCalledWith("task-2");
      expect(screen.getByText("Remote Collab Task")).toBeInTheDocument();
    });
  });

  it("removes task immediately on task.deleted event", async () => {
    vi.mocked(projectApi.get).mockResolvedValue(mockProject);
    vi.mocked(projectApi.columns).mockResolvedValue(mockColumns);
    vi.mocked(taskApi.list).mockResolvedValue({
      items: initialTasks,
      page: 0,
      size: 100,
      totalElements: 1,
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <KanbanBoardPage params={{ workspaceId: "ws-1", projectId: "proj-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Existing Task")).toBeInTheDocument();
    });

    // Simulate task.deleted event
    const event: RealtimeEvent = {
      eventId: "evt-del-1",
      type: "task.deleted",
      workspaceId: "ws-1",
      projectId: "proj-1",
      resourceId: "task-1",
      version: null,
      occurredAt: "2026-10-16T10:15:00Z",
    };

    act(() => {
      if (messageCallback) {
        messageCallback({
          command: "MESSAGE",
          headers: { destination: "/topic/projects/proj-1" },
          body: JSON.stringify(event),
        });
      }
    });

    await waitFor(() => {
      expect(screen.queryByText("Existing Task")).not.toBeInTheDocument();
    });
  });

  it("resynchronizes board state from REST on reconnect", async () => {
    vi.mocked(projectApi.get).mockResolvedValue(mockProject);
    vi.mocked(projectApi.columns).mockResolvedValue(mockColumns);
    vi.mocked(taskApi.list).mockResolvedValue({
      items: initialTasks,
      page: 0,
      size: 100,
      totalElements: 1,
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <KanbanBoardPage params={{ workspaceId: "ws-1", projectId: "proj-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Existing Task")).toBeInTheDocument();
    });

    const callCountBefore = vi.mocked(taskApi.list).mock.calls.length;

    // Simulate reconnect event
    act(() => {
      if (reconnectCallback) {
        reconnectCallback();
      }
    });

    await waitFor(() => {
      expect(vi.mocked(taskApi.list).mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });
});
