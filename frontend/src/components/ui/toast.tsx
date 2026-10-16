"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "default" | "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, type = "default" }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, title, description, type };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        dismiss(id);
      }, 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col gap-2 p-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg transition-all animate-in slide-in-from-bottom-2",
              t.type === "error" && "border-destructive/40 text-destructive bg-destructive/5",
              t.type === "success" && "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5",
              t.type === "info" && "border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-500/5",
              t.type === "default" && "border-border text-foreground"
            )}
          >
            {t.type === "error" && <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />}
            {t.type === "success" && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />}
            {t.type === "info" && <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />}
            
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold leading-none">{t.title}</p>
              {t.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
              )}
            </div>

            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
