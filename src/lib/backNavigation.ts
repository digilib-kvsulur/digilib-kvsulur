/**
 * backNavigation.ts
 *
 * Priority-based Android back-button handler.
 *
 * Strategy:
 *  - On native Android (Capacitor): intercept the `backButton` hardware event.
 *    Walk the handler stack highest-priority first; first one that returns `true`
 *    consumes the event.  If nobody handles it we fall back to double-press-to-exit.
 *
 *  - On PWA / browser: listen for `popstate` ONLY on states we pushed ourselves
 *    (marked with `{ dlms_back: true }`). React Router pushes its own states
 *    WITHOUT this marker, so we never intercept those – keeping navbar navigation
 *    completely unaffected.
 *
 * Handlers must NOT push dummy history entries. Only the manager pushes one
 * sentinel entry per overlay so the browser back gesture fires `popstate`.
 * The sentinel is cleaned up (go-forward or pop) when the overlay closes.
 */

import { App } from '@capacitor/app';
import { toast } from 'sonner';

export type BackHandler = () => boolean | void;

interface RegisteredHandler {
  id: string;
  priority: number;
  handler: BackHandler;
}

const SENTINEL_STATE_KEY = 'dlms_back';

class BackNavigationManager {
  private handlers: RegisteredHandler[] = [];
  private isInitialized = false;
  private lastBackPressTime = 0;
  /** Number of sentinel entries we have pushed into history (for overlays) */
  private sentinelDepth = 0;

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // ── 1. Capacitor native Android back button ──────────────────────────
    try {
      App.addListener('backButton', (event) => {
        const handled = this.handleBack();
        if (!handled) {
          if (event.canGoBack) {
            window.history.back();
          } else {
            this.handleAppExit();
          }
        }
      });
    } catch {
      // Not available in browser / Electron
    }

    // ── 2. PWA / browser popstate ────────────────────────────────────────
    // We ONLY handle popstate events that match a sentinel we pushed.
    // React Router states do NOT have `dlms_back: true`.
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state[SENTINEL_STATE_KEY]) {
        // This is OUR sentinel being popped by browser/gesture back.
        this.sentinelDepth = Math.max(0, this.sentinelDepth - 1);
        const handled = this.handleBack();
        if (!handled) {
          // No handler claimed it; let it continue naturally
        }
      }
      // If it's a React Router state, we do NOTHING — router handles it.
    });
  }

  /** Push a sentinel history entry for a new overlay. Call on overlay open. */
  public pushSentinel(name: string) {
    try {
      window.history.pushState({ [SENTINEL_STATE_KEY]: true, name }, '');
      this.sentinelDepth++;
    } catch {
      // ignore
    }
  }

  /** Clean up the sentinel when an overlay closes programmatically (not via back button). */
  public popSentinel() {
    if (this.sentinelDepth > 0) {
      try {
        this.sentinelDepth--;
        window.history.back();
      } catch {
        // ignore
      }
    }
  }

  public register(handler: BackHandler, priority = 10): () => void {
    const id = Math.random().toString(36).substring(2, 9);
    this.handlers.push({ id, priority, handler });
    this.handlers.sort((a, b) => b.priority - a.priority);
    return () => {
      this.handlers = this.handlers.filter((h) => h.id !== id);
    };
  }

  public handleBack(): boolean {
    for (const item of this.handlers) {
      try {
        const res = item.handler();
        if (res !== false) return true;
      } catch (err) {
        console.error('Error in back handler:', err);
      }
    }
    return false;
  }

  public isRootPage(): boolean {
    const path = window.location.pathname;
    const hash = window.location.hash;
    return (
      path === '/' ||
      path === '/student-dashboard' ||
      path === '/teacher-dashboard' ||
      path === '/admin-dashboard' ||
      path === '/dashboard' ||
      hash === '#/' ||
      hash === '#/student-dashboard' ||
      hash === '#/teacher-dashboard' ||
      hash === '#/admin-dashboard'
    );
  }

  private handleAppExit() {
    const now = Date.now();
    if (now - this.lastBackPressTime < 2000) {
      try { App.exitApp(); } catch { /* ignore */ }
    } else {
      this.lastBackPressTime = now;
      toast.info('Press back again to exit DLMS', { duration: 2000 });
    }
  }
}

export const backNavigation = new BackNavigationManager();
