import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth, ProtectedRoute } from "../auth-context";
import { authApi, ApiError } from "@/lib/api/client";

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
      me: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    },
    clearCsrfTokenCache: vi.fn(),
    ApiError: MockApiError,
  };
});

function TestConsumer() {
  const { user, loading, login, logout, register } = useAuth();

  if (loading) return <div>Loading Auth...</div>;

  return (
    <div>
      <div data-testid="user-name">{user ? user.displayName : "No User"}</div>
      <button
        onClick={() =>
          login({ email: "test@example.com", password: "password12345" })
        }
      >
        Sign In
      </button>
      <button
        onClick={() =>
          register({
            displayName: "New User",
            email: "new@example.com",
            password: "password12345",
          })
        }
      >
        Sign Up
      </button>
      <button onClick={() => logout()}>Sign Out</button>
    </div>
  );
}

describe("AuthContext & ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves current user when session is valid", async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({
      id: "u-123",
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      createdAt: "2026-10-16T10:00:00Z",
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByText("Loading Auth...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Ada Lovelace");
    });
  });

  it("sets user to null when unauthenticated (401)", async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(
      new (ApiError as any)(401, "UNAUTHENTICATED", "Unauthorized")
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("No User");
    });
  });

  it("updates user state on successful login", async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(
      new (ApiError as any)(401, "UNAUTHENTICATED", "Unauthorized")
    );
    vi.mocked(authApi.login).mockResolvedValueOnce({
      id: "u-123",
      displayName: "Charles Babbage",
      email: "charles@example.com",
      createdAt: "2026-10-16T10:00:00Z",
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("No User");
    });

    act(() => {
      screen.getByRole("button", { name: "Sign In" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Charles Babbage");
    });
  });

  it("clears user state on logout", async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({
      id: "u-123",
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      createdAt: "2026-10-16T10:00:00Z",
    });
    vi.mocked(authApi.logout).mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Ada Lovelace");
    });

    act(() => {
      screen.getByRole("button", { name: "Sign Out" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("No User");
    });
  });

  it("ProtectedRoute renders children when authenticated", async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({
      id: "u-123",
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      createdAt: "2026-10-16T10:00:00Z",
    });

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Dashboard</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
  });
});
