"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KineticLogo } from "@/components/ui/kinetic-logo";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      router.replace(redirectUrl);
    }
  }, [user, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.replace(redirectUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Invalid email or password. Please check your credentials.");
        } else if (err.fieldErrors && err.fieldErrors.length > 0) {
          const mapped: Record<string, string> = {};
          err.fieldErrors.forEach((fe) => {
            mapped[fe.field] = fe.message;
          });
          setFieldErrors(mapped);
          setError("Please correct the errors below.");
        } else {
          setError(err.message || "Failed to sign in. Please try again.");
        }
      } else {
        setError("Network error. Could not reach Kinetic server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background shadow-xs group-hover:scale-105 transition-transform">
              <KineticLogo className="h-4 w-4 text-background" size={16} />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">
              Kinetic
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            Move work forward, together.
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-xs">
              Enter your email and password to access your workspaces.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                    error={Boolean(fieldErrors.email)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    error={Boolean(fieldErrors.password)}
                    className="pl-9 pr-9 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button type="submit" className="w-full h-9 text-xs font-medium" isLoading={loading}>
                Sign In
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  Create an account
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Security Note */}
        <p className="text-center text-[11px] text-muted-foreground">
          Secured with HttpOnly server sessions and CSRF token protection.
        </p>
      </div>
    </div>
  );
}
