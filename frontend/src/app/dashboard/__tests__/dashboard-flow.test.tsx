import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardPage from "../page";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { workspaceApi, authApi, ApiError } from "@/lib/api/client";

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
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      members: vi.fn(),
      addMember: vi.fn(),
      changeMemberRole: vi.fn(),
      removeMember: vi.fn(),
    },
    clearCsrfTokenCache: vi.fn(),
    ApiError: MockApiError,
  };
});

describe("DashboardPage Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays workspaces returned from the backend", async () => {
    vi.mocked(workspaceApi.list).mockResolvedValueOnce([
      {
        id: "ws-1",
        name: "Platform Core",
        createdBy: "u-1",
        createdAt: "2026-10-16T10:00:00Z",
      },
    ]);

    render(
      <AuthProvider>
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Platform Core")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /open workspace/i })).toHaveAttribute(
        "href",
        "/workspaces/ws-1"
      );
    });
  });

  it("displays empty state when user has no workspaces", async () => {
    vi.mocked(workspaceApi.list).mockResolvedValueOnce([]);

    render(
      <AuthProvider>
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/no workspaces found/i)).toBeInTheDocument();
    });
  });

  it("creates a new workspace through the modal dialog", async () => {
    vi.mocked(workspaceApi.list).mockResolvedValueOnce([]);
    vi.mocked(workspaceApi.create).mockResolvedValueOnce({
      id: "ws-new",
      name: "New Workspace",
      createdBy: "u-1",
      createdAt: "2026-10-16T11:00:00Z",
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/no workspaces found/i)).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /new workspace/i }));

    expect(screen.getByText("Create New Workspace")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/workspace name/i), {
      target: { value: "New Workspace" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(workspaceApi.create).toHaveBeenCalledWith({
        name: "New Workspace",
      });
      expect(screen.getByText("New Workspace")).toBeInTheDocument();
    });
  });
});
