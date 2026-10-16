import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "../app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth/auth-context";

vi.mock("@/lib/api/client", () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({
      id: "user-1",
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      createdAt: "2026-10-16T10:00:00Z",
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("AppShell component", () => {
  it("renders sidebar branding and navigation", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <AppShell
            breadcrumbs={[{ label: "Overview" }]}
            currentWorkspaceId="ws-1"
            workspaces={[
              {
                id: "ws-1",
                name: "Core Workspace",
                createdBy: "user-1",
                createdAt: "2026-10-16T10:00:00Z",
              },
            ]}
            skipAuth
          >
            <div data-testid="test-content">Dashboard Content</div>
          </AppShell>
        </AuthProvider>
      </ThemeProvider>
    );

    // Kinetic branding in sidebar
    expect(screen.getAllByText("Kinetic").length).toBeGreaterThan(0);
    expect(screen.getByText("Move work forward, together.")).toBeInTheDocument();

    // Children content
    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });
});
