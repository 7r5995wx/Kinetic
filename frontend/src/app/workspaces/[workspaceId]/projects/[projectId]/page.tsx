"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  Clock,
  RefreshCw,
  Edit2,
  Check,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { projectApi, ApiError } from "@/lib/api/client";
import { KanbanColumnView, ProjectView } from "@/types/api";

export default function ProjectOverviewPage({
  params,
}: {
  params: { workspaceId: string; projectId: string };
}) {
  const [project, setProject] = React.useState<ProjectView | null>(null);
  const [columns, setColumns] = React.useState<KanbanColumnView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Edit Project State
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [saveLoading, setSaveLoading] = React.useState(false);

  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proj, cols] = await Promise.all([
        projectApi.get(params.projectId),
        projectApi.columns(params.projectId),
      ]);
      setProject(proj);
      setEditName(proj.name);
      setEditDescription(proj.description || "");
      setColumns(cols.sort((a, b) => a.position - b.position));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load project.");
      } else {
        setError("Network error. Could not connect to Kinetic backend.");
      }
    } finally {
      setLoading(false);
    }
  }, [params.projectId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setSaveLoading(true);
    try {
      const updated = await projectApi.update(params.projectId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setProject(updated);
      setIsEditing(false);
      toast({
        title: "Project updated",
        description: "Project details saved successfully.",
        type: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Update failed",
          description: err.message,
          type: "error",
        });
      }
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        {
          label: "Workspace",
          href: `/workspaces/${params.workspaceId}`,
        },
        { label: project?.name || "Project Details" },
      ]}
      currentWorkspaceId={params.workspaceId}
    >
      <div className="space-y-6 max-w-5xl">
        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {project ? project.name : "Project Details"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Project ID: <code className="font-mono">{params.projectId}</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              aria-label="Refresh project"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button size="sm" asChild>
              <Link
                href={`/workspaces/${params.workspaceId}/projects/${params.projectId}/board`}
              >
                <Layers className="mr-1.5 h-4 w-4" />
                Open Kanban Board
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
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

        {/* Project Metadata / Editing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Project Information
                </CardTitle>
                <CardDescription className="text-xs">
                  Metadata and description for this project.
                </CardDescription>
              </div>
              {!isEditing && project && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : isEditing ? (
              <form onSubmit={handleSaveProject} className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Project Name</Label>
                  <Input
                    id="p-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    maxLength={120}
                    disabled={saveLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-desc">Description</Label>
                  <textarea
                    id="p-desc"
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={2000}
                    disabled={saveLoading}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" isLoading={saveLoading}>
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={saveLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium">
                    Description:
                  </span>
                  <p className="mt-1 text-foreground leading-relaxed">
                    {project?.description || (
                      <span className="italic text-muted-foreground/70">
                        No description provided.
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground pt-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Created:{" "}
                    {project?.createdAt
                      ? new Date(project.createdAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Board Columns Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Workflow Stages
            </h2>
            <span className="text-xs text-muted-foreground">
              {columns.length} columns configured
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {columns.map((col) => (
                <Card key={col.id} className="border shadow-none bg-card/60">
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold">
                        {col.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1 py-0 font-mono"
                      >
                        pos {col.position}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground font-mono truncate">
                    ID: {col.id.substring(0, 8)}...
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
