"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Layers,
  Users2,
  Lock,
  Workflow,
  CheckCircle2,
  Menu,
  X,
  Database,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KineticLogo, KineticWordmark } from "@/components/ui/kinetic-logo";
import { ProductShowcase } from "@/components/marketing/product-showcase";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-foreground">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8 max-w-6xl mx-auto">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            aria-label="Kinetic Home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background shadow-xs">
              <KineticLogo className="h-4 w-4 text-background" size={16} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-base tracking-tight text-foreground">
                Kinetic
              </span>
              <span className="hidden sm:inline-block text-xs text-muted-foreground border-l border-border pl-2">
                Move work forward, together.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <Link
              href="#showcase"
              className="hover:text-foreground transition-colors"
            >
              Product
            </Link>
            <Link
              href="#capabilities"
              className="hover:text-foreground transition-colors"
            >
              Capabilities
            </Link>
            <Link
              href="#architecture"
              className="hover:text-foreground transition-colors"
            >
              Architecture
            </Link>
          </nav>

          {/* Desktop Auth CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-2 text-sm font-medium">
              <Link
                href="#showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                Product
              </Link>
              <Link
                href="#capabilities"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                Capabilities
              </Link>
              <Link
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                Architecture
              </Link>
            </nav>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Button variant="outline" size="sm" className="w-full justify-center" asChild>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button size="sm" className="w-full justify-center" asChild>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24 sm:pb-16 lg:pt-32 lg:pb-20">
        <div className="container px-4 sm:px-8 text-center max-w-4xl mx-auto">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/80 px-3.5 py-1 text-xs font-medium text-foreground mb-6 shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            <span>Move work forward, together.</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.1] sm:leading-[1.1]">
            Good work moves forward together.
          </h1>

          {/* Supporting Copy */}
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Kinetic brings your team&apos;s work into focus, helping you stay organized, collaborate clearly, and keep projects moving.
          </p>

          {/* Primary and Secondary Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="w-full sm:w-auto px-6 h-11 text-sm font-medium shadow-sm" asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-6 h-11 text-sm font-medium border-border/90 bg-card hover:bg-secondary/60 text-foreground"
              asChild
            >
              <Link href="#showcase">Explore Kinetic</Link>
            </Button>
          </div>

          {/* Trust & Engineering Pillars */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span>Real-Time STOMP Over WebSocket</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span>Optimistic Concurrency Control</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span>Role-Based Multi-Tenancy</span>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Product Showcase (Representative Section) */}
      <ProductShowcase />

      {/* Capabilities Section */}
      <section id="capabilities" className="border-t border-border/80 bg-secondary/20 py-20">
        <div className="container px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Engineered for precision and team clarity.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Every feature in Kinetic is designed around explicit data ownership, concurrency safety, and fast daily workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Structured Workspaces
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Partition your projects cleanly into dedicated workspaces. Manage memberships, transfer ownership safely, and prevent cross-workspace tampering at the service layer.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Radio className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Single-Use WebSocket Tickets
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                WebSockets connect directly to the real-time broker using cryptographically random, short-lived single-use tickets acquired over secure same-origin sessions.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                PostgreSQL Transactional Safety
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All column reorders and task moves execute within single database transactions. Optimistic locking versions protect against concurrent overwrite conflicts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="border-t border-border/80 py-20 bg-background">
        <div className="container px-4 sm:px-8 max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Bring your next project into focus.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Create a workspace, invite your team, and organize work with real-time collaboration that respects your workflow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" className="w-full sm:w-auto px-8" asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/80 py-10 bg-secondary/30">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-6 px-4 sm:px-8 max-w-6xl mx-auto text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
              <KineticLogo className="h-3 w-3 text-background" size={12} />
            </div>
            <span className="font-semibold text-foreground">Kinetic</span>
            <span className="text-muted-foreground">Move work forward, together.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="#showcase" className="hover:text-foreground transition-colors">
              Product
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Get Started
            </Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
