import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { db } from './api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
export const pushDeliveryConfigured = Boolean(db && firebaseConfigured && vapidKey);
export const nativePushAvailable = () => Capacitor.isNativePlatform();

type PushData = Record<string, string>;
type PushCallbacks = {
  onOpen?: (data: PushData) => void;
  onForeground?: (notification: { title: string; body: string }) => void;
};

let activeUserId: string | null = null;
let currentToken: string | null = null;
let stopWebMessages: (() => void) | null = null;
let stopWebOpen: (() => void) | null = null;
let nativeHandles: PluginListenerHandle[] = [];

function installationId() {
  const key = 'yoresuelvo:installation-id:v1';
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

async function registerToken(userId: string, token: string, platform: 'web' | 'android') {
  if (!db) throw new Error('El servicio de acceso no está configurado.');
  const { error } = await db.rpc('register_push_device', {
    p_token: token,
    p_platform: platform,
    p_installation_id: installationId(),
  });
  if (error) throw error;
  const { error: preferenceError } = await db.from('notification_preferences').upsert({
    user_id: userId, push_updates: true, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (preferenceError) throw preferenceError;
  currentToken = token;
  activeUserId = userId;
}

async function saveCurrentDevicePreference(userId: string, enabled: boolean) {
  if (!db) throw new Error('El servicio de acceso no está configurado.');
  const { error } = await db.from('notification_preferences').upsert({
    user_id: userId, push_updates: enabled, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function activePushForThisDevice(userId: string) {
  if (!db) return false;
  const { data, error } = await db.from('push_devices').select('id')
    .eq('installation_id', installationId()).eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function enablePushForUser(userId: string, callbacks: PushCallbacks = {}) {
  if (!db || !pushDeliveryConfigured) return { enabled: false, reason: 'unavailable' as const };
  if (Capacitor.isNativePlatform()) {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return { enabled: false, reason: permission.receive };
    await Promise.all(nativeHandles.map(handle => handle.remove()));
    nativeHandles = [];
    activeUserId = userId;
    const result = await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (enabled: boolean) => { if (!settled) { settled = true; resolve(enabled); } };
      void PushNotifications.addListener('registration', async (token: Token) => {
        try { await registerToken(userId, token.value, 'android'); finish(true); }
        catch { finish(false); }
      }).then(handle => nativeHandles.push(handle));
      void PushNotifications.addListener('registrationError', () => finish(false)).then(handle => nativeHandles.push(handle));
      void PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => callbacks.onOpen?.(notification.data as PushData ?? {}))
        .then(handle => nativeHandles.push(handle));
      void PushNotifications.addListener('pushNotificationReceived', notification => callbacks.onForeground?.({
        title: notification.title ?? 'YoResuelvo!', body: notification.body ?? '',
      })).then(handle => nativeHandles.push(handle));
      void PushNotifications.register().catch(() => finish(false));
      window.setTimeout(() => finish(false), 15000);
    });
    return result ? { enabled: true as const } : { enabled: false as const, reason: 'registration_failed' as const };
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) return { enabled: false, reason: 'unavailable' as const };
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { enabled: false, reason: permission };
  const [{ getApps, initializeApp }, { getMessaging, getToken, onMessage }] = await Promise.all([
    import('@firebase/app'), import('@firebase/messaging'),
  ]);
  const registration = await navigator.serviceWorker.getRegistration('/') ?? await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const app = getApps().find(item => item.name === 'yoresuelvo-push') ?? initializeApp(firebaseConfig, 'yoresuelvo-push');
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return { enabled: false, reason: 'registration_failed' as const };
  await registerToken(userId, token, 'web');
  stopWebMessages?.();
  stopWebMessages = onMessage(getMessaging(app), payload => callbacks.onForeground?.({
    title: payload.notification?.title ?? 'YoResuelvo!', body: payload.notification?.body ?? '',
  }));
  stopWebOpen?.();
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'yoresuelvo-push-open') callbacks.onOpen?.((event.data.data ?? {}) as PushData);
  };
  navigator.serviceWorker.addEventListener('message', handleMessage);
  stopWebOpen = () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  return { enabled: true as const };
}

export async function disablePushForThisDevice(userId: string) {
  if (!db) return;
  const { error } = await db.rpc('deactivate_push_device', { p_installation_id: installationId() });
  if (error) throw error;
  if (activeUserId === userId) {
    if (Capacitor.isNativePlatform()) {
      await Promise.all(nativeHandles.map(handle => handle.remove()));
      nativeHandles = [];
    }
    stopWebMessages?.(); stopWebMessages = null;
    stopWebOpen?.(); stopWebOpen = null;
    activeUserId = null; currentToken = null;
  }
}

export async function disableAllPushForUser(userId: string) {
  if (!db) return;
  await saveCurrentDevicePreference(userId, false);
  // The worker checks this account-wide preference immediately before sending.
}

export async function forgetPushOnSignOut(userId: string) {
  if (!db) return;
  try { await disablePushForThisDevice(userId); } catch { /* Preserve sign-out even if offline. */ }
}
