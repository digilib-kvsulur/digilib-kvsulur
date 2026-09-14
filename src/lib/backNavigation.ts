/**
 * backNavigation.ts
 *
 * Robust, priority-based back-navigation manager for Capacitor Android (APK)
 * and Web / PWA / Browser environments.
 */

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export type BackHandler = () => boolean | void;

interface RegisteredHandler {
  id: string;
  priority: number;
  handler: BackHandler;
}

class BackNavigationManager {
  private handlers: RegisteredHandler[] = [];
  private isInitialized = false;
  private lastBackPressTime = 0;
  private isSilentPop = false;
  private isHandlingPopstate = false;

  /** True when running as a native Capacitor Android or iOS application */
  public readonly isNative: boolean = Capacitor.isNativePlatform();

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // ── 1. Native Capacitor Android Hardware Back Button ────────────────
    if (this.isNative) {
      try {
        App.addListener('backButton', ({ canGoBack }) => {
          const handled = this.handleBack();
          if (!handled) {
            if (this.isRootPage()) {
              this.handleAppExit();
            } else if (canGoBack || window.history.length > 1) {
              window.history.back();
            } else {
              this.handleAppExit();
            }
          }
        });
      } catch (e) {
        console.warn('Capacitor backButton listener init error:', e);
      }
      return;
    }

    // ── 2. Web / PWA / Browser Popstate Listener ─────────────────────────
    window.addEventListener('popstate', () => {
      // If this popstate was triggered by our own silent history cleanup, ignore it
      if (this.isSilentPop) {
        this.isSilentPop = false;
        return;
      }

      this.isHandlingPopstate = true;
      try {
        const handled = this.handleBack();
        if (!handled && this.isRootPage()) {
          this.handleWebRootBack();
        }
      } catch (err) {
        console.error('Error in popstate back handler:', err);
      } finally {
        // Keep isHandlingPopstate true briefly so unmounting React components know not to double-pop
        setTimeout(() => {
          this.isHandlingPopstate = false;
        }, 120);
      }
    });
  }

  public get isPopping(): boolean {
    return this.isHandlingPopstate;
  }

  /**
   * Safely pop a dummy history state when an overlay is closed programmatically
   * (e.g. clicking the 'X' button or backdrop on screen), without triggering back handlers.
   */
  public popDummyState() {
    if (this.isNative) return;
    try {
      if (window.history.state && window.history.state.dlms_overlay) {
        this.isSilentPop = true;
        window.history.back();
      }
    } catch {
      this.isSilentPop = false;
    }
  }

  public register(handler: BackHandler, priority = 10): () => void {
    const id = Math.random().toString(36).substring(2, 9);
    this.handlers.push({ id, priority, handler });
    // Sort descending by priority so highest priority executes first
    this.handlers.sort((a, b) => b.priority - a.priority);
    return () => {
      this.handlers = this.handlers.filter((h) => h.id !== id);
    };
  }

  public handleBack(): boolean {
    for (const item of this.handlers) {
      try {
        const res = item.handler();
        // Returning false explicitly means "pass to next lower priority handler"
        // Any other return value (true, undefined) consumes the back action
        if (res !== false) {
          return true;
        }
      } catch (err) {
        console.error('Error executing back handler:', err);
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
      try {
        App.exitApp();
      } catch {
        // ignore
      }
    } else {
      this.lastBackPressTime = now;
      toast.info('Press back again to exit DLMS', { duration: 2000 });
    }
  }

  private handleWebRootBack() {
    const now = Date.now();
    if (now - this.lastBackPressTime < 2000) {
      // User pressed back twice at root on web
    } else {
      this.lastBackPressTime = now;
      toast.info('Press back again to exit DLMS', { duration: 2000 });
      try {
        window.history.pushState({ root_guard: true }, '');
      } catch {
        // ignore
      }
    }
  }
}

export const backNavigation = new BackNavigationManager();
