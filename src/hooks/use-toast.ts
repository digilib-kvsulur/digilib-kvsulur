/**
 * use-toast.ts
 *
 * Thin shim that delegates all toasts to `sonner` so that every component
 * using `useToast()` / `toast()` renders through the single Sonner <Toaster>
 * (top-right, with close button and swipe-up dismissal) – eliminating the
 * duplicate side-swipe Radix toast that used to appear alongside it.
 */
import type React from "react";
import {
  toast as sonnerToast,
  ExternalToast,
} from "sonner";

// -------------------------------------------------------------------
// Compat types (matches the shape callers expect from use-toast)
// -------------------------------------------------------------------
export interface ToastProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// -------------------------------------------------------------------
// toast() – drop-in replacement for the old Radix toast() call
// -------------------------------------------------------------------
export function toast(props: ToastProps) {
  const opts: ExternalToast = {
    description: props.description as string | undefined,
    duration: props.duration ?? 5000,
    action: props.action
      ? { label: props.action.label, onClick: props.action.onClick }
      : undefined,
    closeButton: true,
  };

  if (props.variant === "destructive") {
    sonnerToast.error(props.title as string, opts);
  } else {
    sonnerToast(props.title as string, opts);
  }

  // Return a dismiss fn so callers that do `const { dismiss } = toast(...)` still work
  return { dismiss: () => {}, id: "", update: () => {} };
}

// Convenience variants that match patterns used across the codebase
toast.success = (title: string, opts?: ExternalToast) =>
  sonnerToast.success(title, { closeButton: true, ...opts });

toast.error = (title: string, opts?: ExternalToast) =>
  sonnerToast.error(title, { closeButton: true, ...opts });

toast.info = (title: string, opts?: ExternalToast) =>
  sonnerToast.info(title, { closeButton: true, ...opts });

toast.warning = (title: string, opts?: ExternalToast) =>
  sonnerToast.warning(title, { closeButton: true, ...opts });

// -------------------------------------------------------------------
// useToast() hook – returns toast + a no-op dismiss helper
// -------------------------------------------------------------------
export function useToast() {
  return {
    toast,
    dismiss: (_id?: string) => {},
    toasts: [] as any[],
  };
}

export default useToast;
