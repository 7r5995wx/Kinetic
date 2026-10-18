import {
  ApiErrorResponse,
  CsrfResponse,
  UserResponse,
  LoginRequest,
  RegisterRequest,
  WorkspaceView,
  WorkspaceCreateRequest,
  WorkspaceUpdateRequest,
  WorkspaceMemberView,
  MemberChangeRequest,
  WorkspaceRole,
  ProjectView,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  KanbanColumnView,
  PageResponse,
  TaskView,
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskMoveRequest,
  CommentView,
  CommentCreateRequest,
  ActivityView,
} from "@/types/api";

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    if (process.env.NEXT_PUBLIC_API_BASE_URL.startsWith("http")) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    if (typeof window !== "undefined") {
      return process.env.NEXT_PUBLIC_API_BASE_URL.startsWith("/")
        ? process.env.NEXT_PUBLIC_API_BASE_URL
        : `/${process.env.NEXT_PUBLIC_API_BASE_URL}`;
    }
    const backendOrigin =
      process.env.BACKEND_API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:8080";
    const path = process.env.NEXT_PUBLIC_API_BASE_URL.startsWith("/")
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : `/${process.env.NEXT_PUBLIC_API_BASE_URL}`;
    return `${backendOrigin}${path}`;
  }

  if (typeof window !== "undefined") {
    return "/api/v1";
  }

  return (
    (process.env.BACKEND_API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:8080") + "/api/v1"
  );
}

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: { field: string; message: string }[];
  readonly requestId?: string;

  constructor(error: ApiErrorResponse) {
    super(error.message);
    this.name = "ApiError";
    this.status = error.status;
    this.code = error.code;
    this.fieldErrors = error.fieldErrors;
    this.requestId = error.requestId;
  }
}

let cachedCsrfToken: string | null = null;
let cachedCsrfHeaderName: string = "X-CSRF-TOKEN";

