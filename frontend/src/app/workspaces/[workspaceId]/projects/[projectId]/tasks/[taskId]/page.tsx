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
  MessageSquare,
  Send,
  Eye,
  Edit3,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SafeMarkdown } from "@/components/ui/safe-markdown";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/auth-context";
import {
  taskApi,
  projectApi,
  workspaceApi,
  commentApi,
  ApiError,
} from "@/lib/api/client";
import { useProjectRealtime } from "@/lib/realtime/use-project-realtime";
import {
  KanbanColumnView,
  RealtimeEvent,
  TaskPriority,
  TaskView,
  WorkspaceMemberView,
  CommentView,
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

  // Comments State
  const { user } = useAuth();
  const [comments, setComments] = React.useState<CommentView[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(true);
  const [commentText, setCommentText] = React.useState("");
  const [composerMode, setComposerMode] = React.useState<"write" | "preview">("write");
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [commentToDelete, setCommentToDelete] = React.useState<CommentView | null>(null);
  const [deleteCommentLoading, setDeleteCommentLoading] = React.useState(false);

  // Delete Confirmation Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const loadComments = React.useCallback(async () => {
    try {
      const page = await commentApi.list(params.taskId, 0, 50);
      setComments(page.items);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setCommentsLoading(false);
    }
  }, [params.taskId]);

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
    loadComments();
  }, [loadData, loadComments]);

  const handleRealtimeEvent = React.useCallback(
    (event: RealtimeEvent) => {
      if (event.type === "comment.created" || event.type === "comment.deleted") {
        loadComments();
        return;
      }

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
    [params.taskId, params.workspaceId, params.projectId, task, router, toast, loadData, loadComments]
  );

  const { status: realtimeStatus } = useProjectRealtime({
    projectId: params.projectId,
    onTaskEvent: handleRealtimeEvent,
    onReconnect: () => {
      loadData();
      loadComments();
    },
  });

  const handleCreateComment = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || commentSubmitting) return;

    if (trimmed.length > 5000) {
      toast({
        title: "Comment too long",
        description: "Comments must not exceed 5000 characters.",
        type: "error",
      });
      return;
    }

    setCommentSubmitting(true);
    try {
      const created = await commentApi.create(params.taskId, { content: trimmed });
      setComments((prev) => [...prev, created]);
      setCommentText("");
      setComposerMode("write");
      toast({
        title: "Comment posted",
        description: "Your comment was added to the discussion.",
        type: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Failed to post comment",
          description: err.message,
          type: "error",
        });
      } else {
        toast({
          title: "Failed to post comment",
          description: "An unexpected error occurred.",
          type: "error",
        });
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    setDeleteCommentLoading(true);
    try {
      await commentApi.delete(commentToDelete.id);
      setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));
      toast({
        title: "Comment deleted",
        description: "The comment was successfully removed.",
        type: "info",
      });
      setCommentToDelete(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Delete failed",
          description: err.message,
          type: "error",
        });
      } else {
        toast({
          title: "Delete failed",
          description: "Could not delete comment.",
          type: "error",
        });
      }
    } finally {
      setDeleteCommentLoading(false);
    }
  };

  const currentMember = members.find((m) => m.userId === user?.id);
  const canDeleteComment = (c: CommentView) => {
    if (!user) return false;
    if (c.authorId === user.id) return true;
    return currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";
  };

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

                {/* Discussion & Comments */}
                <Card>
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Discussion</CardTitle>
                        <Badge variant="secondary" className="text-xs px-2 py-0 font-normal">
                          {comments.length}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Markdown supported
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Comments List */}
                    {commentsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm font-medium text-foreground">No comments yet</p>
                        <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                          Share updates, implementation notes, or questions with your workspace team.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => {
                          const initials = comment.authorName
                            ? comment.authorName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()
                            : "U";
                          const formattedDate = new Date(comment.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });

                          return (
                            <div
                              key={comment.id}
                              className="rounded-lg border bg-card p-4 transition-colors space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="h-7 w-7 text-[11px]">
                                    <AvatarFallback>{initials}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">
                                      {comment.authorName}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {formattedDate}
                                    </span>
                                  </div>
                                </div>

                                {canDeleteComment(comment) && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => setCommentToDelete(comment)}
                                    aria-label={`Delete comment by ${comment.authorName}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>

                              <div className="text-sm pl-9">
                                <SafeMarkdown content={comment.content} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Comment Composer */}
                    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant={composerMode === "write" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => setComposerMode("write")}
                          >
                            <Edit3 className="mr-1.5 h-3 w-3" />
                            Write
                          </Button>
                          <Button
                            type="button"
                            variant={composerMode === "preview" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => setComposerMode("preview")}
                          >
                            <Eye className="mr-1.5 h-3 w-3" />
                            Preview
                          </Button>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {commentText.length} / 5000
                        </span>
                      </div>

                      {composerMode === "write" ? (
                        <textarea
                          rows={3}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          maxLength={5000}
                          disabled={commentSubmitting}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                          placeholder="Leave a comment... Supports **bold**, *italic*, `code`, and [links](https://...)"
                        />
                      ) : (
                        <div className="min-h-[76px] rounded-md border border-dashed bg-background/50 p-3 text-sm">
                          {commentText.trim() ? (
                            <SafeMarkdown content={commentText} />
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              Nothing to preview yet. Switch back to Write and type something.
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          Styling tips: **bold**, *italic*, `code`, &gt; quote
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateComment}
                          isLoading={commentSubmitting}
                          disabled={!commentText.trim() || commentSubmitting}
                          className="ml-auto"
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Comment
                        </Button>
                      </div>
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

      {/* Delete Comment Confirmation Dialog */}
      <Dialog
        open={Boolean(commentToDelete)}
        onOpenChange={(open) => {
          if (!open) setCommentToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete this comment by{" "}
              <strong>{commentToDelete?.authorName}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommentToDelete(null)}
              disabled={deleteCommentLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteComment}
              isLoading={deleteCommentLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
