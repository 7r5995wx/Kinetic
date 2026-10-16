"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Runtime client error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-4 max-w-md">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Something went wrong
        </h1>

        <p className="text-xs text-muted-foreground leading-relaxed">
          An unexpected error occurred while rendering this view. Your data remains safely stored on the server.
        </p>

        {error.digest && (
          <p className="font-mono text-[10px] text-muted-foreground/60">
            Error reference: {error.digest}
          </p>
        )}

        <div className="pt-2 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Try Again
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard">
              <Home className="mr-1.5 h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
