"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, PlusCircle, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceView } from "@/types/api";

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string;
  workspaces?: WorkspaceView[];
  onCreateWorkspace?: () => void;
}

export function WorkspaceSwitcher({
  currentWorkspaceId,
  workspaces = [],
  onCreateWorkspace,
}: WorkspaceSwitcherProps) {
  const activeWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
        <div className="flex items-center gap-2.5 truncate">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
            {activeWorkspace ? (
              activeWorkspace.name.substring(0, 2).toUpperCase()
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          <div className="truncate">
            <p className="truncate font-medium text-xs text-foreground">
              {activeWorkspace ? activeWorkspace.name : "Select Workspace"}
            </p>
            {activeWorkspace && (
              <p className="truncate text-[10px] text-muted-foreground tracking-wider">
                Workspace
              </p>
            )}
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem key={ws.id} asChild>
            <Link
              href={`/workspaces/${ws.id}`}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="truncate text-xs font-medium">{ws.name}</span>
              {activeWorkspace?.id === ws.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
        {workspaces.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No workspaces found
          </div>
        )}
        <DropdownMenuSeparator />
        {onCreateWorkspace ? (
          <DropdownMenuItem
            onClick={onCreateWorkspace}
            className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Workspace</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard?create=workspace"
              className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Workspace</span>
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
