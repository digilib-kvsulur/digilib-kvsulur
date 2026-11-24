import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SkeletonGrid({ count = 6, className = "grid grid-cols-2 gap-3" }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-3">
          <div className="mb-3 aspect-[3/4] rounded-xl bg-muted" />
          <div className="mb-2 h-3 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center">
      <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 text-base font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-secondary-text">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-4 rounded-xl" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Could not load this page",
  description = "Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-card px-4 py-12 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
      <h3 className="mt-3 text-base font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-secondary-text">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4 rounded-xl" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}
