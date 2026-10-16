"use client";

import * as React from "react";
import { Menu, Moon, Sun, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, BreadcrumbItem } from "@/components/shell/breadcrumbs";
import { UserMenu } from "@/components/shell/user-menu";
import { useTheme } from "@/components/theme-provider";
import { UserResponse } from "@/types/api";

interface TopNavProps {
  breadcrumbs?: BreadcrumbItem[];
  user?: UserResponse | null;
  onOpenMobileMenu?: () => void;
}

export function TopNav({
  breadcrumbs,
  user,
  onOpenMobileMenu,
}: TopNavProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-muted-foreground"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} />
        ) : (
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Kinetic
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Scoped search bar shortcut preview */}
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-input bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
          <Search className="h-3.5 w-3.5" />
          <span>Search tasks...</span>
          <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* User profile dropdown */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
