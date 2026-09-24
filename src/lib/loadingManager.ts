import { useEffect, useState } from "react";

export interface LoadingState {
  isLoading: boolean;
  message: string;
  subMessage?: string;
}

type LoadingListener = (state: LoadingState) => void;

const DEFAULT_MESSAGE = "Opening the digital library stacks...";
const DEFAULT_SUB_MESSAGE = "Empowering students through the universe of books & knowledge";

class LoadingManager {
  private state: LoadingState = {
    isLoading: false,
    message: DEFAULT_MESSAGE,
    subMessage: DEFAULT_SUB_MESSAGE,
  };
  private listeners: Set<LoadingListener> = new Set();
  private autoHideTimer: NodeJS.Timeout | null = null;

  getState(): LoadingState {
    return this.state;
  }

  show(message?: string, subMessage?: string) {
    this.state = {
      isLoading: true,
      message: message || this.state.message || DEFAULT_MESSAGE,
      subMessage: subMessage !== undefined ? subMessage : this.state.subMessage || DEFAULT_SUB_MESSAGE,
    };
    this.resetAutoHide();
    this.notify();
  }

  /**
   * Updates only the status message while preserving the active loader,
   * guaranteeing that the book flip animation and progress bar NEVER reset.
   */
  update(message: string, subMessage?: string) {
    this.state = {
      isLoading: true,
      message,
      subMessage: subMessage !== undefined ? subMessage : this.state.subMessage || DEFAULT_SUB_MESSAGE,
    };
    this.resetAutoHide();
    this.notify();
  }

  hide() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    if (!this.state.isLoading) return;
    this.state = {
      ...this.state,
      isLoading: false,
    };
    this.notify();
  }

  subscribe(listener: LoadingListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = { ...this.state };
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error("Error in loadingManager listener:", err);
      }
    });
  }

  // Safety fallback: prevents app from being permanently blocked if an unhandled promise rejection occurs
  private resetAutoHide() {
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
    this.autoHideTimer = setTimeout(() => {
      if (this.state.isLoading) {
        console.warn("Global loading timeout reached, auto-dismissing loader");
        this.hide();
      }
    }, 12000);
  }
}

export const loadingManager = new LoadingManager();

export const useGlobalLoader = () => {
  const [state, setState] = useState<LoadingState>(() => loadingManager.getState());

  useEffect(() => {
    return loadingManager.subscribe((nextState) => {
      setState(nextState);
    });
  }, []);

  return state;
};
