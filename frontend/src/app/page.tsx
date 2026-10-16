import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Users2,
  Lock,
  Workflow,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">
                Kinetic
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-muted-foreground border-l pl-2">
                Move work forward, together.
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
        <div className="container px-4 sm:px-8 text-center max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Collaborative Project Management Monolith
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight sm:leading-tight">
            Move work forward,{" "}
            <span className="text-primary underline decoration-primary/30 underline-offset-8">
              together.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Kinetic combines intuitive Kanban boards, enterprise-grade multi-tenant
            workspaces, fine-grained role permissions, and concurrency-safe task
            management into a unified collaborative platform.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/register">
                Start Free Workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              asChild
            >
              <Link href="/dashboard">View Demo Dashboard</Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Session-Based Authentication</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Optimistic Concurrency Control</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Full Multi-Tenant Isolation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="border-t bg-muted/20 py-20">
        <div className="container px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for speed, precision, and team clarity
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Engineered with Next.js App Router and Spring Boot on Java 21,
              ensuring strict data integrity and fluid interaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                  <Layers className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Real-Time Kanban Boards</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Organize projects with configurable columns, drag-and-drop task
                reordering, dense contiguous positioning, and accessible keyboard
                movement.
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                  <Users2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Role-Based Workspaces</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Granular multi-tenancy with OWNER, ADMIN, and MEMBER roles. Sole-owner
                safeguards prevent accidental workspace abandonment or lockout.
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Strict Concurrency & Audit</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Task modifications require optimistic lock versions. Concurrent edit
                conflicts return safe 409 status with automated reload prompts.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-8 bg-background">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Kinetic</span>
            <span>— Move work forward, together.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link
              href="/register"
              className="hover:text-foreground transition-colors"
            >
              Register
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
