"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Save,
  Trash2,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  User,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { taskApi, projectApi, workspaceApi, ApiError } from "@/lib/api/client";
import { useProjectRealtime } from "@/lib/realtime/use-project-realtime";
import {
  KanbanColumnView,
  RealtimeEvent,
  TaskPriority,
  TaskView,
  WorkspaceMemberView,
} from "@/types/api";

export default function TaskDetailPage({
  params,
}: {
  params: { workspaceId: string; projectId: string; taskId: string };
}) {
  const [task, setTask] = React.useState<TaskView | null>(null);
  const [columns, setColumns] = React.useState<KanbanColumnView[]>([]);
  const [members, setMembers] = React.useState<WorkspaceMemberView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  // Form State
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("MEDIUM");
  const [columnId, setColumnId] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState<string>("NONE");
  const [dueDate, setDueDate] = React.useState("");
  const [saveLoading, setSaveLoading] = React.useState(false);

  // Delete Confirmation Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setConflictError(null);
    try {
      const [taskData, cols, mems] = await Promise.all([
        taskApi.get(params.taskId),
        projectApi.columns(params.projectId),
        workspaceApi.members(params.workspaceId),
      ]);
      setTask(taskData);
      setTitle(taskData.title);
      setDescription(taskData.description || "");
      setPriority(taskData.priority);
      setColumnId(taskData.columnId);
      setAssigneeId(taskData.assigneeId || "NONE");
      setDueDate(taskData.dueDate || "");
      setColumns(cols.sort((a, b) => a.position - b.position));
      setMembers(mems);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load task details.");
      } else {
        setError("Network error. Could not connect to Kinetic backend.");
      }
    } finally {
      setLoading(false);
    }
  }, [params.taskId, params.projectId, params.workspaceId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRealtimeEvent = React.useCallback(
    (event: RealtimeEvent) => {
      if (event.resourceId !== params.taskId) return;

      if (event.type === "task.deleted") {
        toast({
          title: "Task deleted",
          description: "This task was removed by another collaborator.",
          type: "error",
        });
        router.push(
          `/workspaces/${params.workspaceId}/projects/${params.projectId}/board`
        );
        return;
      }

      if (event.version !== null && task && event.version > task.version) {
        toast({
          title: "Task updated",
          description: "Newer version available from server. Refetching...",
          type: "info",
        });
        loadData();
      }
    },
    [params.taskId, params.workspaceId, params.projectId, task, router, toast, loadData]
  );

  const { status: realtimeStatus } = useProjectRealtime({
    projectId: params.projectId,
    onTaskEvent: handleRealtimeEvent,
    onReconnect: loadData,
  });

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    setSaveLoading(true);
    setConflictError(null);
    try {
      // 1. If column changed, perform task movement first
      let currentVersion = task.version;
      if (columnId !== task.columnId) {
        const moved = await taskApi.move(task.id, {
          columnId,
          position: 0,
          version: currentVersion,
        });
        currentVersion = moved.version;
      }

      // 2. Perform property updates with optimistic version check
      const updated = await taskApi.update(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assigneeId === "NONE" ? null : assigneeId,
        dueDate: dueDate || null,
        version: currentVersion,
      });

      setTask(updated);
      toast({
        title: "Task saved",
        description: `Task updated to version ${updated.version}.`,
        type: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === "TASK_VERSION_CONFLICT") {
          setConflictError(
            "Version conflict: The task was modified by another request. Reload the latest version before retrying."
          );
          toast({
            title: "Version Conflict (409)",
            description: "Stale task version detected. Please reload.",
            type: "error",
          });
        } else {
          toast({
            title: "Save failed",
            description: err.message,
            type: "error",
          });
        }
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;

    setDeleteLoading(true);
    try {
      await taskApi.delete(task.id, task.version);
      toast({
        title: "Task deleted",
        description: `Task "${task.title}" was removed.`,
        type: "info",
      });
      router.push(
        `/workspaces/${params.workspaceId}/projects/${params.projectId}/board`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Delete failed",
          description: err.message,
          type: "error",
        });
      }
      setDeleteLoading(false);
    }
  };

  const activeColumn = columns.find((c) => c.id === task?.columnId);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        {
          label: "Workspace",
          href: `/workspaces/${params.workspaceId}`,
        },
        {
          label: "Board",
          href: `/workspaces/${params.workspaceId}/projects/${params.projectId}/board`,
        },
        { label: task?.title || "Task Details" },
      ]}
      currentWorkspaceId={params.workspaceId}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation back and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={`/workspaces/${params.workspaceId}/projects/${params.projectId}/board`}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Board
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              aria-label="Refresh task"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading || !task}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete Task
            </Button>
            <Button
              size="sm"
              onClick={handleSaveChanges}
              isLoading={saveLoading}
              disabled={loading || !task}
            >
              <Save className="mr-1.5 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="ml-4 h-7 text-xs"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {conflictError && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">
              Optimistic Lock Conflict (HTTP 409)
            </AlertTitle>
            <AlertDescription className="text-xs flex items-center justify-between">
              <span>{conflictError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="ml-4 h-7 text-xs"
              >
                Reload Latest Version
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Task Details Card */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        ) : task ? (
          <form onSubmit={handleSaveChanges}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main content: Title & Description */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Task ID: {task.id}
                      </span>
                      <div className="flex items-center gap-2">
                        {realtimeStatus === "connected" && (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5"
                            aria-label="Realtime: Live"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </Badge>
                        )}
                        <Badge variant="outline" className="font-mono text-xs">
                          Version: v{task.version}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="task-title">Title</Label>
                      <Input
                        id="task-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="font-medium text-base"
                        maxLength={200}
                        required
                        disabled={saveLoading}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="task-desc">Description</Label>
                      <textarea
                        id="task-desc"
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={5000}
                        disabled={saveLoading}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                        placeholder="Provide details about this task..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Information */}
                <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Created:</span>
                    <span className="font-mono text-foreground">
                      {new Date(task.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated:</span>
                    <span className="font-mono text-foreground">
                      {new Date(task.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created By:</span>
                    <span className="font-mono text-foreground">
                      {task.createdBy}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar / Metadata options */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      Properties
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    {/* Column / Status */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status Column</Label>
                      <Select value={columnId} onValueChange={setColumnId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name} (pos {col.position})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Priority</Label>
                      <Select
                        value={priority}
                        onValueChange={(val) => setPriority(val as TaskPriority)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1.5">
                      <Label htmlFor="dueDate" className="text-xs">
                        Due Date
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    {/* Assignee */}
                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-xs">Assignee</Label>
                      <Select
                        value={assigneeId}
                        onValueChange={setAssigneeId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Unassigned</SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.userId.substring(0, 8)}... ({m.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Concurrency Safeguard Note */}
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Optimistic Concurrency Check</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Updates submit version <code>{task.version}</code>. If another
                    collaborator saved edits first, the backend rejects the change with{" "}
                    <code>409 TASK_VERSION_CONFLICT</code>.
                  </p>
                </div>
              </div>
            </div>
          </form>
        ) : null}
      </div>

      {/* Delete Task Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete <strong>{task?.title}</strong>? This
              action cannot be undone and dense column positions will rebalance
              automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteTask}
              isLoading={deleteLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
