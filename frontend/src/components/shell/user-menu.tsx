"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";
import { UserResponse } from "@/types/api";

interface UserMenuProps {
  user?: UserResponse | null;
}

export function UserMenu({ user: propUser }: UserMenuProps = {}) {
  const { user: authUser, logout } = useAuth();
  const user = propUser !== undefined ? propUser : authUser;

  const displayName = user?.displayName || "Guest";
  const email = user?.email || "anonymous@kinetic.local";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Open user menu"
      >
        <Avatar className="h-8 w-8 transition-transform hover:scale-105">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-semibold leading-none">{displayName}</p>
            <p className="text-[11px] leading-none text-muted-foreground truncate">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 cursor-pointer text-xs"
          >
            <User className="h-4 w-4" />
            <span>Profile & Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="flex items-center gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
