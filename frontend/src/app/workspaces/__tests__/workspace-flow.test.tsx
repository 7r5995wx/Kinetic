import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkspaceOverviewPage from "../[workspaceId]/page";
import WorkspaceSettingsPage from "../[workspaceId]/settings/page";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { workspaceApi, projectApi, authApi, ApiError } from "@/lib/api/client";

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
      members: vi.fn(),
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
    clearCsrfTokenCache: vi.fn(),
    ApiError: MockApiError,
  };
});

describe("Workspace Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("WorkspaceOverviewPage", () => {
    it("loads workspace and projects list from backend", async () => {
      vi.mocked(workspaceApi.get).mockResolvedValueOnce({
        id: "ws-1",
        name: "Engineering Core",
        createdBy: "u-1",
        createdAt: "2026-10-16T10:00:00Z",
      });
      vi.mocked(projectApi.list).mockResolvedValueOnce({
        items: [
          {
            id: "proj-1",
            workspaceId: "ws-1",
            name: "API Monolith",
            description: "Spring Boot service",
            createdAt: "2026-10-16T10:00:00Z",
          },
        ],
        page: 0,
        size: 25,
        totalElements: 1,
      });

      render(
        <AuthProvider>
          <ToastProvider>
            <WorkspaceOverviewPage params={{ workspaceId: "ws-1" }} />
          </ToastProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Engineering Core" })
        ).toBeInTheDocument();
        expect(screen.getByText("API Monolith")).toBeInTheDocument();
      });
    });

    it("creates a new project in the workspace", async () => {
      vi.mocked(workspaceApi.get).mockResolvedValueOnce({
        id: "ws-1",
        name: "Engineering Core",
        createdBy: "u-1",
        createdAt: "2026-10-16T10:00:00Z",
      });
      vi.mocked(projectApi.list).mockResolvedValueOnce({
        items: [],
        page: 0,
        size: 25,
        totalElements: 0,
      });
      vi.mocked(projectApi.create).mockResolvedValueOnce({
        id: "proj-new",
        workspaceId: "ws-1",
        name: "Web Application",
        description: "Next.js dashboard",
        createdAt: "2026-10-16T11:00:00Z",
      });

      render(
        <AuthProvider>
          <ToastProvider>
            <WorkspaceOverviewPage params={{ workspaceId: "ws-1" }} />
          </ToastProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /new project|create project/i })[0]);

      fireEvent.change(screen.getByLabelText(/project name/i), {
        target: { value: "Web Application" },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: "Next.js dashboard" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^create project$/i }));

      await waitFor(() => {
        expect(projectApi.create).toHaveBeenCalledWith("ws-1", {
          name: "Web Application",
          description: "Next.js dashboard",
        });
        expect(screen.getByText("Web Application")).toBeInTheDocument();
      });
    });
  });

  describe("WorkspaceSettingsPage", () => {
    it("loads members and displays member list", async () => {
      vi.mocked(workspaceApi.get).mockResolvedValueOnce({
        id: "ws-1",
        name: "Engineering Core",
        createdBy: "u-1",
        createdAt: "2026-10-16T10:00:00Z",
      });
      vi.mocked(workspaceApi.members).mockResolvedValueOnce([
        {
          userId: "u-1",
          role: "OWNER",
        },
        {
          userId: "u-2",
          role: "MEMBER",
        },
      ]);

      render(
        <AuthProvider>
          <ToastProvider>
            <WorkspaceSettingsPage params={{ workspaceId: "ws-1" }} />
          </ToastProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("u-1")).toBeInTheDocument();
        expect(screen.getByText("u-2")).toBeInTheDocument();
      });
    });

    it("adds member by email address", async () => {
      vi.mocked(workspaceApi.get).mockResolvedValueOnce({
        id: "ws-1",
        name: "Engineering Core",
        createdBy: "u-1",
        createdAt: "2026-10-16T10:00:00Z",
      });
      vi.mocked(workspaceApi.members).mockResolvedValueOnce([
        { userId: "u-1", role: "OWNER" },
      ]);
      vi.mocked(workspaceApi.addMember).mockResolvedValueOnce({
        userId: "u-new",
        role: "MEMBER",
      });

      render(
        <AuthProvider>
          <ToastProvider>
            <WorkspaceSettingsPage params={{ workspaceId: "ws-1" }} />
          </ToastProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("u-1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /add member/i }));

      fireEvent.change(screen.getByLabelText(/user email/i), {
        target: { value: "collaborator@company.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^add member$/i }));

      await waitFor(() => {
        expect(workspaceApi.addMember).toHaveBeenCalledWith("ws-1", {
          email: "collaborator@company.com",
          role: "MEMBER",
        });
        expect(screen.getByText("u-new")).toBeInTheDocument();
      });
    });
  });
});
