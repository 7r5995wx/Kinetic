"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Calendar,
  ArrowRight,
  RefreshCw,
  Keyboard,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { projectApi, taskApi, ApiError } from "@/lib/api/client";
import { useProjectRealtime } from "@/lib/realtime/use-project-realtime";
import {
  KanbanColumnView,
  ProjectView,
  RealtimeEvent,
  TaskPriority,
  TaskView,
} from "@/types/api";

function getPriorityBadgeVariant(priority: TaskPriority) {
  switch (priority) {
    case "URGENT":
      return "urgent";
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    case "LOW":
      return "low";
  }
}

export default function KanbanBoardPage({
  params,
}: {
  params: { workspaceId: string; projectId: string };
}) {
  const [project, setProject] = React.useState<ProjectView | null>(null);
  const [columns, setColumns] = React.useState<KanbanColumnView[]>([]);
  const [tasks, setTasks] = React.useState<TaskView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  // Priority filter
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");

  // Create Task Dialog
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [targetColumnId, setTargetColumnId] = React.useState<string>("");
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDescription, setTaskDescription] = React.useState("");
  const [taskPriority, setTaskPriority] = React.useState<TaskPriority>("MEDIUM");
  const [taskDueDate, setTaskDueDate] = React.useState("");
  const [createLoading, setCreateLoading] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  // Move in progress tracking
  const [movingTaskId, setMovingTaskId] = React.useState<string | null>(null);

  const { toast } = useToast();

  const loadBoardData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setConflictError(null);
    try {
      const [proj, cols, tasksPage] = await Promise.all([
        projectApi.get(params.projectId),
        projectApi.columns(params.projectId),
        taskApi.list(params.projectId, { size: 100 }),
      ]);
      setProject(proj);
      const sortedCols = cols.sort((a, b) => a.position - b.position);
      setColumns(sortedCols);
      if (sortedCols.length > 0) {
        setTargetColumnId((current) => current || sortedCols[0].id);
      }
      setTasks(tasksPage.items);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load board data.");
      } else {
        setError("Network error. Could not connect to Kinetic backend.");
      }
    } finally {
      setLoading(false);
    }
  }, [params.projectId]);

  React.useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // Real-time synchronization
  const handleRealtimeTaskEvent = React.useCallback(
    (event: RealtimeEvent) => {
      if (event.projectId !== params.projectId) return;

      if (event.type === "task.deleted") {
        setTasks((prev) => prev.filter((t) => t.id !== event.resourceId));
        return;
      }

      setTasks((currentTasks) => {
        const existing = currentTasks.find((t) => t.id === event.resourceId);
        if (existing && event.version !== null && existing.version >= event.version) {
          // Local client already has this or newer version
          return currentTasks;
        }

        if (event.type === "task.moved") {
          // Positions of sibling tasks changed, refresh tasks
          taskApi
            .list(params.projectId, { size: 100 })
            .then((res) => setTasks(res.items))
            .catch((err) => console.warn("Realtime move sync failed:", err));
        } else {
          // Fetch single created or updated task
          taskApi
            .get(event.resourceId)
            .then((fetched) => {
              setTasks((prev) => {
                const exists = prev.some((t) => t.id === fetched.id);
                if (exists) {
                  return prev.map((t) => (t.id === fetched.id ? fetched : t));
                } else {
                  return [...prev, fetched];
                }
              });
            })
            .catch(() => {
              // Fallback to reload board
              taskApi
                .list(params.projectId, { size: 100 })
                .then((res) => setTasks(res.items))
                .catch(() => {});
            });
        }

        return currentTasks;
      });
    },
    [params.projectId]
  );

  const { status: realtimeStatus } = useProjectRealtime({
    projectId: params.projectId,
    onTaskEvent: handleRealtimeTaskEvent,
    onReconnect: loadBoardData,
  });

  const handleOpenCreateForColumn = (columnId: string) => {
    setTargetColumnId(columnId);
    setCreateDialogOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !targetColumnId) return;

    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await taskApi.create(params.projectId, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        columnId: targetColumnId,
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
      });
      setTasks((prev) => [...prev, created]);
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      setCreateDialogOpen(false);
      toast({
        title: "Task created",
        description: `"${created.title}" added to column.`,
        type: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message || "Failed to create task.");
      } else {
        setCreateError("Network error. Could not create task.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleMoveTask = async (
    task: TaskView,
    newColumnId: string,
    newPosition: number
  ) => {
    setMovingTaskId(task.id);
    setConflictError(null);
    try {
      const moved = await taskApi.move(task.id, {
        columnId: newColumnId,
        position: newPosition,
        version: task.version,
      });

      // Update task in state and refresh column tasks positions
      await loadBoardData();
      toast({
        title: "Task moved",
        description: `Task updated to v${moved.version}.`,
        type: "info",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === "TASK_VERSION_CONFLICT") {
          setConflictError(
            `Concurrent modification conflict: Task "${task.title}" was modified by another request. Please reload to fetch authoritative data.`
          );
          toast({
            title: "Version conflict",
            description: "The task was updated by another request. Reloading board...",
            type: "error",
          });
          return;
        } else {
          toast({
            title: "Move failed",
            description: err.message,
            type: "error",
          });
        }
      }
      // Reload on failure to restore consistent server state
      await loadBoardData();
    } finally {
      setMovingTaskId(null);
    }
  };

  const filteredTasks = React.useMemo(() => {
    if (priorityFilter === "ALL") return tasks;
    return tasks.filter((t) => t.priority === priorityFilter);
  }, [tasks, priorityFilter]);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        {
          label: "Workspace",
          href: `/workspaces/${params.workspaceId}`,
        },
        {
          label: project?.name || "Project",
          href: `/workspaces/${params.workspaceId}/projects/${params.projectId}`,
        },
        { label: "Board" },
      ]}
      currentWorkspaceId={params.workspaceId}
    >
      <div className="space-y-6 flex flex-col min-h-[calc(100vh-8rem)]">
        {/* Board Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {project ? project.name : "Kanban Board"}
              </h1>
              <Badge variant="outline" className="text-xs font-mono">
                {columns.length} Columns
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                {tasks.length} Tasks
              </Badge>
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
              {realtimeStatus === "reconnecting" && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-mono text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5"
                  aria-label="Realtime: Reconnecting"
                >
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Reconnecting...
                </Badge>
              )}
              {realtimeStatus === "disconnected" && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-mono text-muted-foreground gap-1.5"
                  aria-label="Realtime: Offline"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  Offline
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dense contiguous task reordering with optimistic concurrency versioning.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadBoardData}
              disabled={loading}
              aria-label="Refresh board"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (columns.length > 0) setTargetColumnId(columns[0].id);
                setCreateDialogOpen(true);
              }}
              disabled={columns.length === 0}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Task
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
                onClick={loadBoardData}
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
                onClick={loadBoardData}
                className="ml-4 h-7 text-xs"
              >
                Reload Latest Board
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Board Columns Canvas */}
        <div className="flex-1 overflow-x-auto pb-4">
          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 min-w-[70rem] h-full items-start">
              {columns.map((column) => {
                const columnTasks = filteredTasks
                  .filter((t) => t.columnId === column.id)
                  .sort((a, b) => a.position - b.position);

                return (
                  <div
                    key={column.id}
                    className="flex flex-col w-72 shrink-0 rounded-xl bg-muted/40 border p-3 max-h-full"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {column.name}
                        </span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                          {columnTasks.length}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenCreateForColumn(column.id)}
                        aria-label={`Add task to ${column.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Tasks Container */}
                    <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                      {columnTasks.map((task, idx) => (
                        <Card
                          key={task.id}
                          className={`p-3 transition-all shadow-sm ${
                            movingTaskId === task.id ? "opacity-50" : ""
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <Badge
                                variant={getPriorityBadgeVariant(task.priority)}
                                className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0"
                              >
                                {task.priority}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-muted-foreground/80">
                                  pos:{task.position}
                                </span>
                                <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 rounded px-1">
                                  v{task.version}
                                </span>
                              </div>
                            </div>

                            <Link
                              href={`/workspaces/${params.workspaceId}/projects/${params.projectId}/tasks/${task.id}`}
                              className="block text-xs font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                            >
                              {task.title}
                            </Link>

                            {task.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{task.dueDate}</span>
                              </div>
                            )}

                            {/* Accessible Movement Actions Bar */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                              {/* Move to another column */}
                              <Select
                                value={task.columnId}
                                onValueChange={(newColId) => {
                                  if (newColId !== task.columnId) {
                                    handleMoveTask(task, newColId, 0);
                                  }
                                }}
                              >
                                <SelectTrigger
                                  className="h-6 w-24 text-[10px] px-1.5 border-dashed"
                                  aria-label={`Move ${task.title} to column`}
                                >
                                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                                  <span>Move</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {columns.map((col) => (
                                    <SelectItem
                                      key={col.id}
                                      value={col.id}
                                      className="text-xs"
                                    >
                                      {col.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Position Reordering inside column */}
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  disabled={idx === 0 || movingTaskId === task.id}
                                  onClick={() =>
                                    handleMoveTask(
                                      task,
                                      task.columnId,
                                      Math.max(0, task.position - 1)
                                    )
                                  }
                                  aria-label="Move task up"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  disabled={
                                    idx === columnTasks.length - 1 ||
                                    movingTaskId === task.id
                                  }
                                  onClick={() =>
                                    handleMoveTask(
                                      task,
                                      task.columnId,
                                      task.position + 1
                                    )
                                  }
                                  aria-label="Move task down"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}

                      {columnTasks.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground/70">
                          No tasks in {column.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Keyboard / Conflict Operation Footnote */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1.5">
            <Keyboard className="h-3.5 w-3.5 text-primary" />
            <span>
              Accessible movement: Use &quot;Move&quot; dropdown to transfer columns,
              and arrow buttons to reorder positions atomically.
            </span>
          </div>
          <span>Optimistic lock version checked on every transaction</span>
        </div>
      </div>

      {/* Create Task Modal Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateTask}>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription className="text-xs">
                Tasks belong to a specific Kanban column and track priority, assignee,
                and optimistic version.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {createError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    {createError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="t-title">Task Title</Label>
                <Input
                  id="t-title"
                  placeholder="e.g. Implement optimistic lock error handling"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  maxLength={200}
                  required
                  disabled={createLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-desc">Description</Label>
                <textarea
                  id="t-desc"
                  rows={3}
                  placeholder="Task details and acceptance criteria..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  maxLength={5000}
                  disabled={createLoading}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-col">Target Column</Label>
                  <Select
                    value={targetColumnId}
                    onValueChange={setTargetColumnId}
                  >
                    <SelectTrigger id="t-col">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="t-prio">Priority</Label>
                  <Select
                    value={taskPriority}
                    onValueChange={(val) => setTaskPriority(val as TaskPriority)}
                  >
                    <SelectTrigger id="t-prio">
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-due">Due Date (optional)</Label>
                <Input
                  id="t-due"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  disabled={createLoading}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={createLoading}>
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
