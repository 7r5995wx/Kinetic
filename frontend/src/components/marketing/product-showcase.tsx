"use client";

import * as React from "react";
import {
  Calendar,
  Layers,
  Shield,
  Activity,
  Plus,
  ArrowRight,
  CheckCircle2,
  Lock,
  GitBranch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ShowcaseTask {
  id: string;
  code: string;
  title: string;
  description: string;
  column: "backlog" | "in-progress" | "review" | "done";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  version: number;
  dueDate: string;
  assignee: { name: string; initials: string; color: string };
}

const SAMPLE_TASKS: ShowcaseTask[] = [
  {
    id: "task-1",
    code: "TSK-108",
    title: "Implement single-use WebSocket ticket redemption",
    description: "Validate and atomically consume tickets in channel interceptor to eliminate replay risks.",
    column: "backlog",
    priority: "HIGH",
    version: 4,
    dueDate: "Oct 24",
    assignee: { name: "Vishal K.", initials: "VK", color: "bg-blue-600 text-white" },
  },
  {
    id: "task-2",
    code: "TSK-112",
    title: "Configure HikariCP connection limits for Neon",
    description: "Cap active connections at 5 with minimum idle 1 to respect serverless compute limits.",
    column: "backlog",
    priority: "MEDIUM",
    version: 1,
    dueDate: "Oct 28",
    assignee: { name: "Sarah R.", initials: "SR", color: "bg-amber-600 text-white" },
  },
  {
    id: "task-3",
    code: "TSK-94",
    title: "Optimistic concurrency conflict resolution",
    description: "Enforce strict version checking. Return HTTP 409 conflict payload on stale updates.",
    column: "in-progress",
    priority: "URGENT",
    version: 9,
    dueDate: "Today",
    assignee: { name: "Vishal K.", initials: "VK", color: "bg-blue-600 text-white" },
  },
  {
    id: "task-4",
    code: "TSK-99",
    title: "PostgreSQL 17 schema migrations with Flyway",
    description: "Run V1 and V2 migrations prior to JPA schema validation on production startup.",
    column: "in-progress",
    priority: "HIGH",
    version: 3,
    dueDate: "Oct 22",
    assignee: { name: "Alex L.", initials: "AL", color: "bg-emerald-600 text-white" },
  },
  {
    id: "task-5",
    code: "TSK-87",
    title: "Same-origin Next.js proxy rewrites for cookies",
    description: "Establish same-origin boundary for REST requests to support SameSite=Lax session cookies.",
    column: "review",
    priority: "MEDIUM",
    version: 5,
    dueDate: "Tomorrow",
    assignee: { name: "Sarah R.", initials: "SR", color: "bg-amber-600 text-white" },
  },
  {
    id: "task-6",
    code: "TSK-72",
    title: "Multi-tenant workspace isolation and role hierarchy",
    description: "Verify workspace membership at service layer for every protected query and mutation.",
    column: "done",
    priority: "HIGH",
    version: 12,
    dueDate: "Completed",
    assignee: { name: "Vishal K.", initials: "VK", color: "bg-blue-600 text-white" },
  },
  {
    id: "task-7",
    code: "TSK-65",
    title: "Spring Security session fixation and CSRF binding",
    description: "Rotate session ID on login and enforce X-CSRF-TOKEN verification on unsafe methods.",
    column: "done",
    priority: "LOW",
    version: 7,
    dueDate: "Completed",
    assignee: { name: "Alex L.", initials: "AL", color: "bg-emerald-600 text-white" },
  },
];

const COLUMNS = [
  { id: "backlog", title: "Backlog", color: "border-muted-foreground/30" },
  { id: "in-progress", title: "In Progress", color: "border-primary/50" },
  { id: "review", title: "In Review", color: "border-amber-500/50" },
  { id: "done", title: "Done", color: "border-emerald-500/50" },
] as const;

export function ProductShowcase() {
  const [activeFilter, setActiveFilter] = React.useState<"ALL" | "URGENT" | "IN_PROGRESS">("ALL");
  const [activeMobileColumn, setActiveMobileColumn] = React.useState<string>("in-progress");

  const filteredTasks = React.useMemo(() => {
    if (activeFilter === "URGENT") {
      return SAMPLE_TASKS.filter((t) => t.priority === "URGENT" || t.priority === "HIGH");
    }
    if (activeFilter === "IN_PROGRESS") {
      return SAMPLE_TASKS.filter((t) => t.column === "in-progress");
    }
    return SAMPLE_TASKS;
  }, [activeFilter]);

  const getPriorityClasses = (priority: ShowcaseTask["priority"]) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
      case "LOW":
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";
    }
  };

  return (
    <section id="showcase" className="relative w-full py-12 sm:py-16">
      <div className="container max-w-6xl px-4 sm:px-8 mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/60 px-3 py-1 text-xs font-medium text-foreground mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Real Interface Preview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
            A workspace engineered for clarity.
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Authentic Kanban boards with optimistic locking, strict workspace security, and real-time STOMP state propagation.
          </p>
        </div>

        {/* Board Window Container */}
        <div className="relative rounded-xl border border-border/80 bg-card shadow-lg shadow-black/[0.03] overflow-hidden">
          {/* Mock Browser/App Chrome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-3 gap-3">
            {/* Left: Window Dots & Project Scope */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <div className="h-4 w-px bg-border/80" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Core Engineering
                </span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-xs text-muted-foreground">
                  Sprint 42
                </span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground font-medium">
                  v1.0
                </span>
              </div>
            </div>

            {/* Right: Live Connection Indicator & Filters */}
            <div className="flex items-center gap-2.5 text-xs">
              {/* Filter Pills */}
              <div className="hidden sm:flex items-center rounded-lg border border-border/80 bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeFilter === "ALL"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({SAMPLE_TASKS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("URGENT")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeFilter === "URGENT"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Urgent & High
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("IN_PROGRESS")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeFilter === "IN_PROGRESS"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  In Progress
                </button>
              </div>

              {/* Real-time Connection Status Indicator */}
              <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-mono text-[10px]">STOMP LIVE</span>
              </div>
            </div>
          </div>

          {/* Mobile Column Switcher (Visible only on small screens) */}
          <div className="flex sm:hidden overflow-x-auto border-b border-border/70 bg-muted/20 px-3 py-2 gap-1.5">
            {COLUMNS.map((col) => {
              const count = filteredTasks.filter((t) => t.column === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setActiveMobileColumn(col.id)}
                  className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    activeMobileColumn === col.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground bg-background border border-border"
                  }`}
                >
                  {col.title} ({count})
                </button>
              );
            })}
          </div>

          {/* Kanban Board Grid */}
          <div className="p-4 sm:p-6 bg-secondary/30">
            {/* Desktop 4-Column Grid / Responsive Mobile View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {COLUMNS.map((column) => {
                const columnTasks = filteredTasks.filter((t) => t.column === column.id);
                const isMobileHidden = activeMobileColumn !== column.id;

                return (
                  <div
                    key={column.id}
                    className={`flex flex-col gap-3 rounded-lg border border-border/60 bg-background/80 p-3 sm:flex ${
                      isMobileHidden ? "hidden sm:flex" : "flex"
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground tracking-tight">
                          {column.title}
                        </span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground">
                          {columnTasks.length}
                        </span>
                      </div>
                      <span className="text-muted-foreground/50 text-xs">•••</span>
                    </div>

                    {/* Task Cards */}
                    <div className="flex flex-col gap-2.5">
                      {columnTasks.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border/80 p-4 text-center text-xs text-muted-foreground">
                          No tasks in this column
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task.id}
                            className="group relative rounded-lg border border-border/80 bg-card p-3 shadow-2xs hover:border-primary/40 hover:shadow-sm transition-all text-left"
                          >
                            {/* Card Top: Code, Version & Priority */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {task.code}
                                </span>
                                <span className="rounded bg-secondary px-1 text-[9px] font-mono text-muted-foreground font-medium" title="Optimistic locking version">
                                  v{task.version}
                                </span>
                              </div>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold border ${getPriorityClasses(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                              {task.title}
                            </h3>

                            {/* Description preview */}
                            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>

                            {/* Card Footer: Due Date & Assignee */}
                            <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {task.dueDate}
                              </span>
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${task.assignee.color}`}
                                title={task.assignee.name}
                              >
                                {task.assignee.initials}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Window Status Footer Callout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Optimistic Concurrency Control with automatic version incrementing</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>PostgreSQL 17 Transactional Boundary</span>
            </div>
          </div>
        </div>

        {/* Feature Highlight Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground mb-3 font-semibold text-xs">
              01
            </div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Real-Time Kanban Boards
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Configurable columns, dense contiguous positioning, and accessible keyboard reordering powered by STOMP event dispatching.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground mb-3 font-semibold text-xs">
              02
            </div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Role-Based Workspaces
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Granular multi-tenancy with Owner, Admin, and Member roles. Sole-owner safeguards prevent accidental workspace lockout.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground mb-3 font-semibold text-xs">
              03
            </div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Strict Concurrency & Audit
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Mutations check optimistic lock versions. Concurrent edit conflicts return safe HTTP 409 responses with clean recovery prompts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
