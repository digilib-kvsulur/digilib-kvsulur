import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { processQueue } from '@/lib/offline';

// Attempt to flush any queued offline events on startup
void processQueue();

// Register a lightweight service worker to support background sync triggers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (ev) => {
      if (ev.data === 'bg-sync') {
        void processQueue();
      }
    });
  }).catch(() => {
    // ignore registration failures
  });
}

// ─── Domain Migration Landing: show welcome + install nudge ───────────────────
if (new URLSearchParams(window.location.search).get('migrated') === 'true') {
  // Clean the URL without reload
  window.history.replaceState({}, '', window.location.pathname);
  // Fire a toast after React mounts (small delay so Sonner Toaster is ready)
  setTimeout(async () => {
    try {
      const { toast } = await import('sonner');
      toast.success('🎉 Welcome to the official KV Sulur DigiLib domain!', {
        description: 'You\'re now on dlms.kvsulur.in — tap "Install" to add it to your home screen.',
        duration: 8000,
      });
    } catch { /* ignore */ }
  }, 800);
}

createRoot(document.getElementById("root")!).render(<App />);

