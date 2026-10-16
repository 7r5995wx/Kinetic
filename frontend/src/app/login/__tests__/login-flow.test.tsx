import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../page";
import { AuthProvider } from "@/lib/auth/auth-context";
import { authApi, ApiError } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => {
  class MockApiError extends Error {
    status: number;
    code: string;
    fieldErrors?: { field: string; message: string }[];
    constructor(
      status: number,
      code: string,
      message: string,
      fieldErrors?: { field: string; message: string }[]
    ) {
      super(message);
      this.status = status;
      this.code = code;
      this.fieldErrors = fieldErrors;
    }
  }

  return {
    authApi: {
      csrf: vi.fn(),
      me: vi.fn().mockRejectedValue(new MockApiError(401, "UNAUTHENTICATED", "Unauthorized")),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    },
    clearCsrfTokenCache: vi.fn(),
    ApiError: MockApiError,
  };
});

describe("LoginPage Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form with email and password inputs", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("submits valid credentials to authApi.login", async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      id: "u-1",
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      createdAt: "2026-10-16T10:00:00Z",
    });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "password12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "password12345",
      });
    });
  });

  it("displays error alert on invalid credentials (401)", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(
      new (ApiError as any)(401, "INVALID_CREDENTIALS", "Bad credentials")
    );

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i)
      ).toBeInTheDocument();
    });
  });

  it("displays field errors returned from server validation", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(
      new (ApiError as any)(422, "VALIDATION_FAILED", "Validation failed", [
        { field: "email", message: "must be a well-formed email address" },
      ])
    );

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "invalid@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "password12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText("must be a well-formed email address")
      ).toBeInTheDocument();
    });
  });
});
