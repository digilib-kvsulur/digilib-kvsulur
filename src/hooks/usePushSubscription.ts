import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Converts a base64url string to a Uint8Array (needed to pass VAPID public key to PushManager).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook that:
 * 1. Requests notification permission from the browser (once per user session).
 * 2. Subscribes the browser to Web Push using the VAPID public key.
 * 3. Saves the PushSubscription object to Supabase's `push_subscriptions` table.
 *
 * Requires VITE_VAPID_PUBLIC_KEY to be set in your .env / deployment environment.
 */
export function usePushSubscription(userId: string | null | undefined) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!userId || subscribed.current) return;

    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC_KEY) {
      // VAPID key not configured yet; skip silently.
      return;
    }

    // Only attempt if the browser supports push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const subscribe = async () => {
      try {
        // 1. Request permission (browser may show its own prompt the first time)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 2. Get the active service worker registration
        const registration = await navigator.serviceWorker.ready;

        // 3. Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // 4. Upsert subscription to Supabase
        const { error } = await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            subscription_object: subscription.toJSON(),
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          console.warn('Failed to save push subscription:', error.message);
        } else {
          subscribed.current = true;
        }
      } catch (err) {
        // Silently fail — push is a non-critical enhancement.
        console.warn('Push subscription failed:', err);
      }
    };

    subscribe();
  }, [userId]);
}
