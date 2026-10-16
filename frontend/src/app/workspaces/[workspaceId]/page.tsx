"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Settings,
  Layers,
  ArrowRight,
  Trash2,
  RefreshCw,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { workspaceApi, projectApi, ApiError } from "@/lib/api/client";
import { ProjectView, WorkspaceView } from "@/types/api";

export default function WorkspaceOverviewPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const [workspace, setWorkspace] = React.useState<WorkspaceView | null>(null);
  const [projects, setProjects] = React.useState<ProjectView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create Project Dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [projectName, setProjectName] = React.useState("");
  const [projectDescription, setProjectDescription] = React.useState("");
  const [createLoading, setCreateLoading] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  // Delete Project Confirmation Dialog
  const [projectToDelete, setProjectToDelete] = React.useState<ProjectView | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ws, projPage] = await Promise.all([
        workspaceApi.get(params.workspaceId),
        projectApi.list(params.workspaceId, 0, 50),
      ]);
      setWorkspace(ws);
      setProjects(projPage.items);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load workspace data.");
      } else {
        setError("Network error. Could not connect to Kinetic backend.");
      }
    } finally {
      setLoading(false);
    }
  }, [params.workspaceId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await projectApi.create(params.workspaceId, {
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
      });
      setProjects((prev) => [created, ...prev]);
      setProjectName("");
      setProjectDescription("");
      setDialogOpen(false);
      toast({
        title: "Project created",
        description: `Project "${created.name}" and default Kanban columns are ready.`,
        type: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message || "Failed to create project.");
      } else {
        setCreateError("Network error. Could not create project.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeleteLoading(true);
    try {
      await projectApi.delete(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      toast({
        title: "Project deleted",
        description: `Project "${projectToDelete.name}" was removed.`,
        type: "info",
      });
      setProjectToDelete(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Delete failed",
          description: err.message,
          type: "error",
        });
      } else {
        toast({
          title: "Network error",
          description: "Could not delete project.",
          type: "error",
        });
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: workspace?.name || "Workspace" },
      ]}
      currentWorkspaceId={params.workspaceId}
    >
      <div className="space-y-6">
        {/* Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {workspace ? workspace.name : "Workspace Overview"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Workspace ID: <code className="font-mono">{params.workspaceId}</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              aria-label="Refresh workspace"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspaces/${params.workspaceId}/settings`}>
                <Settings className="mr-1.5 h-4 w-4" />
                Settings & Members
              </Link>
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Project
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

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              Projects
            </h2>
            <span className="text-xs text-muted-foreground">
              {projects.length} total
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <CardContent className="space-y-3 pt-4">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <CardTitle className="text-base font-semibold">
                  No projects yet
                </CardTitle>
                <CardDescription className="text-xs max-w-sm mx-auto">
                  Create a project to set up Kanban boards, organize tasks, and track
                  progress with your team.
                </CardDescription>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="hover:border-primary/50 transition-colors flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">
                        {project.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setProjectToDelete(project)}
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {project.description ? (
                      <CardDescription className="text-xs line-clamp-2">
                        {project.description}
                      </CardDescription>
                    ) : (
                      <CardDescription className="text-xs italic text-muted-foreground/60">
                        No description provided
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 text-muted-foreground/80">
                      <Clock className="h-3 w-3" />
                      <span>
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex items-center justify-between border-t border-border/50 py-3">
                    <Link
                      href={`/workspaces/${params.workspaceId}/projects/${project.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Project Details
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      asChild
                    >
                      <Link
                        href={`/workspaces/${params.workspaceId}/projects/${project.id}/board`}
                      >
                        <Layers className="mr-1.5 h-3.5 w-3.5" />
                        Open Board
                        <ArrowRight className="ml-1.5 h-3 w-3" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription className="text-xs">
                A project includes an ordered Kanban board with Backlog, To Do, In
                Progress, Review, and Done stages.
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
                <Label htmlFor="proj-name">Project name</Label>
                <Input
                  id="proj-name"
                  placeholder="e.g. Next.js App Router Core"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  maxLength={120}
                  required
                  disabled={createLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-desc">Description (optional)</Label>
                <textarea
                  id="proj-desc"
                  rows={3}
                  placeholder="Goals and requirements for this board..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  maxLength={2000}
                  disabled={createLoading}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={createLoading}>
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete{" "}
              <strong>{projectToDelete?.name}</strong>? This action cascades and
              permanently removes all associated Kanban columns and tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProjectToDelete(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteProject}
              isLoading={deleteLoading}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
