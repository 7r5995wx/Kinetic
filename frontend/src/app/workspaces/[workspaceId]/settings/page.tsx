"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Trash2,
  AlertTriangle,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { workspaceApi, ApiError } from "@/lib/api/client";
import { WorkspaceMemberView, WorkspaceRole, WorkspaceView } from "@/types/api";

export default function WorkspaceSettingsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const [workspace, setWorkspace] = React.useState<WorkspaceView | null>(null);
  const [members, setMembers] = React.useState<WorkspaceMemberView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Workspace Rename state
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [nameLoading, setNameLoading] = React.useState(false);

  // Add Member Dialog state
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [memberEmail, setMemberEmail] = React.useState("");
  const [memberRole, setMemberRole] = React.useState<WorkspaceRole>("MEMBER");
  const [addLoading, setAddLoading] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  // Remove Member Dialog state
  const [memberToRemove, setMemberToRemove] = React.useState<WorkspaceMemberView | null>(null);
  const [removeLoading, setRemoveLoading] = React.useState(false);

  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ws, mems] = await Promise.all([
        workspaceApi.get(params.workspaceId),
        workspaceApi.members(params.workspaceId),
      ]);
      setWorkspace(ws);
      setNewName(ws.name);
      setMembers(mems);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load workspace settings.");
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

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === workspace?.name) {
      setIsEditingName(false);
      return;
    }

    setNameLoading(true);
    try {
      const updated = await workspaceApi.update(params.workspaceId, {
        name: newName.trim(),
      });
      setWorkspace(updated);
      setIsEditingName(false);
      toast({
        title: "Workspace renamed",
        description: `Name updated to "${updated.name}".`,
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
      setNameLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    setAddLoading(true);
    setAddError(null);
    try {
      const added = await workspaceApi.addMember(params.workspaceId, {
        email: memberEmail.trim(),
        role: memberRole,
      });
      setMembers((prev) => {
        const existingIndex = prev.findIndex((m) => m.userId === added.userId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = added;
          return updated;
        }
        return [...prev, added];
      });
      setMemberEmail("");
      setAddDialogOpen(false);
      toast({
        title: "Member added",
        description: `User is now a ${added.role} in this workspace.`,
        type: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setAddError(
            "User account with this email does not exist. The user must register first."
          );
        } else {
          setAddError(err.message || "Failed to add member.");
        }
      } else {
        setAddError("Network error. Could not add member.");
      }
    } finally {
      setAddLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: WorkspaceRole) => {
    try {
      const updated = await workspaceApi.changeMemberRole(
        params.workspaceId,
        userId,
        newRole
      );
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: updated.role } : m))
      );
      toast({
        title: "Role updated",
        description: `Member role changed to ${newRole}.`,
        type: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Role change rejected",
          description: err.message,
          type: "error",
        });
      }
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setRemoveLoading(true);
    try {
      await workspaceApi.removeMember(params.workspaceId, memberToRemove.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== memberToRemove.userId));
      toast({
        title: "Member removed",
        description: "User membership was revoked.",
        type: "info",
      });
      setMemberToRemove(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Removal rejected",
          description: err.message,
          type: "error",
        });
      }
    } finally {
      setRemoveLoading(false);
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        {
          label: workspace?.name || "Workspace",
          href: `/workspaces/${params.workspaceId}`,
        },
        { label: "Settings & Members" },
      ]}
      currentWorkspaceId={params.workspaceId}
    >
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Workspace Settings & Members
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure workspace settings and manage team membership access.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              aria-label="Refresh settings"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add Member
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

        {/* Sole Owner Protection Warning Alert */}
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">
            Sole Owner Safeguard Active
          </AlertTitle>
          <AlertDescription className="text-xs">
            Kinetic strictly enforces that every workspace retains at least one OWNER.
            Removing or demoting the final owner is rejected by the backend with{" "}
            <code>409 VERSION_CONFLICT</code>.
          </AlertDescription>
        </Alert>

        {/* Workspace Name & Properties Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Workspace Properties
            </CardTitle>
            <CardDescription className="text-xs">
              General details for this collaborative workspace boundary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingName ? (
              <form
                onSubmit={handleUpdateName}
                className="flex items-center gap-2 max-w-md"
              >
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={100}
                  required
                  disabled={nameLoading}
                  className="text-sm"
                  autoFocus
                />
                <Button type="submit" size="sm" isLoading={nameLoading}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingName(false)}
                  disabled={nameLoading}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-between max-w-md">
                <div>
                  <p className="text-xs text-muted-foreground">Workspace Name</p>
                  <div className="font-medium text-sm text-foreground">
                    {workspace?.name || <Skeleton className="h-4 w-32 mt-1" />}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                  className="h-8 text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Rename
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-1">
              Workspace ID:{" "}
              <code className="font-mono text-[11px] text-foreground">
                {params.workspaceId}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Members Management Table Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Team Members
                </CardTitle>
                <CardDescription className="text-xs">
                  Users authorized to access projects, Kanban boards, and tasks.
                </CardDescription>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {members.length} member{members.length === 1 ? "" : "s"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-y bg-muted/40 text-muted-foreground font-medium">
                    <tr>
                      <th className="px-4 py-2.5">User ID</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {members.map((m) => (
                      <tr
                        key={m.userId}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {m.userId}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={m.role}
                            onValueChange={(val) =>
                              handleChangeRole(m.userId, val as WorkspaceRole)
                            }
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">MEMBER</SelectItem>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                              <SelectItem value="OWNER">OWNER</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setMemberToRemove(m)}
                            aria-label={`Remove user ${m.userId}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          No members loaded for this workspace.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Member Modal Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddMember}>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription className="text-xs">
                Add an existing registered user to this workspace by email address.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {addError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    {addError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="mem-email">User email</Label>
                <Input
                  id="mem-email"
                  type="email"
                  placeholder="collaborator@company.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                  disabled={addLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mem-role">Workspace role</Label>
                <Select
                  value={memberRole}
                  onValueChange={(val) => setMemberRole(val as WorkspaceRole)}
                >
                  <SelectTrigger id="mem-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">MEMBER (Standard Access)</SelectItem>
                    <SelectItem value="ADMIN">ADMIN (Manage Projects & Columns)</SelectItem>
                    <SelectItem value="OWNER">OWNER (Full Workspace Control)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(false)}
                disabled={addLoading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={addLoading}>
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Membership</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove user{" "}
              <code className="font-mono">{memberToRemove?.userId}</code> from this
              workspace? If this is the sole owner, the operation will be rejected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMemberToRemove(null)}
              disabled={removeLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveMember}
              isLoading={removeLoading}
            >
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
