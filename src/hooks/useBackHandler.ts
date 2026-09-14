/**
 * useBackHandler.ts
 *
 * Hook to register a back-navigation handler for overlays (drawers, modals,
 * reel viewers, etc.).
 *
 * Behaviour:
 *  - When `enabled` becomes true  → register handler + push ONE sentinel history
 *    entry (so browser/PWA swipe-back triggers popstate for our overlay).
 *  - When back is pressed         → handler runs, sentinel is consumed by the popstate
 *    listener in BackNavigationManager, no extra cleanup needed.
 *  - When `enabled` becomes false → unregister handler + call popSentinel() to
 *    clean up the dummy entry if the overlay was closed programmatically
 *    (e.g. user tapped the ✕ button instead of pressing device back).
 *
 * IMPORTANT: This hook does NOT push to window.history directly — the manager
 * does that via pushSentinel(). React Router's own history is never touched.
 */

import { useEffect, useRef } from 'react';
import { backNavigation } from '@/lib/backNavigation';

interface UseBackHandlerOptions {
  /** Only register when true (e.g. when a drawer is open). */
  enabled?: boolean;
  /** Higher number = runs first. Default 10. */
  priority?: number;
  /**
   * Called when device back button / browser back gesture fires.
   * Return `true` (or void) to consume the event.
   * Return `false` to pass to the next handler.
   */
  onBack: () => boolean | void;
  /**
   * Label for the sentinel history state (useful for debugging).
   * Default: 'overlay'
   */
  stateName?: string;
  /**
   * Whether to push a sentinel history entry so browser/PWA gesture-back
   * fires a popstate event for this overlay.
   * Set to false for tab-history handlers on dashboards (no overlay sentinel
   * needed — Capacitor native back button is sufficient).
   * Default: true
   */
  pushHistoryState?: boolean;
}

export function useBackHandler({
  enabled = true,
  priority = 10,
  onBack,
  stateName = 'overlay',
  pushHistoryState = true,
}: UseBackHandlerOptions) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Track whether WE pushed a sentinel this render cycle
  const sentinelPushed = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Push sentinel so browser back gesture works for this overlay
    if (pushHistoryState) {
      backNavigation.pushSentinel(stateName);
      sentinelPushed.current = true;
    }

    const unregister = backNavigation.register(() => {
      return onBackRef.current();
    }, priority);

    return () => {
      unregister();
      // If overlay was closed programmatically (not via back button),
      // pop the sentinel we pushed so history stays clean.
      if (sentinelPushed.current && pushHistoryState) {
        sentinelPushed.current = false;
        backNavigation.popSentinel();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, priority, pushHistoryState, stateName]);
}
