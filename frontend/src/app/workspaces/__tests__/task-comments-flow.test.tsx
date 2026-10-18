import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskDetailPage from "../[workspaceId]/projects/[projectId]/tasks/[taskId]/page";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import {
  taskApi,
  projectApi,
  workspaceApi,
  commentApi,
  authApi,
  ApiError,
} from "@/lib/api/client";
import { CommentView } from "@/types/api";

let mockRealtimeTaskHandler: ((event: any) => void) | null = null;

vi.mock("@/lib/realtime/use-project-realtime", () => ({
  useProjectRealtime: ({
    onTaskEvent,
  }: {
    projectId: string;
    onTaskEvent?: (event: any) => void;
  }) => {
    mockRealtimeTaskHandler = onTaskEvent || null;
    return {
      status: "connected",
      sendEvent: vi.fn(),
      reconnect: vi.fn(),
    };
  },
}));

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
      members: vi.fn().mockResolvedValue([
        { userId: "u-1", role: "MEMBER" },
        { userId: "u-2", role: "OWNER" },
      ]),
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
      columns: vi.fn().mockResolvedValue([
        { id: "col-1", name: "Backlog", position: 0 },
      ]),
    },
    taskApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      move: vi.fn(),
      delete: vi.fn(),
    },
    commentApi: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    clearCsrfTokenCache: vi.fn(),
    ApiError: MockApiError,
  };
});

describe("Task Comments Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRealtimeTaskHandler = null;
  });

  const mockTask = {
    id: "task-100",
    projectId: "proj-1",
    columnId: "col-1",
    title: "Implement comments feature",
    description: "Support Markdown comments and realtime updates",
    priority: "HIGH" as const,
    assigneeId: null,
    dueDate: "2026-10-31",
    position: 0,
    createdBy: "u-1",
    version: 1,
    createdAt: "2026-10-16T10:00:00Z",
    updatedAt: "2026-10-16T12:00:00Z",
  };

  const mockComments: CommentView[] = [
    {
      id: "comment-1",
      taskId: "task-100",
      content: "First comment with **bold** text and `inline code`",
      authorId: "u-1",
      authorName: "Ada Lovelace",
      createdAt: "2026-10-16T10:30:00Z",
      updatedAt: "2026-10-16T10:30:00Z",
    },
    {
      id: "comment-2",
      taskId: "task-100",
      content: "Second comment from peer: [docs](https://kinetic.app)",
      authorId: "u-2",
      authorName: "Grace Hopper",
      createdAt: "2026-10-16T11:00:00Z",
      updatedAt: "2026-10-16T11:00:00Z",
    },
  ];

  it("renders comments list and author details", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(commentApi.list).mockResolvedValueOnce({
      items: mockComments,
      page: 0,
      size: 50,
      totalElements: 2,
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
      expect(screen.getByText("Discussion")).toBeInTheDocument();
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
      expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
      expect(screen.getByText("bold")).toBeInTheDocument();
      expect(screen.getByText("inline code")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute(
        "href",
        "https://kinetic.app"
      );
    });
  });

  it("toggles between Write and Preview mode in composer", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(commentApi.list).mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 50,
      totalElements: 0,
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
      expect(screen.getByText("No comments yet")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Leave a comment/i);
    fireEvent.change(textarea, {
      target: { value: "Testing **preview mode** rendering" },
    });

    const previewButton = screen.getByRole("button", { name: /Preview/i });
    fireEvent.click(previewButton);

    expect(screen.getByText("preview mode")).toBeInTheDocument();
    expect(screen.getByText("preview mode").tagName).toBe("STRONG");

    const writeButton = screen.getByRole("button", { name: /Write/i });
    fireEvent.click(writeButton);

    expect(screen.getByPlaceholderText(/Leave a comment/i)).toHaveValue(
      "Testing **preview mode** rendering"
    );
  });

  it("creates a new comment and appends it to thread", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(commentApi.list).mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 50,
      totalElements: 0,
    });

    const createdComment: CommentView = {
      id: "comment-new",
      taskId: "task-100",
      content: "Newly submitted comment",
      authorId: "u-1",
      authorName: "Ada Lovelace",
      createdAt: "2026-10-16T12:00:00Z",
      updatedAt: "2026-10-16T12:00:00Z",
    };
    vi.mocked(commentApi.create).mockResolvedValueOnce(createdComment);

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
      expect(screen.getByText("No comments yet")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Leave a comment/i);
    fireEvent.change(textarea, {
      target: { value: "Newly submitted comment" },
    });

    const submitButton = screen.getByRole("button", { name: /^Comment$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(commentApi.create).toHaveBeenCalledWith("task-100", {
        content: "Newly submitted comment",
      });
      expect(screen.getByText("Newly submitted comment")).toBeInTheDocument();
    });
  });

  it("allows author to delete their comment after confirmation", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(commentApi.list).mockResolvedValueOnce({
      items: [mockComments[0]],
      page: 0,
      size: 50,
      totalElements: 1,
    });
    vi.mocked(commentApi.delete).mockResolvedValueOnce(undefined);

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
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    // Current user u-1 is author of comment-1, delete button is present
    const deleteButton = screen.getByRole("button", {
      name: /Delete comment by Ada Lovelace/i,
    });
    fireEvent.click(deleteButton);

    // Confirmation dialog appears
    expect(
      screen.getByText(/Are you sure you want to delete this comment/i)
    ).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole("button", { name: /^Delete$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(commentApi.delete).toHaveBeenCalledWith("comment-1");
      expect(screen.queryByText(/First comment with/i)).not.toBeInTheDocument();
    });
  });

  it("does not show delete button for non-author regular member", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    // User u-1 is a regular MEMBER; comment-2 author is u-2
    vi.mocked(commentApi.list).mockResolvedValueOnce({
      items: [mockComments[1]], // authorId: "u-2"
      page: 0,
      size: 50,
      totalElements: 1,
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
      expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    });

    // Delete button for Grace Hopper's comment should not exist for regular member u-1
    expect(
      screen.queryByRole("button", {
        name: /Delete comment by Grace Hopper/i,
      })
    ).not.toBeInTheDocument();
  });

  it("resynchronizes comments on comment.created realtime event", async () => {
    vi.mocked(taskApi.get).mockResolvedValueOnce(mockTask);
    vi.mocked(commentApi.list)
      .mockResolvedValueOnce({
        items: [],
        page: 0,
        size: 50,
        totalElements: 0,
      })
      .mockResolvedValueOnce({
        items: [mockComments[0]],
        page: 0,
        size: 50,
        totalElements: 1,
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
      expect(screen.getByText("No comments yet")).toBeInTheDocument();
    });

    // Dispatch a comment.created realtime event
    expect(mockRealtimeTaskHandler).not.toBeNull();
    mockRealtimeTaskHandler!({
      eventId: "evt-1",
      type: "comment.created",
      workspaceId: "ws-1",
      projectId: "proj-1",
      resourceId: "comment-1",
      version: null,
      occurredAt: "2026-10-16T11:00:00Z",
    });

    await waitFor(() => {
      expect(commentApi.list).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });
  });
});
