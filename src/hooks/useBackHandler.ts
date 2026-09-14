/**
 * useBackHandler.ts
 *
 * React hook to register a back-navigation handler for components,
 * overlays, dialogs, drawers, and views.
 *
 * - On Native Android (Capacitor): Registers into BackNavigationManager priority stack.
 *   Hardware back button calls onBack() directly without touching browser history.
 *
 * - On Web / PWA: Pushes a lightweight history state for overlays when pushHistoryState is true.
 *   When the browser back button or edge swipe occurs, popstate runs onBack().
 *   When the component closes programmatically (e.g. clicking the 'X' button),
 *   it safely pops the dummy state so history stays completely clean.
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

    // Only push dummy state on Web/PWA for overlays, NEVER on native Capacitor
    const shouldPush = pushHistoryState && !backNavigation.isNative;

    if (shouldPush && !pushedRef.current) {
      try {
        window.history.pushState({ dlms_overlay: true, stateName, time: Date.now() }, '');
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
        // If unmount was NOT from a popstate event (i.e. user clicked close button on screen),
        // cleanly pop the dummy state that this hook pushed.
        if (!backNavigation.isPopping) {
          backNavigation.popDummyState();
        }
      }
    };
  }, [enabled, priority, pushHistoryState, stateName]);
}
