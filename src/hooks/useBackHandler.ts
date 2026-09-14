import { useEffect, useRef } from 'react';
import { backNavigation } from '@/lib/backNavigation';

interface UseBackHandlerOptions {
  enabled?: boolean;
  priority?: number;
  onBack: () => boolean | void;
  pushHistoryState?: boolean;
  stateName?: string;
}

export function useBackHandler({
  enabled = true,
  priority = 10,
  onBack,
  pushHistoryState = true,
  stateName = 'overlay',
}: UseBackHandlerOptions) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Push dummy history entry on mobile browsers/PWAs so device back triggers popstate
    if (pushHistoryState && !pushedRef.current) {
      try {
        window.history.pushState({ dlms_overlay: stateName, time: Date.now() }, '');
        pushedRef.current = true;
      } catch (e) {
        // ignore
      }
    }

    const unregister = backNavigation.register(() => {
      pushedRef.current = false;
      return onBackRef.current();
    }, priority);

    return () => {
      unregister();
      if (pushedRef.current) {
        pushedRef.current = false;
        if (window.history.state?.dlms_overlay === stateName) {
          window.history.back();
        }
      }
    };
  }, [enabled, priority, pushHistoryState, stateName]);
}
