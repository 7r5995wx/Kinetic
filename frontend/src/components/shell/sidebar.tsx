"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
  Activity,
  Layers,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";
import { WorkspaceView } from "@/types/api";

interface SidebarProps {
  currentWorkspaceId?: string;
  workspaces?: WorkspaceView[];
  onCloseMobileMenu?: () => void;
  onCreateWorkspace?: () => void;
  className?: string;
}

export function Sidebar({
  currentWorkspaceId,
  workspaces = [],
  onCloseMobileMenu,
  onCreateWorkspace,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const currentPath = pathname || "";

  const activeWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];
  const activeWorkspaceId = activeWorkspace?.id;

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: currentPath === "/dashboard",
      show: true,
    },
    {
      name: "Projects",
      href: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}` : "/dashboard",
      icon: FolderKanban,
      current:
        activeWorkspaceId &&
        currentPath.startsWith(`/workspaces/${activeWorkspaceId}`) &&
        !currentPath.includes("/settings") &&
        !currentPath.includes("/board"),
      show: Boolean(activeWorkspaceId),
    },
    {
      name: "Members & Access",
      href: activeWorkspaceId
        ? `/workspaces/${activeWorkspaceId}/settings`
        : "/dashboard",
      icon: Users,
      current: currentPath.includes("/settings"),
      show: Boolean(activeWorkspaceId),
    },
  ];

  return (
    <aside
      className={cn(
        "flex h-full flex-col justify-between border-r bg-card/60 backdrop-blur-md px-3 py-4",
        className
      )}
    >
      <div className="space-y-4">
        {/* Kinetic Header & Logo */}
        <div className="flex items-center justify-between px-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-foreground block">
                Kinetic
              </span>
              <span className="text-[10px] text-muted-foreground block -mt-0.5">
                Move work forward, together.
              </span>
            </div>
          </Link>

          {onCloseMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-7 w-7 text-muted-foreground"
              onClick={onCloseMobileMenu}
              aria-label="Close mobile navigation"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Workspace Switcher */}
        <div className="pt-1">
          <WorkspaceSwitcher
            currentWorkspaceId={activeWorkspaceId}
            workspaces={workspaces}
            onCreateWorkspace={onCreateWorkspace}
          />
        </div>

        {/* Primary Navigation Links */}
        <nav aria-label="Main Navigation" className="space-y-1 pt-2">
          {navigation
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onCloseMobileMenu}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                    item.current
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      item.current
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Footer info */}
      <div className="border-t border-border/60 pt-3 px-2 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          <span className="truncate">Connected to Kinetic API</span>
        </div>
        <div className="text-[10px] text-muted-foreground/60 flex items-center justify-between">
          <span>v1.0.0</span>
          <span>Spring Boot Session Auth</span>
        </div>
      </div>
    </aside>
  );
}
