import Link from "next/link";
import { Sparkles, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-4 max-w-md">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Sparkles className="h-6 w-6" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          404 — Page Not Found
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed">
          The requested workspace, board, or resource does not exist or you do not have permission to view it.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Return Home
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard">
              <Home className="mr-1.5 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
