import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { processQueue } from '@/lib/offline';

// Attempt to flush any queued offline events on startup
void processQueue();

// Register a lightweight service worker to support background sync triggers (postMessage -> client triggers processQueue)
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

createRoot(document.getElementById("root")!).render(<App />);
