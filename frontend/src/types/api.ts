export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface UserResponse {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface WorkspaceView {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface WorkspaceMemberView {
  userId: string;
  role: WorkspaceRole;
}

export interface WorkspaceCreateRequest {
  name: string;
}

export interface WorkspaceUpdateRequest {
  name: string;
}

export interface MemberChangeRequest {
  userId?: string;
  email?: string;
  role: WorkspaceRole;
}

export interface ProjectView {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
}

export interface ProjectUpdateRequest {
  name: string;
  description?: string;
}

export interface KanbanColumnView {
  id: string;
  name: string;
  position: number;
}

export interface TaskView {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
  createdBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  columnId: string;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export interface TaskUpdateRequest {
  title: string;
  description?: string;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  version: number;
}

export interface TaskMoveRequest {
  columnId: string;
  position: number;
  version: number;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  fieldErrors?: FieldError[];
  requestId?: string;
}

export interface CsrfResponse {
  headerName: string;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface RealtimeEvent {
  eventId: string;
  type: "task.created" | "task.updated" | "task.moved" | "task.deleted" | string;
  workspaceId: string;
  projectId: string;
  resourceId: string;
  version: number | null;
  occurredAt: string;
}

