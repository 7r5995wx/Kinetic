import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkspaceActivityPage from "../[workspaceId]/activity/page";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { workspaceApi, activityApi, authApi, ApiError } from "@/lib/api/client";
import { ActivityView, WorkspaceView } from "@/types/api";

vi.mock("@/lib/api/client", () => {
  class MockApiError extends Error {
    status: number;
    code: string;
    constructor(error: { status: number; code: string; message: string; timestamp?: string }) {
      super(error.message);
      this.status = error.status;
      this.code = error.code;
    }
  }

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
      addMember: vi.fn(),
      changeMemberRole: vi.fn(),
      removeMember: vi.fn(),
    },
    activityApi: {
      list: vi.fn(),
      exportCsv: vi.fn(),
      exportJson: vi.fn(),
    },
    clearCsrfTokenCache: vi.fn(),
    ApiError: MockApiError,
  };
});

describe("Workspace Activity Feed Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWorkspace: WorkspaceView = {
    id: "ws-1",
    name: "Engineering Core",
    createdBy: "u-1",
    createdAt: "2026-10-16T09:00:00Z",
  };

  const mockActivities: ActivityView[] = [
    {
      id: "act-1",
      workspaceId: "ws-1",
      actorId: "u-1",
      actorName: "Ada Lovelace",
      type: "task.created",
      description: 'Created task "Build Activity Feed"',
      projectId: "proj-1",
      taskId: "task-100",
      payload: '{"title":"Build Activity Feed","priority":"HIGH"}',
      createdAt: "2026-10-18T10:00:00Z",
    },
    {
      id: "act-2",
      workspaceId: "ws-1",
      actorId: "u-2",
      actorName: "Grace Hopper",
      type: "task.moved",
      description: 'Moved task "Build Activity Feed" to Done',
      projectId: "proj-1",
      taskId: "task-100",
      payload: '{"title":"Build Activity Feed"}',
      createdAt: "2026-10-18T10:30:00Z",
    },
  ];

  it("renders activity feed with events, actors, timestamps, and descriptions", async () => {
    vi.mocked(workspaceApi.get).mockResolvedValueOnce(mockWorkspace);
    vi.mocked(activityApi.list).mockResolvedValueOnce({
      items: mockActivities,
      page: 0,
      size: 20,
      totalElements: 2,
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <WorkspaceActivityPage params={{ workspaceId: "ws-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Activity Stream" })).toBeInTheDocument();
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
      expect(screen.getByText('Created task "Build Activity Feed"')).toBeInTheDocument();
      expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
      expect(screen.getByText('Moved task "Build Activity Feed" to Done')).toBeInTheDocument();
      expect(screen.getByText("task.created")).toBeInTheDocument();
      expect(screen.getByText("task.moved")).toBeInTheDocument();
    });
  });

  it("renders empty state when no activities exist", async () => {
    vi.mocked(workspaceApi.get).mockResolvedValueOnce(mockWorkspace);
    vi.mocked(activityApi.list).mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 20,
      totalElements: 0,
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <WorkspaceActivityPage params={{ workspaceId: "ws-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("No activity recorded yet")).toBeInTheDocument();
    });
  });

  it("renders error state with retry button on API failure", async () => {
    vi.mocked(workspaceApi.get).mockResolvedValueOnce(mockWorkspace);
    vi.mocked(activityApi.list).mockRejectedValueOnce(
      new ApiError({
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve activity log",
        timestamp: "2026-10-18T10:00:00Z",
      })
    );

    render(
      <AuthProvider>
        <ToastProvider>
          <WorkspaceActivityPage params={{ workspaceId: "ws-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to retrieve activity log")
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it("handles pagination between pages", async () => {
    vi.mocked(workspaceApi.get).mockResolvedValue(mockWorkspace);
    vi.mocked(activityApi.list)
      .mockResolvedValueOnce({
        items: [mockActivities[0]],
        page: 0,
        size: 20,
        totalElements: 25,
      })
      .mockResolvedValueOnce({
        items: [mockActivities[1]],
        page: 1,
        size: 20,
        totalElements: 25,
      });

    render(
      <AuthProvider>
        <ToastProvider>
          <WorkspaceActivityPage params={{ workspaceId: "ws-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Showing page 1 of 2 (25 events)")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: /Next/i });
    expect(nextButton).not.toBeDisabled();
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(activityApi.list).toHaveBeenCalledWith("ws-1", 1, 20);
      expect(screen.getByText("Showing page 2 of 2 (25 events)")).toBeInTheDocument();
    });
  });

  it("triggers CSV export download", async () => {
    vi.mocked(workspaceApi.get).mockResolvedValueOnce(mockWorkspace);
    vi.mocked(activityApi.list).mockResolvedValueOnce({
      items: mockActivities,
      page: 0,
      size: 20,
      totalElements: 2,
    });
    vi.mocked(activityApi.exportCsv).mockResolvedValueOnce(
      "id,timestamp,type,actor_name,description\nact-1,2026-10-18T10:00:00Z,task.created,Ada Lovelace,Created task"
    );

    render(
      <AuthProvider>
        <ToastProvider>
          <WorkspaceActivityPage params={{ workspaceId: "ws-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();
    });

    const exportCsvBtn = screen.getByRole("button", { name: /Export CSV/i });
    fireEvent.click(exportCsvBtn);

    await waitFor(() => {
      expect(activityApi.exportCsv).toHaveBeenCalledWith("ws-1");
    });
  });

  it("triggers JSON export download", async () => {
    vi.mocked(workspaceApi.get).mockResolvedValueOnce(mockWorkspace);
    vi.mocked(activityApi.list).mockResolvedValueOnce({
      items: mockActivities,
      page: 0,
      size: 20,
      totalElements: 2,
    });
    vi.mocked(activityApi.exportJson).mockResolvedValueOnce(mockActivities);

    render(
      <AuthProvider>
        <ToastProvider>
          <WorkspaceActivityPage params={{ workspaceId: "ws-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Export JSON/i })).toBeInTheDocument();
    });

    const exportJsonBtn = screen.getByRole("button", { name: /Export JSON/i });
    fireEvent.click(exportJsonBtn);

    await waitFor(() => {
      expect(activityApi.exportJson).toHaveBeenCalledWith("ws-1");
    });
  });
});
