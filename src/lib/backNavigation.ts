/**
 * backNavigation.ts
 *
 * Unified priority-based Android & PWA back-navigation manager.
 * 
 * Works across:
 *  1. Native Capacitor Android App (APK):
 *     Intercepts hardware back button via @capacitor/app listener.
 *     Consumes event if any registered overlay/drawer/modal/tab handler handles it.
 *     Falls back to router back, and double-press to exit on root pages.
 *
 *  2. Web / Mobile Browser / PWA (Android Chrome, edge swipe back):
 *     Coordinates with useBackHandler via popstate listener.
 *     Tracks whether back action originated from popstate to avoid duplicate history pops.
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
  private _isPopping = false;
  public readonly isNative: boolean = Capacitor.isNativePlatform();

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // ── 1. Capacitor native Android hardware back button ────────────────
    if (this.isNative) {
      try {
        App.addListener('backButton', (event) => {
          const handled = this.handleBack();
          if (!handled) {
            if (this.isRootPage()) {
              this.handleAppExit();
            } else if (event.canGoBack || window.history.length > 1) {
              window.history.back();
            } else {
              this.handleAppExit();
            }
          }
        });
      } catch (e) {
        console.warn('Capacitor backButton listener init error:', e);
      }
    }

    // ── 2. Web / PWA browser popstate listener ──────────────────────────
    window.addEventListener('popstate', () => {
      // On native Capacitor, backButton listener handles it directly
      if (this.isNative) return;

      this._isPopping = true;
      try {
        const handled = this.handleBack();
        if (!handled && this.isRootPage()) {
          this.handleWebRootBack();
        }
      } catch (err) {
        console.error('Error in popstate back handler:', err);
      } finally {
        // Keep _isPopping true briefly while React unmount & cleanup effects execute
        setTimeout(() => {
          this._isPopping = false;
        }, 120);
      }
    });
  }

  public get isPopping(): boolean {
    return this._isPopping;
  }

  public register(handler: BackHandler, priority = 10): () => void {
    const id = Math.random().toString(36).substring(2, 9);
    this.handlers.push({ id, priority, handler });
    // Sort descending by priority so highest priority runs first
    this.handlers.sort((a, b) => b.priority - a.priority);
    return () => {
      this.handlers = this.handlers.filter((h) => h.id !== id);
    };
  }

  public handleBack(): boolean {
    for (const item of this.handlers) {
      try {
        const res = item.handler();
        // If handler explicitly returned false, pass to the next handler
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
