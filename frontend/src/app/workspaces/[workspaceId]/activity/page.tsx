"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  FolderPlus,
  FolderX,
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { workspaceApi, activityApi, ApiError } from "@/lib/api/client";
import { ActivityView, WorkspaceView } from "@/types/api";

const PAGE_SIZE = 20;

function getActivityIcon(type: string) {
  switch (type) {
    case "task.created":
      return <Plus className="h-4 w-4 text-emerald-500" />;
    case "task.updated":
      return <Edit3 className="h-4 w-4 text-blue-500" />;
    case "task.moved":
      return <ArrowRightLeft className="h-4 w-4 text-purple-500" />;
    case "task.deleted":
      return <Trash2 className="h-4 w-4 text-rose-500" />;
    case "project.created":
      return <FolderPlus className="h-4 w-4 text-indigo-500" />;
    case "project.updated":
      return <FolderKanban className="h-4 w-4 text-sky-500" />;
    case "project.deleted":
      return <FolderX className="h-4 w-4 text-rose-600" />;
    case "comment.created":
      return <MessageSquare className="h-4 w-4 text-amber-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return isoString;
  }
}

export default function WorkspaceActivityPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const [workspace, setWorkspace] = React.useState<WorkspaceView | null>(null);
  const [activities, setActivities] = React.useState<ActivityView[]>([]);
  const [page, setPage] = React.useState(0);
  const [totalElements, setTotalElements] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = React.useState(false);
  const [exportingJson, setExportingJson] = React.useState(false);

  const { toast } = useToast();

  const loadData = React.useCallback(
    async (targetPage = 0) => {
      setLoading(true);
      setError(null);
      try {
        const [ws, activityPage] = await Promise.all([
          workspaceApi.get(params.workspaceId),
          activityApi.list(params.workspaceId, targetPage, PAGE_SIZE),
        ]);
        setWorkspace(ws);
        setActivities(activityPage.items);
        setTotalElements(activityPage.totalElements);
        setPage(targetPage);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || "Failed to load workspace activity.");
        } else {
          setError("Network error. Could not connect to Kinetic backend.");
        }
      } finally {
        setLoading(false);
      }
    },
    [params.workspaceId]
  );

  React.useEffect(() => {
    loadData(0);
  }, [loadData]);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const csv = await activityApi.exportCsv(params.workspaceId);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `workspace-${params.workspaceId}-activity.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "CSV Export Ready",
        description: "Activity log downloaded successfully.",
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: err instanceof ApiError ? err.message : "Could not export CSV.",
        type: "error",
      });
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      const data = await activityApi.exportJson(params.workspaceId);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `workspace-${params.workspaceId}-activity.json`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "JSON Export Ready",
        description: "Activity log downloaded successfully.",
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: err instanceof ApiError ? err.message : "Could not export JSON.",
        type: "error",
      });
    } finally {
      setExportingJson(false);
    }
  };

  const totalPages = Math.ceil(totalElements / PAGE_SIZE);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: workspace?.name || "Workspace", href: `/workspaces/${params.workspaceId}` },
        { label: "Activity Stream" },
      ]}
      currentWorkspaceId={params.workspaceId}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Activity Stream
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Audit trail of tasks, projects, and collaboration events for{" "}
              <strong>{workspace?.name || "workspace"}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(page)}
              disabled={loading}
              aria-label="Refresh activity"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exportingCsv || totalElements === 0}
              className="text-xs"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              disabled={exportingJson || totalElements === 0}
              className="text-xs"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Export JSON
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
                onClick={() => loadData(page)}
                className="ml-4 h-7 text-xs"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Timeline Content */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : activities.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <CardContent className="space-y-3 pt-4">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold">
                No activity recorded yet
              </CardTitle>
              <CardDescription className="text-xs max-w-sm mx-auto">
                Actions taken across tasks, projects, and collaboration in this workspace
                will appear here in chronological order.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="relative flex items-start gap-3 rounded-lg border bg-card p-3.5 shadow-2xs hover:bg-muted/30 transition-colors"
                >
                  <div className="absolute -left-[23px] top-4 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border shadow-xs">
                    {getActivityIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">
                          {item.actorName}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                          {item.type}
                        </Badge>
                      </div>
                      <time
                        dateTime={item.createdAt}
                        title={new Date(item.createdAt).toLocaleString()}
                        className="text-[11px] text-muted-foreground whitespace-nowrap"
                      >
                        {formatRelativeTime(item.createdAt)}
                      </time>
                    </div>

                    <p className="text-xs text-foreground/90 font-medium">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">
                  Showing page {page + 1} of {totalPages} ({totalElements} events)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={page === 0 || loading}
                    onClick={() => loadData(page - 1)}
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => loadData(page + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
