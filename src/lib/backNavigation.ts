import { App } from '@capacitor/app';
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

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Capacitor hardware / native Android back button
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
    } catch (e) {
      // Capacitor App listener not available (browser/PWA environment)
    }

    // 2. Browser / PWA popstate (Android Chrome, Firefox, PWA gesture back)
    window.addEventListener('popstate', () => {
      const handled = this.handleBack();
      if (!handled && this.isRootPage()) {
        // Prevent accidental app close on root
        this.handleAppExit();
      }
    });
  }

  public register(handler: BackHandler, priority = 10): () => void {
    const id = Math.random().toString(36).substring(2, 9);
    this.handlers.push({ id, priority, handler });
    // Sort highest priority first
    this.handlers.sort((a, b) => b.priority - a.priority);

    return () => {
      this.handlers = this.handlers.filter((h) => h.id !== id);
    };
  }

  public handleBack(): boolean {
    for (const item of this.handlers) {
      try {
        const res = item.handler();
        // If handler returns false, it chose not to consume the event
        if (res !== false) {
          return true;
        }
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
      try {
        App.exitApp();
      } catch {
        // ignore
      }
    } else {
      this.lastBackPressTime = now;
      toast.info('Press back again to exit DLMS', { duration: 2000 });
      // Push state back so next back press triggers again instead of closing instantly
      try {
        window.history.pushState({ root_guard: true }, '');
      } catch {
        // ignore
      }
    }
  }
}

export const backNavigation = new BackNavigationManager();
