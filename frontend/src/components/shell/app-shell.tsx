"use client";

import * as React from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { BreadcrumbItem } from "@/components/shell/breadcrumbs";
import { WorkspaceView } from "@/types/api";
import { workspaceApi } from "@/lib/api/client";
import { ProtectedRoute } from "@/lib/auth/auth-context";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  currentWorkspaceId?: string;
  workspaces?: WorkspaceView[];
  onCreateWorkspace?: () => void;
  skipAuth?: boolean;
}

export function AppShell({
  children,
  breadcrumbs,
  currentWorkspaceId,
  workspaces: propWorkspaces,
  onCreateWorkspace,
  skipAuth = false,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [internalWorkspaces, setInternalWorkspaces] = React.useState<WorkspaceView[]>(
    propWorkspaces || []
  );

  React.useEffect(() => {
    if (propWorkspaces) {
      setInternalWorkspaces(propWorkspaces);
    } else {
      let isMounted = true;
      workspaceApi
        .list()
        .then((data) => {
          if (isMounted) setInternalWorkspaces(data);
        })
        .catch((err) => {
          console.warn("Could not fetch workspaces in AppShell:", err);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [propWorkspaces]);

  // Close mobile menu on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const shellContent = (
    <div className="min-h-screen bg-background">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col z-40">
        <Sidebar
          currentWorkspaceId={currentWorkspaceId}
          workspaces={internalWorkspaces}
          onCreateWorkspace={onCreateWorkspace}
        />
      </div>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-background shadow-xl z-50">
            <Sidebar
              currentWorkspaceId={currentWorkspaceId}
              workspaces={internalWorkspaces}
              onCloseMobileMenu={() => setMobileMenuOpen(false)}
              onCreateWorkspace={onCreateWorkspace}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-h-screen">
        <TopNav
          breadcrumbs={breadcrumbs}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );

  if (skipAuth) {
    return shellContent;
  }

  return <ProtectedRoute>{shellContent}</ProtectedRoute>;
}
