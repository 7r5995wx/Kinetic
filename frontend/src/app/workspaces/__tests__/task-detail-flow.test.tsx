import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskDetailPage from "../[workspaceId]/projects/[projectId]/tasks/[taskId]/page";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { taskApi, projectApi, workspaceApi, authApi, ApiError } from "@/lib/api/client";

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

describe("TaskDetailPage Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTask = {
    id: "task-100",
    projectId: "proj-1",
    columnId: "col-1",
    title: "Implement auth flows",
    description: "Connect Next.js to Spring Boot sessions",
    priority: "HIGH" as const,
    assigneeId: null,
    dueDate: "2026-10-31",
    position: 0,
    createdBy: "u-1",
    version: 4,
    createdAt: "2026-10-16T10:00:00Z",
    updatedAt: "2026-10-16T12:00:00Z",
  };

  const mockColumns = [
    { id: "col-1", name: "Backlog", position: 0 },
    { id: "col-2", name: "Done", position: 1 },
  ];

  it("loads and displays task details and optimistic lock version", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(projectApi.columns).mockResolvedValueOnce(mockColumns);
    vi.mocked(workspaceApi.members).mockResolvedValueOnce([]);

    render(
      <AuthProvider>
        <ToastProvider>
          <TaskDetailPage
            params={{
              workspaceId: "ws-1",
              projectId: "proj-1",
              taskId: "task-100",
            }}
          />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Implement auth flows")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Connect Next.js to Spring Boot sessions")
      ).toBeInTheDocument();
      expect(screen.getByText("Version: v4")).toBeInTheDocument();
    });
  });

  it("submits updated title and current version to taskApi.update", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(projectApi.columns).mockResolvedValueOnce(mockColumns);
    vi.mocked(workspaceApi.members).mockResolvedValueOnce([]);
    vi.mocked(taskApi.update).mockResolvedValueOnce({
      ...mockTask,
      title: "Updated Title",
      version: 5,
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <TaskDetailPage
            params={{
              workspaceId: "ws-1",
              projectId: "proj-1",
              taskId: "task-100",
            }}
          />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Implement auth flows")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "Updated Title" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(taskApi.update).toHaveBeenCalledWith("task-100", {
        title: "Updated Title",
        description: "Connect Next.js to Spring Boot sessions",
        priority: "HIGH",
        assigneeId: null,
        dueDate: "2026-10-31",
        version: 4,
      });
      expect(screen.getByText("Version: v5")).toBeInTheDocument();
    });
  });

  it("displays conflict error alert on 409 TASK_VERSION_CONFLICT", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(projectApi.columns).mockResolvedValueOnce(mockColumns);
    vi.mocked(workspaceApi.members).mockResolvedValueOnce([]);
    vi.mocked(taskApi.update).mockRejectedValueOnce(
      new (ApiError as any)(
        409,
        "TASK_VERSION_CONFLICT",
        "The task was modified by another request; refresh and retry"
      )
    );

    render(
      <AuthProvider>
        <ToastProvider>
          <TaskDetailPage
            params={{
              workspaceId: "ws-1",
              projectId: "proj-1",
              taskId: "task-100",
            }}
          />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Implement auth flows")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Optimistic Lock Conflict \(HTTP 409\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reload latest version/i })
      ).toBeInTheDocument();
    });
  });

  it("deletes task through confirmation dialog", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(projectApi.columns).mockResolvedValueOnce(mockColumns);
    vi.mocked(workspaceApi.members).mockResolvedValueOnce([]);
    vi.mocked(taskApi.delete).mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <ToastProvider>
          <TaskDetailPage
            params={{
              workspaceId: "ws-1",
              projectId: "proj-1",
              taskId: "task-100",
            }}
          />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Implement auth flows")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete task/i }));

    expect(screen.getByRole("heading", { name: "Delete Task" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(taskApi.delete).toHaveBeenCalledWith("task-100", 4);
    });
  });
});
