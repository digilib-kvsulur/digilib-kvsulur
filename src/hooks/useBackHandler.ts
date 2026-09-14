/**
 * useBackHandler.ts
 *
 * React hook to register a back-navigation handler for components,
 * overlays, dialogs, drawers, and views.
 *
 * - On Native Android (Capacitor): Registers into BackNavigationManager priority stack.
 *   Hardware back button calls onBack() without touching browser history.
 *
 * - On Web / PWA: Pushes a lightweight history state when pushHistoryState is true.
 *   When the browser back button or edge swipe occurs, popstate runs onBack().
 *   When the component closes programmatically (e.g. clicking the 'X' button),
 *   it safely pops the dummy state so history stays clean.
 */

import { useEffect, useRef } from 'react';
import { backNavigation } from '@/lib/backNavigation';

interface UseBackHandlerOptions {
  /** Only register when true (e.g. when a modal/drawer is open). Default: true */
  enabled?: boolean;
  /** Higher number = runs first. Default 10. */
  priority?: number;
  /**
   * Called when device back button / browser back gesture fires.
   * Return `true` (or void) to consume the event.
   * Return `false` to pass to the next lower-priority handler.
   */
  onBack: () => boolean | void;
  /**
   * Label for the dummy history state (useful for debugging). Default: 'overlay'
   */
  stateName?: string;
  /**
   * Whether to push a history state entry on Web/PWA so browser gesture-back
   * triggers popstate. Default: true
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
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Push dummy history entry on Web/PWA so that device/gesture back triggers popstate
    // On native Capacitor, hardware backButton listener handles it directly without history pollution
    const shouldPush = pushHistoryState && !backNavigation.isNative;

    if (shouldPush && !pushedRef.current) {
      try {
        window.history.pushState({ dlms_overlay: stateName, time: Date.now() }, '');
        pushedRef.current = true;
      } catch {
        // ignore
      }
    }

    const unregister = backNavigation.register(() => {
      return onBackRef.current();
    }, priority);

    return () => {
      unregister();
      if (pushedRef.current) {
        pushedRef.current = false;
        // If this unmount was NOT caused by browser popstate (e.g. user tapped the close button on screen)
        // rather than by pressing the browser back button (which already popped history),
        // we must pop the dummy history entry we pushed to keep history clean.
        if (!backNavigation.isPopping) {
          try {
            if (window.history.state?.dlms_overlay === stateName) {
              window.history.back();
            }
          } catch {
            // ignore
          }
        }
      }
    };
  }, [enabled, priority, pushHistoryState, stateName]);
}
