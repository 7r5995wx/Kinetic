import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import KanbanBoardPage from "../[workspaceId]/projects/[projectId]/board/page";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { projectApi, taskApi, authApi, workspaceApi, ApiError } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => {
  class MockApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
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
    ApiError: MockApiError,
  };
});

describe("KanbanBoardPage Flow", () => {
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
    { id: "col-2", name: "In Progress", position: 1 },
    { id: "col-3", name: "Done", position: 2 },
  ];

  const mockTasks = [
    {
      id: "task-1",
      projectId: "proj-1",
      columnId: "col-1",
      title: "Write documentation",
      description: "Document all endpoints",
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

  it("loads project, columns, and tasks onto the board", async () => {
    vi.mocked(projectApi.get).mockResolvedValueOnce(mockProject);
    vi.mocked(projectApi.columns).mockResolvedValueOnce(mockColumns);
    vi.mocked(taskApi.list).mockResolvedValueOnce({
      items: mockTasks,
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
      expect(screen.getByRole("heading", { name: "Core Development" })).toBeInTheDocument();
      expect(screen.getByText("Backlog")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
      expect(screen.getByText("Write documentation")).toBeInTheDocument();
      expect(screen.getByText("v1")).toBeInTheDocument();
    });
  });

  it("creates a new task through the modal dialog", async () => {
    vi.mocked(projectApi.get).mockResolvedValueOnce(mockProject);
    vi.mocked(projectApi.columns).mockResolvedValueOnce(mockColumns);
    vi.mocked(taskApi.list).mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 100,
      totalElements: 0,
    });
    vi.mocked(taskApi.create).mockResolvedValueOnce({
      id: "task-new",
      projectId: "proj-1",
      columnId: "col-1",
      title: "New Task Title",
      description: "New Task Desc",
      priority: "URGENT",
      assigneeId: null,
      dueDate: null,
      position: 0,
      createdBy: "u-1",
      version: 1,
      createdAt: "2026-10-16T11:00:00Z",
      updatedAt: "2026-10-16T11:00:00Z",
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <KanbanBoardPage params={{ workspaceId: "ws-1", projectId: "proj-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Backlog")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /new task/i }));

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: "New Task Title" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create task$/i }));

    await waitFor(() => {
      expect(taskApi.create).toHaveBeenCalledWith("proj-1", expect.objectContaining({
        title: "New Task Title",
      }));
      expect(screen.getByText("New Task Title")).toBeInTheDocument();
    });
  });

  it("handles optimistic locking conflict (409) during task move", async () => {
    const twoTasks = [
      mockTasks[0],
      {
        id: "task-2",
        projectId: "proj-1",
        columnId: "col-1",
        title: "Second task",
        description: "Another task in same column",
        priority: "LOW" as const,
        assigneeId: null,
        dueDate: null,
        position: 1,
        createdBy: "u-1",
        version: 1,
        createdAt: "2026-10-16T10:00:00Z",
        updatedAt: "2026-10-16T10:00:00Z",
      },
    ];
    vi.mocked(projectApi.get).mockResolvedValue(mockProject);
    vi.mocked(projectApi.columns).mockResolvedValue(mockColumns);
    vi.mocked(taskApi.list).mockResolvedValue({
      items: twoTasks,
      page: 0,
      size: 100,
      totalElements: 2,
    });
    vi.mocked(taskApi.move).mockRejectedValueOnce(
      new (ApiError as any)(
        409,
        "TASK_VERSION_CONFLICT",
        "The task was modified by another request; refresh and retry"
      )
    );

    render(
      <AuthProvider>
        <ToastProvider>
          <KanbanBoardPage params={{ workspaceId: "ws-1", projectId: "proj-1" }} />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Write documentation")).toBeInTheDocument();
      expect(screen.getByText("Second task")).toBeInTheDocument();
    });

    // Move first task down position
    const moveDownBtns = screen.getAllByRole("button", { name: /move task down/i });
    expect(moveDownBtns[0]).not.toBeDisabled();
    fireEvent.click(moveDownBtns[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/Optimistic Lock Conflict \(HTTP 409\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reload latest board/i })
      ).toBeInTheDocument();
    });
  });
});