export async function fetchCsrfToken(): Promise<CsrfResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to bootstrap CSRF token: ${response.status}`);
  }

  const data: CsrfResponse = await response.json();
  cachedCsrfToken = data.token;
  cachedCsrfHeaderName = data.headerName || "X-CSRF-TOKEN";
  return data;
}

export function clearCsrfTokenCache(): void {
  cachedCsrfToken = null;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", headers: customHeaders, body, ...rest } = options;
  const isUnsafeMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(
    method.toUpperCase()
  );

  const headers = new Headers(customHeaders);
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (isUnsafeMethod) {
    if (!cachedCsrfToken) {
      try {
        await fetchCsrfToken();
      } catch (err) {
        console.warn("Could not retrieve CSRF token beforehand:", err);
      }
    }
    if (cachedCsrfToken) {
      headers.set(cachedCsrfHeaderName, cachedCsrfToken);
    }
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    let errorResponse: ApiErrorResponse;
    try {
      errorResponse = await response.json();
    } catch {
      errorResponse = {
        timestamp: new Date().toISOString(),
        status: response.status,
        code: "HTTP_" + response.status,
        message: response.statusText || "Request failed",
      };
    }
    throw new ApiError(errorResponse);
  }

  return response.json() as Promise<T>;
}

// ----------------- Typed Domain API Services -----------------

export const authApi = {
  csrf: () => fetchCsrfToken(),
  me: () => apiClient<UserResponse>("/auth/me"),
  login: (data: LoginRequest) =>
    apiClient<UserResponse>("/auth/login", { method: "POST", body: data }),
  register: (data: RegisterRequest) =>
    apiClient<UserResponse>("/auth/register", { method: "POST", body: data }),
  logout: () => apiClient<void>("/auth/logout", { method: "POST" }),
  getWsTicket: () =>
    apiClient<{ ticket: string; expiresInSeconds: number }>("/auth/ws-ticket", {
      method: "POST",
    }),
};

export const workspaceApi = {
  list: () => apiClient<WorkspaceView[]>("/workspaces"),
  get: (id: string) => apiClient<WorkspaceView>(`/workspaces/${id}`),
  create: (data: WorkspaceCreateRequest) =>
    apiClient<WorkspaceView>("/workspaces", { method: "POST", body: data }),
  update: (id: string, data: WorkspaceUpdateRequest) =>
    apiClient<WorkspaceView>(`/workspaces/${id}`, { method: "PATCH", body: data }),
  members: (id: string) =>
    apiClient<WorkspaceMemberView[]>(`/workspaces/${id}/members`),
  addMember: (id: string, data: MemberChangeRequest) =>
    apiClient<WorkspaceMemberView>(`/workspaces/${id}/members`, {
      method: "POST",
      body: data,
    }),
  changeMemberRole: (id: string, userId: string, role: WorkspaceRole) =>
    apiClient<WorkspaceMemberView>(`/workspaces/${id}/members/${userId}`, {
      method: "PATCH",
      body: { role },
    }),
  removeMember: (id: string, userId: string) =>
    apiClient<void>(`/workspaces/${id}/members/${userId}`, {
      method: "DELETE",
    }),
};

export const projectApi = {
  list: (workspaceId: string, page = 0, size = 25) =>
    apiClient<PageResponse<ProjectView>>(
      `/workspaces/${workspaceId}/projects?page=${page}&size=${size}`
    ),
  get: (id: string) => apiClient<ProjectView>(`/projects/${id}`),
  create: (workspaceId: string, data: ProjectCreateRequest) =>
    apiClient<ProjectView>(`/workspaces/${workspaceId}/projects`, {
      method: "POST",
      body: data,
    }),
  update: (id: string, data: ProjectUpdateRequest) =>
    apiClient<ProjectView>(`/projects/${id}`, { method: "PATCH", body: data }),
  delete: (id: string) =>
    apiClient<void>(`/projects/${id}`, { method: "DELETE" }),
  columns: (id: string) =>
    apiClient<KanbanColumnView[]>(`/projects/${id}/columns`),
};

export const taskApi = {
  list: (
    projectId: string,
    query?: {
      columnId?: string;
      priority?: string;
      assigneeId?: string;
      page?: number;
      size?: number;
    }
  ) => {
    const params = new URLSearchParams();
    if (query?.columnId) params.set("columnId", query.columnId);
    if (query?.priority) params.set("priority", query.priority);
    if (query?.assigneeId) params.set("assigneeId", query.assigneeId);
    params.set("page", String(query?.page ?? 0));
    params.set("size", String(query?.size ?? 100));
    return apiClient<PageResponse<TaskView>>(
      `/projects/${projectId}/tasks?${params.toString()}`
    );
  },
  get: (id: string) => apiClient<TaskView>(`/tasks/${id}`),
  create: (projectId: string, data: TaskCreateRequest) =>
    apiClient<TaskView>(`/projects/${projectId}/tasks`, {
      method: "POST",
      body: data,
    }),
  update: (id: string, data: TaskUpdateRequest) =>
    apiClient<TaskView>(`/tasks/${id}`, { method: "PATCH", body: data }),
  move: (id: string, data: TaskMoveRequest) =>
    apiClient<TaskView>(`/tasks/${id}/move`, { method: "POST", body: data }),
  delete: (id: string, version: number) =>
    apiClient<void>(`/tasks/${id}?version=${version}`, {
      method: "DELETE",
    }),
};

export const commentApi = {
  list: (taskId: string, page = 0, size = 50) =>
    apiClient<PageResponse<CommentView>>(
      `/tasks/${taskId}/comments?page=${page}&size=${size}`
    ),
  create: (taskId: string, data: CommentCreateRequest) =>
    apiClient<CommentView>(`/tasks/${taskId}/comments`, {
      method: "POST",
      body: data,
    }),
  delete: (id: string) =>
    apiClient<void>(`/comments/${id}`, {
      method: "DELETE",
    }),
};

export const activityApi = {
  list: (workspaceId: string, page = 0, size = 20) =>
    apiClient<PageResponse<ActivityView>>(
      `/workspaces/${workspaceId}/activities?page=${page}&size=${size}`
    ),
  exportCsv: (workspaceId: string) =>
    apiClient<string>(`/workspaces/${workspaceId}/activities/export/csv`),
  exportJson: (workspaceId: string) =>
    apiClient<ActivityView[]>(`/workspaces/${workspaceId}/activities/export/json`),
};
