import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled DLMS render exception caught by ErrorBoundary:", error, errorInfo);
    const msg = error?.message || String(error || "");
    if (
      msg.includes("dynamically imported module") ||
      msg.includes("Failed to fetch") ||
      msg.includes("ChunkLoadError") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("removeChild") ||
      msg.includes("insertBefore")
    ) {
      const key = "dlms_eb_chunk_reload";
      const last = parseInt(sessionStorage.getItem(key) || "0", 10);
      if (Date.now() - last > 20000) {
        sessionStorage.setItem(key, String(Date.now()));
        this.handleReload();
      }
    }
  }

  private handleReload = () => {
    const cleanup: Promise<unknown>[] = [];
    if ("serviceWorker" in navigator) {
      cleanup.push(navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((reg) => reg.unregister()))));
    }
    if ("caches" in window) {
      cleanup.push(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
    }
    void Promise.allSettled(cleanup).finally(() => window.location.reload());
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background text-foreground">
          <div className="max-w-md w-full text-center space-y-4 p-6 sm:p-8 rounded-3xl border border-border/80 bg-card shadow-2xl animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight text-foreground">Something went wrong</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A rendering glitch occurred. Don't worry — your data and progress are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-muted/60 text-left font-mono text-[11px] text-muted-foreground overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleHome}
                className="rounded-xl gap-1.5 text-xs font-semibold"
              >
                <Home className="h-4 w-4" />
                <span>Go Home</span>
              </Button>
              <Button
                size="sm"
                onClick={this.handleReload}
                className="rounded-xl gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload App</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
