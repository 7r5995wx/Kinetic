import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KineticLogo } from "@/components/ui/kinetic-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-4 max-w-md">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-foreground text-background shadow-xs">
          <KineticLogo className="h-6 w-6 text-background" size={24} />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          404: Page Not Found
        </h1>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          The requested workspace, board, or resource does not exist or you do not have permission to view it.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Return Home
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard">
              <Home className="mr-1.5 h-3.5 w-3.5" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
