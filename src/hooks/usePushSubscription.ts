import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

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
 * 1. Requests notification permission (web or native mobile).
 * 2. Registers push subscription (VAPID web push or Capacitor FCM token).
 * 3. Saves it to push_subscriptions table in Supabase.
 */
export function usePushSubscription(userId: string | null | undefined) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!userId || subscribed.current) return;

    // --- CASE A: Native Platform (Capacitor APK/iOS) ---
    if (Capacitor.isNativePlatform()) {
      const registerNative = async () => {
        try {
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive !== 'granted') return;

          await PushNotifications.register();

          PushNotifications.addListener('registration', async (token) => {
            const { error } = await supabase.from('push_subscriptions').upsert(
              {
                user_id: userId,
                subscription_object: { type: 'capacitor', token: token.value } as any,
              },
              { onConflict: 'user_id' }
            );

            if (error) {
              console.warn('Failed to save native FCM token:', error.message);
            } else {
              subscribed.current = true;
            }
          });

          PushNotifications.addListener('registrationError', (err) => {
            console.error('Capacitor push registration error:', err);
          });
        } catch (e) {
          console.warn('Native push registration failed:', e);
        }
      };

      registerNative();
      return;
    }

    // --- CASE B: Web Browser (PWA/Website) ---
    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC_KEY) {
      // VAPID key not configured yet; skip silently.
      return;
    }

    // Only attempt if the browser supports push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const subscribe = async () => {
      try {
        // 1. Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 2. Get the active service worker registration
        const registration = await navigator.serviceWorker.ready;

        // 3. Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });

        // 4. Upsert subscription to Supabase
        const { error } = await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            subscription_object: subscription.toJSON() as any,
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          console.warn('Failed to save push subscription:', error.message);
        } else {
          subscribed.current = true;
        }
      } catch (err) {
        console.warn('Push subscription failed:', err);
      }
    };

    subscribe();
  }, [userId]);
}
