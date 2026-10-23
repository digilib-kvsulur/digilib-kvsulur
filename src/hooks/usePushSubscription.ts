import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Json } from "@/integrations/supabase/types";

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

function sameApplicationServerKey(subscription: PushSubscription, expected: Uint8Array): boolean {
  const actual = subscription.options.applicationServerKey;
  if (!actual) return false;
  const bytes = new Uint8Array(actual);
  return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index]);
}

/**
 * Subscribes the current web browser client to push notifications and saves the token in Supabase.
 * Call this function from an explicit user gesture (e.g. clicking "Enable Notifications").
 */
export async function subscribeWebPush(userId: string): Promise<boolean> {
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!VAPID_PUBLIC_KEY) {
    console.warn("VAPID_PUBLIC_KEY is not configured.");
    return false;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push messaging is not supported in this browser.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const appServerKey = expectedKey as BufferSource;

    let subscription: PushSubscription | null = null;
    subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameApplicationServerKey(subscription, expectedKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });

    if (!subscription) return false;

    const subscriptionObject = subscription.toJSON();
    const subscriptionKey = subscription.endpoint;
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        subscription_key: subscriptionKey,
        subscription_object: subscriptionObject as unknown as Json,
      },
      { onConflict: 'subscription_key' }
    );

    if (error) {
      console.warn('Failed to save push subscription to Supabase:', error.message);
      return false;
    }

    // Immediately trigger a confirmation system notification to verify device pipeline
    try {
      if (registration && "showNotification" in registration) {
        await registration.showNotification("🔔 KV Sulur DLMS Alerts Active", {
          body: "Push notifications are now enabled on this device.",
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          tag: "dlms-welcome",
        });
      }
    } catch {
      /* ignore confirmation notification error */
    }

    return true;
  } catch (err) {
    console.warn('subscribeWebPush failed:', err);
    return false;
  }
}

/**
 * Hook that:
 * 1. Automatically handles Native Capacitor notifications on mobile APK.
 * 2. If Notification permission is ALREADY granted in web browser/PWA, syncs the subscription silently.
 * (Will NOT call requestPermission without user action on web to comply with Android Chrome policies).
 */
export function usePushSubscription(userId: string | null | undefined) {
  const subscribed = useRef(false);
  const registering = useRef(false);

  useEffect(() => {
    if (!userId || subscribed.current || registering.current) return;
    registering.current = true;

    // --- CASE A: Native Platform (Capacitor APK/iOS) ---
    if (Capacitor.isNativePlatform()) {
      const registerNative = async () => {
        try {
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive !== 'granted') return;

          try {
            await PushNotifications.createChannel({
              id: 'default',
              name: 'KV Sulur DLMS Notifications',
              description: 'General notifications and updates from PM SHRI KV AFS Sulur DLMS',
              importance: 5,
              visibility: 1,
              vibration: true,
            });
          } catch (channelErr) {
            console.warn('Could not create notification channel:', channelErr);
          }

          PushNotifications.addListener('registration', async (token) => {
            const { error } = await supabase.from('push_subscriptions').upsert(
              {
                user_id: userId,
                subscription_key: `capacitor:${token.value}`,
                subscription_object: { type: 'capacitor', token: token.value } as unknown as Json,
              },
              { onConflict: 'subscription_key' }
            );

            if (error) {
              console.warn('Failed to save native FCM token:', error.message);
            } else {
              subscribed.current = true;
            }
          });

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push notification received in foreground:', notification);
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const data = action.notification?.data;
            if (data?.url) {
              window.location.href = data.url;
            }
          });

          PushNotifications.addListener('registrationError', (err) => {
            console.error('Capacitor push registration error:', err);
          });

          // Attach listeners before register: some Android builds emit the token
          // immediately and the previous ordering could lose the only callback.
          await PushNotifications.register();
        } catch (e) {
          console.warn('Native push registration failed:', e);
        }
      };

      registerNative().finally(() => { registering.current = false; });
      return;
    }

    // --- CASE B: Web Browser (PWA/Website) ---
    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { registering.current = false; return; }

    // Only auto-subscribe if the user has ALREADY granted permission previously
    if (Notification.permission === 'granted') {
      const syncGrantedSubscription = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js');
          const registration = await navigator.serviceWorker.ready;
          const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          const appServerKey = expectedKey as BufferSource;

          let subscription = await registration.pushManager.getSubscription();
          if (subscription && !sameApplicationServerKey(subscription, expectedKey)) {
            await subscription.unsubscribe();
            subscription = null;
          }
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: appServerKey,
            });
          }

          if (subscription) {
            const { error } = await supabase.from('push_subscriptions').upsert(
              {
                user_id: userId,
                subscription_key: subscription.endpoint,
                subscription_object: subscription.toJSON() as unknown as Json,
              },
              { onConflict: 'subscription_key' }
            );
            if (error) throw error;
            subscribed.current = true;
          }
        } catch (err) {
          console.warn('Push subscription background sync failed:', err);
        } finally {
          registering.current = false;
        }
      };

      syncGrantedSubscription();
    } else registering.current = false;
  }, [userId]);
}
