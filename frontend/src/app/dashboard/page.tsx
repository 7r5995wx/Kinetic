"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Building2,
  ArrowRight,
  Shield,
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
import { workspaceApi, ApiError } from "@/lib/api/client";
import { WorkspaceView } from "@/types/api";

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create Workspace Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState("");
  const [createLoading, setCreateLoading] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const { toast } = useToast();

  const loadWorkspaces = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workspaceApi.list();
      setWorkspaces(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load workspaces from server.");
      } else {
        setError("Network error. Could not connect to Kinetic backend.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await workspaceApi.create({ name: workspaceName.trim() });
      setWorkspaces((prev) => [created, ...prev]);
      setWorkspaceName("");
      setDialogOpen(false);
      toast({
        title: "Workspace created",
        description: `Workspace "${created.name}" is now ready.`,
        type: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message || "Failed to create workspace.");
      } else {
        setCreateError("Network error. Failed to create workspace.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <AppShell
      breadcrumbs={[{ label: "Dashboard" }]}
      workspaces={workspaces}
      onCreateWorkspace={() => setDialogOpen(true)}
    >
      <div className="space-y-8">
        {/* Header section with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Workspaces
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Select or create a workspace to manage projects, Kanban boards, and team access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadWorkspaces}
              disabled={loading}
              aria-label="Refresh workspaces"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Workspace
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
                onClick={loadWorkspaces}
                className="ml-4 h-7 text-xs"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Workspaces Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Your Workspaces
            </h2>
            <span className="text-xs text-muted-foreground">
              {workspaces.length} total
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </div>
          ) : workspaces.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <CardContent className="space-y-3 pt-4">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <CardTitle className="text-base font-semibold">
                  No workspaces found
                </CardTitle>
                <CardDescription className="text-xs max-w-sm mx-auto">
                  Workspaces organize your team projects, boards, and members. Create
                  your first workspace to get started.
                </CardDescription>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Workspace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspaces.map((ws) => (
                <Card
                  key={ws.id}
                  className="hover:border-primary/50 transition-colors flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">
                        {ws.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs flex items-center gap-1.5 pt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      Created {new Date(ws.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3 text-xs text-muted-foreground">
                    <p className="font-mono text-[10px] text-muted-foreground/70">
                      ID: {ws.id}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 flex items-center justify-between border-t border-border/50 py-3">
                    <Link
                      href={`/workspaces/${ws.id}/settings`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Settings & Access
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      asChild
                    >
                      <Link href={`/workspaces/${ws.id}`}>
                        Open Workspace
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

      {/* Create Workspace Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateWorkspace}>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription className="text-xs">
                Workspaces are collaborative boundaries for projects and team members.
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
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input
                  id="ws-name"
                  placeholder="e.g. Core Engineering"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  maxLength={100}
                  required
                  disabled={createLoading}
                  autoFocus
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
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
